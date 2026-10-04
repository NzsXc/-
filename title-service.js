import {ref,get,set,update} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
export function createTitleService(db,auth){
 const uid=()=>auth.currentUser&&!auth.currentUser.isAnonymous?auth.currentUser.uid:null;
 const read=async p=>(await get(ref(db,p))).val();
 let jobs=Promise.resolve();const cursors=new Map();
 const cache=new Map();
 async function loadoutFor(who){if(!who)return ['','',''];const slots=await read('titleLoadouts/'+who)||{};const ids=[0,1,2].map(i=>window.TitleCatalog.byId[slots[i]]?slots[i]:'');cache.set(who,ids);return ids;}
 async function claimRatings(){const who=uid();if(!who)return;const a=await read('freeAccounts/'+who);if(!a)return;let peak=Number(a.rating||0);if(a.lastSettled){const players=await read('freeGames/'+a.lastSettled+'/players');const side=players?.[1]===who?1:players?.[2]===who?2:0;if(side){const ledger=await read('freeGames/'+a.lastSettled+'/settled');peak=Math.max(peak,Number(ledger?.['before'+side]||0),Number(ledger?.['after'+side]||0));}}
  for(const rate of [1050,1100,1150])if(peak>=rate&&!await read('ratingMilestones/'+who+'/'+rate)){try{await set(ref(db,'ratingMilestones/'+who+'/'+rate),true);}catch(e){if(!await read('ratingMilestones/'+who+'/'+rate))throw e;}}
 }
 async function claimTurn(who,game,turn,side){
  if(uid()!==who)return;
  const action=await read('freeGames/'+game+'/moves/'+turn+'/'+side);if(!Number.isInteger(action)||action<3||action>14)return;
  const skill=action-2,proof='titleReceipts/'+who+'/'+game+'/'+turn,total='titleProgress/'+who+'/uses/'+skill;
  for(let attempt=0;attempt<4;attempt++){
   if(uid()!==who)return;
   const [done,previous]=await Promise.all([read(proof),read(total)]);if(done!==null||Number(previous?.count||0)>=30)return;
   try{await update(ref(db),{[proof]:skill,[total]:{count:Number(previous?.count||0)+1,game,turn}});return;}
   catch(e){if(await read(proof)!==null)return;if(attempt===3)throw e;}
  }
 }
 function recordMatch({id,side,resolvedThrough}){
  const who=uid();if(!who||!id||![1,2].includes(side)||resolvedThrough<1)return Promise.resolve();
  const key=who+':'+id;
  jobs=jobs.catch(()=>{}).then(async()=>{for(let turn=(cursors.get(key)||0)+1;turn<=Math.min(300,resolvedThrough);turn++){if(uid()!==who)return;await claimTurn(who,id,turn,side);cursors.set(key,turn);}});return jobs;
 }
 async function syncLastMatch(){const who=uid();if(!who)return;const a=await read('freeAccounts/'+who);for(const id of new Set([a?.lastSettled,a?.active].filter(Boolean))){const [players,state]=await Promise.all([read('freeGames/'+id+'/players'),read('freeGames/'+id+'/state')]);const side=players?.[1]===who?1:players?.[2]===who?2:0;if(side&&state)await recordMatch({id,side,resolvedThrough:state.turn-1});}}
 async function readOwn(){const who=uid();if(!who)throw Error('ログインしてください');await syncLastMatch();await claimRatings();const [uses,milestones,grants,loadout]=await Promise.all([read('titleProgress/'+who+'/uses'),read('ratingMilestones/'+who),read('tournamentGrants/'+who),loadoutFor(who)]);if(uid()!==who)throw Error('ログイン状態が変わりました');return {uses:uses||{},milestones:milestones||{},grants:grants||{},loadout};}
 async function saveLoadout(ids){const who=uid();if(!who)throw Error('ログインしてください');if(ids.length!==3)throw Error('称号は3枠です');await set(ref(db,'titleLoadouts/'+who),{0:ids[0]||'',1:ids[1]||'',2:ids[2]||''});cache.set(who,ids.slice());}
 return {uid,readOwn,saveLoadout,loadoutFor,claimRatings,recordMatch,peek:who=>cache.get(who)||['','','']};
}
