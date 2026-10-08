import {ref,get,set,update,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
export function createTitleService(db,auth,history){
 const uid=()=>auth.currentUser&&!auth.currentUser.isAnonymous?auth.currentUser.uid:null;
 const read=async p=>{try{return (await get(ref(db,p))).val();}catch(error){throw new Error(p+'：'+error.message,{cause:error});}};
 let jobs=Promise.resolve();const cursors=new Map();
 const archivedProofs=new Map();
 async function archivedProof(id){
  if(archivedProofs.has(id))return archivedProofs.get(id);
  const h=await history?.find(id);if(h){archivedProofs.set(id,h);if(archivedProofs.size>20)archivedProofs.delete(archivedProofs.keys().next().value);}return h;
 }
 const cache=new Map(),pending=new Map();
 const trackingJobs=new Map();
 function validTracking(value){
  return value?.version===1&&Number.isFinite(value.startedAt)&&typeof value.activeGame==='string'&&Number.isInteger(value.resolvedThrough)&&value.resolvedThrough>=0&&value.resolvedThrough<=300;
 }
 async function enableUnlimited(){
  const who=uid();if(!who)return null;
  if(trackingJobs.has(who))return trackingJobs.get(who);
  const job=(async()=>{
   const path='titleProgress/'+who+'/tracking';let saved=await read(path);
   if(saved){if(!validTracking(saved))throw Error('技使用回数の開始記録が不正です');return saved;}
   for(let attempt=0;attempt<4;attempt++){
    const account=await read('freeAccounts/'+who);if(!account)throw Error('プレイヤーデータがありません');
    const activeGame=account.active||'',state=activeGame?await read('freeGames/'+activeGame+'/state'):null;
    const marker={version:1,startedAt:serverTimestamp(),activeGame,resolvedThrough:state?state.turn-1:0};
    if(uid()!==who)return null;
    try{await set(ref(db,path),marker);}
    catch(error){
     saved=await read(path);if(saved&&validTracking(saved))return saved;
     if(attempt===3)throw new Error('技使用回数の上限解除ルールをFirebaseに反映してください',{cause:error});
     continue;
    }
    saved=await read(path);if(!validTracking(saved))throw Error('技使用回数の開始記録を取得できません');return saved;
   }
  })();
  trackingJobs.set(who,job);
  const clear=()=>{if(trackingJobs.get(who)===job)trackingJobs.delete(who);};
  job.then(marker=>{if(!marker)clear();},clear);return job;
 }
 async function loadoutFor(who){
  if(!who)return ['','',''];
  const key=(auth.currentUser?.uid||'')+':'+who,cached=cache.get(key);
  if(cached&&Date.now()-cached.at<15000)return cached.ids.slice();
  if(pending.has(key))return pending.get(key);
  const job=read('titleLoadouts/'+who).then(slots=>{
   const ids=[0,1,2].map(i=>window.TitleCatalog.byId[slots?.[i]]?slots[i]:'');
   cache.set(key,{at:Date.now(),ids});return ids.slice();
  }).finally(()=>pending.delete(key));
  pending.set(key,job);return job;
 }
 async function claimRatings(){const who=uid();if(!who)return;const a=await read('freeAccounts/'+who);if(!a)return;let peak=Number(a.rating||0);if(a.lastSettled){
  let players=await read('freeGames/'+a.lastSettled+'/players'),ledger=await read('freeGames/'+a.lastSettled+'/settled');
  if(!players||!ledger){const h=await archivedProof(a.lastSettled);if(h){players={1:h.players[1].uid,2:h.players[2].uid};ledger=h.settled;}}
  const side=players?.[1]===who?1:players?.[2]===who?2:0;if(side)peak=Math.max(peak,Number(ledger?.['before'+side]||0),Number(ledger?.['after'+side]||0));}
  for(const rate of [1050,1100,1150])if(peak>=rate&&!await read('ratingMilestones/'+who+'/'+rate)){try{await set(ref(db,'ratingMilestones/'+who+'/'+rate),true);}catch(e){if(!await read('ratingMilestones/'+who+'/'+rate))throw e;}}
 }
 async function claimTurn(who,game,turn,side){
  if(uid()!==who)return;
  let action;
  const cached=archivedProofs.get(game);
  if(cached)action=cached.moves?.[turn]?.[side];
  else{
   try{action=await read('freeGames/'+game+'/moves/'+turn+'/'+side);}
   catch(error){const h=await archivedProof(game);if(!h)throw error;action=h.moves?.[turn]?.[side];}
   if(action==null){const h=await archivedProof(game);action=h?.moves?.[turn]?.[side];}
  }
  if(!Number.isInteger(action)||action<3||action>14)return;
  const skill=action-2,proof='titleReceipts/'+who+'/'+game+'/'+turn,total='titleProgress/'+who+'/uses/'+skill;
  for(let attempt=0;attempt<4;attempt++){
   if(uid()!==who)return;
   const [done,previous]=await Promise.all([read(proof),read(total)]);if(done!==null)return;
   const count=previous?.count??0;if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(count+1))throw Error('技使用回数の記録が不正です');
   if(uid()!==who)return;
   try{await update(ref(db),{[proof]:skill,[total]:{count:count+1,game,turn}});return;}
   catch(e){if(await read(proof)!==null)return;if(attempt===3)throw e;}
  }
 }
 function recordMatch({id,side,resolvedThrough}){
  const who=uid();if(!who||!id||![1,2].includes(side)||resolvedThrough<1)return Promise.resolve();
  const key=who+':'+id;
  jobs=jobs.catch(()=>{}).then(async()=>{
   if(uid()!==who)return;const tracking=await enableUnlimited();if(!tracking||uid()!==who)return;
   let first=1;
   if(id===tracking.activeGame)first=tracking.resolvedThrough+1;
   else{
    const cached=archivedProofs.get(id),createdAt=cached?.createdAt??await read('freeGames/'+id+'/createdAt')??(await archivedProof(id))?.createdAt;
    if(!Number.isFinite(createdAt))throw Error('対戦の開始日時を取得できません');
    if(createdAt<tracking.startedAt)return;
   }
   for(let turn=Math.max(first,(cursors.get(key)||0)+1);turn<=Math.min(300,resolvedThrough);turn++){if(uid()!==who)return;await claimTurn(who,id,turn,side);if(uid()!==who)return;cursors.set(key,turn);}
  });return jobs;
 }
 async function syncLastMatch(){const who=uid();if(!who)return;const a=await read('freeAccounts/'+who);for(const id of new Set([a?.lastSettled,a?.active].filter(Boolean))){
  const [players,state]=await Promise.all([read('freeGames/'+id+'/players'),read('freeGames/'+id+'/state')]);
  if(players&&state){const side=players[1]===who?1:players[2]===who?2:0;if(side)await recordMatch({id,side,resolvedThrough:state.turn-1});}
  else{const h=await archivedProof(id),side=h?.players?.[1]?.uid===who?1:h?.players?.[2]?.uid===who?2:0;if(side)await recordMatch({id,side,resolvedThrough:h.turnCount});}
 }}
 async function readOwn(){
  const who=uid();if(!who)throw Error('ログインしてください');
  const warnings=[];
  // Collection reads must remain usable when a newly added award is rejected
  // by an older rules deployment. Report the failed synchronization separately.
  for(const task of [enableUnlimited,syncLastMatch,claimRatings])try{await task();}catch(error){warnings.push(error.message);console.warn(error);}
  const [uses,milestones,grants,loadout]=await Promise.all([read('titleProgress/'+who+'/uses'),read('ratingMilestones/'+who),read('tournamentGrants/'+who),loadoutFor(who)]);
  if(uid()!==who)throw Error('ログイン状態が変わりました');
  return {uses:uses||{},milestones:milestones||{},grants:grants||{},loadout,warnings};
 }
 async function saveLoadout(ids){const who=uid();if(!who)throw Error('ログインしてください');if(ids.length!==3)throw Error('称号は3枠です');await set(ref(db,'titleLoadouts/'+who),{0:ids[0]||'',1:ids[1]||'',2:ids[2]||''});cache.set(who+':'+who,{at:Date.now(),ids:ids.slice()});}
 return {uid,readOwn,saveLoadout,loadoutFor,claimRatings,recordMatch,enableUnlimited,peek:who=>cache.get((auth.currentUser?.uid||'')+':'+who)?.ids.slice()||['','','']};
}
