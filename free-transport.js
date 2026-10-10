import {ref,get,set,update,push,serverTimestamp,onValue,runTransaction} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import {calculate,stateFields} from './free-calculator.js?v=all-fixes-1';
import {historyMatch} from './battle-history-core.js?v=history-1';
export function createFreeTransport(db,auth,history){
 let offset=0;onValue(ref(db,'.info/serverTimeOffset'),s=>{offset=s.val()||0;});
 const now=()=>Date.now()+offset;
 const withTimeout=(promise,ms,label)=>{
  let timer;
  return Promise.race([
   Promise.resolve(promise),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+'がタイムアウトしました')),ms);})
  ]).finally(()=>clearTimeout(timer));
 };
 const read=async p=>(await withTimeout(get(ref(db,p)),8000,'通信')).val();
 const writeSet=(p,value)=>withTimeout(set(ref(db,p),value),8000,'保存');
 const writeUpdate=(target,value)=>withTimeout(update(ref(db,target),value),8000,'保存');
 const loadTitles=uid=>withTimeout(
  Promise.resolve().then(()=>window.titleService?.loadoutFor?.(uid)),
  1500,
  '称号取得'
 ).then(value=>Array.isArray(value)?value:[]).catch(error=>{
  console.warn('称号情報を取得できなかったため、対戦を続行します',error);
  return [];
 });
 let profileFlight=null,profileFlightUid='';
 async function loadProfile(user){
  const u=user.uid;
  let a=await read('freeAccounts/'+u);
  if(!a){
   const token = await user.getIdTokenResult(true);
const guest = token.signInProvider === 'anonymous';

const initialAccount = {
  name: String(
    guest
      ? 'ゲスト'
      : globalThis.window?.loggedInPlayerData?.name || 'プレイヤー'
  ).slice(0, 24),
  guest,
  rating: 1000,
  games: 0,
  active: '',
  lastSettled: ''
};
   try{await writeSet('freeAccounts/'+u,initialAccount);a=initialAccount;}
   catch(error){a=await read('freeAccounts/'+u);if(!a)throw error;}
  }
  if(Number(a.rating)<1000){
   try{await writeSet('freeAccounts/'+u+'/rating',1000);}catch(error){const fresh=await read('freeAccounts/'+u);if(Number(fresh?.rating)<1000)throw error;}
   a={...a,rating:1000};
  }
  return a;
 }
 async function profile(){
  const user=auth.currentUser,u=user?.uid;
  if(!u)throw Error('ログインしてください');
  if(profileFlight&&profileFlightUid===u)return profileFlight;
  profileFlightUid=u;
  const job=loadProfile(user);
  profileFlight=job;
  try{return await job;}
  finally{if(profileFlight===job){profileFlight=null;profileFlightUid='';}}
 }
 // 3 s countdown + 0.5 s call + 1.3 s reveal + 1.2 s effect + 0.1 s margin.
 // The next input window follows the effect, rather than a separate 7.5 s wait.
 const transitionMs=6100;
 const turnOpensAt=s=>s.startedAt+(s.turn>1?transitionMs:5600);
 const initial=()=>Object.fromEntries(stateFields.map(k=>[k,k==='turn'?1:k==='startedAt'?serverTimestamp():k.startsWith('hp')?10:k.startsWith('gauge')?8:k.startsWith('seal')||k.startsWith('momentum')?false:k.startsWith('last')?'':0]));
 const matchMetadata=new Map(),titleRecorded=new Map(),ratingClaimed=new Set();
 const historyWarnings=new Set();
 async function archivedStatus(id,u){
  const h=await history?.find(id);
  return h?{match:historyMatch(h,u,now())}:null;
 }
 async function metadata(id,g){
  let data=matchMetadata.get(id);
  if(data)return data;
  const entries=await Promise.all([1,2].map(async p=>{
   const [account,titles,loadout,snapshot]=await Promise.all([read('freeAccounts/'+g.players[p]),loadTitles(g.players[p]),read('freeGames/'+id+'/loadouts/'+p),read('freeGames/'+id+'/profiles/'+p).catch(()=>null)]);
   return [p,{profile:{name:snapshot?.name||account?.name||'プレイヤー',rating:account?.guest?null:snapshot?.rating??(Number.isFinite(account?.rating)?account.rating:null),bot:false,titles:snapshot?Object.values(snapshot.titles):titles},loadout}];
  }));
  data={players:{},loadouts:{}};
  for(const [p,value]of entries){data.players[p]=value.profile;data.loadouts[p]=value.loadout;}
  matchMetadata.set(id,data);return data;
 }
 async function status(id){
  const u=auth.currentUser.uid,path='freeGames/'+id;let g;
  for(let attempt=0;attempt<4;attempt++){
   const keys=['players','createdAt','state','ready','resigned','settled','transition','kind','room'];g=Object.fromEntries(await Promise.all(keys.map(async k=>[k,await read(path+'/'+k)])));g.ready||={};
   const me=g.players?.[1]===u?1:g.players?.[2]===u?2:0;
   if(!me){const saved=await archivedStatus(id,u);if(saved)return saved.match;throw Error('参加者ではありません');}g.me=me;
   try{await history?.markClient(id,g.players);}catch(error){console.warn('履歴対応状態の保存を再試行します',error);}
   if(g.settled&&history){
    try{
     const h=await history.archiveFinished(id),m=historyMatch(h,u,now());
     window.titleService?.recordMatch({id,side:me,resolvedThrough:h.turnCount}).catch(console.warn);
     window.titleService?.claimRatings().catch(console.warn);
     matchMetadata.delete(id);return m;
    }catch(error){if(!historyWarnings.has(id)){historyWarnings.add(id);console.warn('対戦履歴を保存できないため、ルームを残します',error);}}
   }
   const s=g.state;let finalMoves=null;const expires=s?turnOpensAt(s)+40000:0;
   if(s&&now()>=expires)finalMoves=await read(path+'/moves/'+s.turn)||{};
   const abandoned=!!s&&now()>=expires&&(finalMoves?.[1]==null||finalMoves?.[2]==null);g.abandoned=abandoned;
   const terminal=abandoned||!!g.resigned||s&&(s.hp1<=0||s.hp2<=0||s.turn>300)||!s&&now()>=g.createdAt+90000;
   if(terminal&&!g.settled){
    const winner=g.resigned?.[1]?2:g.resigned?.[2]?1:s&&s.hp1>0&&s.hp2>0&&s.turn<=300&&abandoned?(finalMoves[1]!=null?1:finalMoves[2]!=null?2:0):s?(s.hp1<=0?(s.hp2<=0?0:2):s.hp2<=0?1:0):g.ready[1]?(g.ready[2]?0:1):g.ready[2]?2:0;
    const accounts={1:await read('freeAccounts/'+g.players[1]),2:await read('freeAccounts/'+g.players[2])};
    const amount=g.kind==='friend'||winner===0?0:Math.max(10,30+Math.trunc((accounts[3-winner].rating-accounts[winner].rating)/20));
    const patch={},ledger={at:serverTimestamp(),winner};for(const p of [1,2]){const a=accounts[p],storedRating=Number(a.rating),before=Number.isFinite(storedRating)?storedRating:1000,wanted=winner===0?before:winner===p?before+amount:before-amount,after=Math.max(1000,wanted),d=after-before,won=winner===p;Object.assign(ledger,{['before'+p]:before,['after'+p]:after,['delta'+p]:d});patch['freeAccounts/'+g.players[p]]={...a,rating:after,games:Number(a.games||0)+1,onlineWins:Math.max(0,Number(a.onlineWins)||0)+(won&&g.kind!=='friend'?1:0),friendWins:Math.max(0,Number(a.friendWins)||0)+(won&&g.kind==='friend'?1:0),active:'',lastSettled:id};}patch[path+'/settled']=ledger;
    try{await update(ref(db),patch);}catch(e){if(!await read(path+'/settled')){const saved=await archivedStatus(id,u);if(saved)return saved.match;throw e;}}continue;
   }
   if(!s&&!terminal&&g.ready[1]&&g.ready[2]){
    try{
     await withTimeout(runTransaction(ref(db,path+'/state'),current=>current===null?initial():undefined,{applyLocally:false}),8000,'対戦開始');
    }catch(e){if(!await read(path+'/state'))throw e;}
    continue;
   }
   if(s&&!terminal&&now()>=turnOpensAt(s)){
    g.own=await read(path+'/moves/'+s.turn+'/'+me);let moves=null;
    try{moves=await read(path+'/moves/'+s.turn);}catch(e){if(!String(e.code||e.message).toLowerCase().includes('permission'))throw e;}
    if(moves?.[1]!=null&&moves?.[2]!=null){const c=calculate(s,moves||{},id),state=Object.fromEntries(stateFields.map(k=>[k,k==='startedAt'?serverTimestamp():c[k]]));try{await update(ref(db,path),{transition:c,state});}catch(e){const fresh=await read(path+'/state');if(!fresh){const saved=await archivedStatus(id,u);if(saved)return saved.match;throw e;}if(fresh.turn===s.turn&&!await read(path+'/resigned'))throw e;}continue;}
   }
   break;
  }
  const s=g.state,me=g.me;
  const {players,loadouts}=g.ready[1]&&g.ready[2]?await metadata(id,g):{players:{},loadouts:{}};
  if(s&&(!loadouts[1]||!loadouts[2])){const saved=await archivedStatus(id,u);if(saved)return saved.match;throw Error('対戦情報を再取得してください');}
  const state=s?{turn:s.turn,...Object.fromEntries(['hp','gauge','seal','enhance','momentum','ruin','last'].map(k=>[k,[null,s[k+'1'],s[k+'2']]]))}:null;
  const closed=!!g.settled,opensAt=s?turnOpensAt(s):0;
  const titleKey=u+':'+id;
  if(s&&(titleRecorded.get(titleKey)||0)<s.turn-1){
   titleRecorded.set(titleKey,s.turn-1);
   window.titleService?.recordMatch({id,side:me,resolvedThrough:s.turn-1}).catch(error=>{titleRecorded.delete(titleKey);console.warn(error);});
  }
  if(closed&&!ratingClaimed.has(titleKey)){
   ratingClaimed.add(titleKey);
   window.titleService?.claimRatings().catch(error=>{ratingClaimed.delete(titleKey);console.warn(error);});
  }
  // A match that expires before either loadout still needs player names for results.
  if(closed&&!s)for(const p of [1,2]){const account=await read('freeAccounts/'+g.players[p]);players[p]={name:account?.name||'プレイヤー'};}
  return {id,kind:g.kind||'random',roomId:g.room||null,you:me,players,ready:g.ready,loadouts,state,closed,phase:closed?'finished':s?'turn':'select',revision:now(),serverNow:now(),opensAt,deadline:s?opensAt+10000:g.createdAt+60000,graceDeadline:s?opensAt+40000:g.createdAt+90000,ownAction:g.own??null,reveal:g.transition?{turn:g.transition.turn-1,startedAt:s?.startedAt,actions:{1:g.transition.action1,2:g.transition.action2},damage:{1:g.transition.damage1,2:g.transition.damage2}}:null,result:closed?{winner:g.settled.winner,rated:g.kind!=='friend',reason:g.resigned?'resigned':g.abandoned&&s?.hp1>0&&s?.hp2>0?'reconnect-timeout':!s?'selection-timeout':s.misses1>=2||s.misses2>=2?'idle-forfeit':s.turn>300?'turn-limit':'battle'}:null,rating:closed?{before:g.settled['before'+me],after:g.settled['after'+me],delta:g.settled['delta'+me]}:null};
 }
 async function resumeActive(account){
  const u=auth.currentUser.uid,id=String(account?.active||'');
  if(!id)return {};
  const path='freeGames/'+id;
  const [players,settled]=await Promise.all([read(path+'/players'),read(path+'/settled')]);
  const belongs=players&&(players[1]===u||players[2]===u);
  // Repair legacy/orphaned active pointers. Security rules only allow the owner
  // to clear a pointer when the game is missing, settled, or belongs elsewhere.
  if(!players||settled||!belongs){
   await writeSet('freeAccounts/'+u+'/active','');
   return settled&&belongs?{match:await status(id),recovered:true}:{recovered:true};
  }
  const match=await status(id);
  const fresh=await read('freeAccounts/'+u);
  // status() atomically settles expired games and clears both players. If a
  // concurrent client already settled it, clear any legacy pointer left behind.
  if(match.closed&&fresh?.active===id)await writeSet('freeAccounts/'+u+'/active','');
  return {match};
 }
 async function request(d){
  const a=await profile(),u=auth.currentUser.uid;
  if(d.op==='profile')return a;
  if(d.op==='history'){if(!history)throw Error('対戦履歴の接続を準備中です');return {histories:await history.list(d.uid||u)};}
  if(d.op==='resume')return resumeActive(a);
  if(['friendJoin','join','queue','cancel'].includes(d.op)&&a.active){
   const resumed=await resumeActive(a);
   if(resumed.match&&!resumed.match.closed)return {match:resumed.match};
  }
  if(d.op==='friendJoin'){
   const lobby=await read('friendRooms/'+d.roomId);
   if(!lobby||lobby.host===u||lobby.game||lobby.heartbeat<=now()-15000)throw Error('この部屋には参加できません');
   const id=push(ref(db,'freeGames')).key;
   try{await update(ref(db),{['freeGames/'+id+'/players']:{1:u,2:lobby.host},['freeGames/'+id+'/createdAt']:serverTimestamp(),['freeGames/'+id+'/kind']:'friend',['freeGames/'+id+'/room']:d.roomId,['freeAccounts/'+u+'/active']:id,['freeAccounts/'+lobby.host+'/active']:id,['friendRooms/'+d.roomId+'/game']:id});}
   catch(e){
    const fresh=await profile();if(fresh.active)return {match:await status(fresh.active)};
    const current=await read('friendRooms/'+d.roomId);
    if(!current)throw Error('部屋が閉じられました。部屋一覧から選び直してください。');
    if(current.game)throw Error('この部屋にはすでに別の人が参加しています。');
    if(current.heartbeat<=now()-15000)throw Error('部屋の作成者との接続が切れています。作成者が部屋画面を開いた状態で作り直してください。');
    const host=await read('freeAccounts/'+current.host);
    if(host?.active)throw Error('部屋の作成者に進行中の対戦があります。終了後に部屋を作り直してください。');
    const code=String(e.code||'');
    if(/permission.?denied/i.test(code+' '+e.message))throw Error('Firebaseのルールで参加が拒否されました［ROOM_RULES_DENIED］。Realtime Databaseのルールが更新・公開されているか確認してください。');
    throw Error('部屋への接続に失敗しました［'+(code||'ROOM_JOIN_FAILED')+'］。'+(e.message||''));
   }
   return {match:await status(id)};
  }
  if(['join','queue','cancel'].includes(d.op)){
   if(auth.currentUser.isAnonymous)throw Error('ランダム対戦にはログインが必要です');
   const qp='freeQueue/'+u;
   if(d.op==='cancel'){await set(ref(db,qp),null);const fresh=await profile();return fresh.active?{match:await status(fresh.active)}:{};}
   let q=await read(qp);try{await set(ref(db,qp),{joinedAt:q?.joinedAt??serverTimestamp(),heartbeat:serverTimestamp()});}catch(e){const fresh=await profile();if(fresh.active)return {match:await status(fresh.active)};throw e;}
   q=await read(qp);const all=await read('freeQueue')||{};
   for(const [other]of Object.entries(all).filter(([k,v])=>k!==u&&v.heartbeat>now()-15000).sort((a,b)=>a[1].joinedAt-b[1].joinedAt)){
    const id=push(ref(db,'freeGames')).key;try{await update(ref(db),{['freeGames/'+id+'/players']:{1:u,2:other},['freeGames/'+id+'/createdAt']:serverTimestamp(),['freeGames/'+id+'/kind']:'random',['freeAccounts/'+u+'/active']:id,['freeAccounts/'+other+'/active']:id,[qp]:null,['freeQueue/'+other]:null});return {match:await status(id)};}catch(e){const fresh=await profile();if(fresh.active)return {match:await status(fresh.active)};}
   }
   // Keep refreshing the queue heartbeat until another human joins or the user cancels.
   const waitedMs=Math.max(0,now()-(q?.joinedAt??now()));
   return {waitedMs,waiting:1,capacity:2};
  }
  const id=d.matchId,path='freeGames/'+id,players=await read(path+'/players'),me=players?.[1]===u?1:players?.[2]===u?2:0;
  if(!me){const saved=await archivedStatus(id,u);if(saved)return saved;throw Error('参加者ではありません');}
  if(d.op!=='status'&&await read(path+'/settled'))return {match:await status(id)};
  if(d.op==='loadout'){
   // Snapshot before ready/state. A rules-first rollout also remains compatible
   // with older clients that do not send profiles.
   try{
    if(!await read(path+'/profiles/'+me)){
     const [account,titles]=await Promise.all([read('freeAccounts/'+u),read('titleLoadouts/'+u)]);
     await writeSet(path+'/profiles/'+me,{name:account.name,rating:account.rating,titles:Object.fromEntries([0,1,2].map(i=>[i,titles?.[i]||'']))});
    }
   }catch(error){console.warn('対戦時のプロフィールを保存できませんでした',error);}
   try{
    await writeUpdate(path,{['loadouts/'+me]:d.loadout,['ready/'+me]:true});
   }catch(error){
    const [savedReady,savedLoadout]=await Promise.all([read(path+'/ready/'+me),read(path+'/loadouts/'+me)]);
    if(savedReady!==true||JSON.stringify(savedLoadout)!==JSON.stringify(d.loadout))throw error;
   }
  }
  else if(d.op==='action'){
   const s=await read(path+'/state');
   if(!s){const saved=await archivedStatus(id,u);if(saved)return saved;}
   if(s&&s.turn!==d.turn)return {match:await status(id)};
   if(!s||now()<turnOpensAt(s))throw Error('プレイヤー紹介が終わるまでお待ちください');
   // Writes are immutable. A retry after a lost acknowledgement must use the
   // already accepted move, even when the timeout default differs from it.
   if(await read(path+'/moves/'+d.turn+'/'+me)!=null)return {match:await status(id)};
   try{await writeSet(path+'/moves/'+d.turn+'/'+me,d.action);}
   catch(error){if(await read(path+'/moves/'+d.turn+'/'+me)!==d.action)throw error;}
  }
  else if(d.op==='resign')await writeSet(path+'/resigned/'+me,serverTimestamp());
  else if(d.op!=='status')throw Error('未対応の操作');
  return {match:await status(id)};
 }
 // Observe public children only; subscribing to the game root would expose
 // hidden moves and is denied by the existing database rules.
 request.watch=(id,onChange,onError)=>{
  const stops=['state','ready','resigned','settled'].map(key=>onValue(ref(db,'freeGames/'+id+'/'+key),onChange,onError));
  return ()=>stops.forEach(stop=>stop());
 };
 request.transitionMs=transitionMs;
 return request;
}
