import {ref,get,set,update,push,serverTimestamp,onValue} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import {calculate,stateFields} from './free-calculator.js';
export function createFreeTransport(db,auth){
 let offset=0;onValue(ref(db,'.info/serverTimeOffset'),s=>{offset=s.val()||0;});
 const now=()=>Date.now()+offset,read=async p=>(await get(ref(db,p))).val();
 async function profile(){const u=auth.currentUser?.uid;if(!u)throw Error('ログインしてください');let a=await read('freeAccounts/'+u);if(!a){a={name:String(auth.currentUser.isAnonymous?'ゲスト':globalThis.window?.loggedInPlayerData?.name||'プレイヤー').slice(0,24),guest:!!auth.currentUser.isAnonymous,rating:1000,games:0,onlineWins:0,friendWins:0,active:'',lastSettled:''};try{await set(ref(db,'freeAccounts/'+u),a);}catch(e){a=await read('freeAccounts/'+u);if(!a)throw e;}}if(Number(a.rating)<1000){a={...a,rating:1000};await update(ref(db,'freeAccounts/'+u),{rating:1000});}return a;}
 const turnOpensAt=s=>s.startedAt+(s.turn>1?2500:5100);
 const initial=()=>Object.fromEntries(stateFields.map(k=>[k,k==='turn'?1:k==='startedAt'?serverTimestamp():k.startsWith('hp')?10:k.startsWith('seal')||k.startsWith('momentum')?false:k.startsWith('last')?'':0]));
 async function status(id){
  const u=auth.currentUser.uid,path='freeGames/'+id;let g;
  for(let attempt=0;attempt<4;attempt++){
   const keys=['players','createdAt','state','ready','resigned','settled','transition','kind','room'];g=Object.fromEntries(await Promise.all(keys.map(async k=>[k,await read(path+'/'+k)])));g.ready||={};
   const me=g.players[1]===u?1:g.players[2]===u?2:0;if(!me)throw Error('参加者ではありません');g.me=me;
   const s=g.state;let finalMoves=null;const expires=s?turnOpensAt(s)+40000:0;
   if(s&&now()>=expires)finalMoves=await read(path+'/moves/'+s.turn)||{};
   const abandoned=!!s&&now()>=expires&&(finalMoves?.[1]==null||finalMoves?.[2]==null);g.abandoned=abandoned;
   const terminal=abandoned||!!g.resigned||s&&(s.hp1<=0||s.hp2<=0||s.turn>300)||!s&&now()>=g.createdAt+90000;
   if(terminal&&!g.settled){
    const winner=g.resigned?.[1]?2:g.resigned?.[2]?1:s&&s.hp1>0&&s.hp2>0&&s.turn<=300&&abandoned?(finalMoves[1]!=null?1:finalMoves[2]!=null?2:0):s?(s.hp1<=0?(s.hp2<=0?0:2):s.hp2<=0?1:0):g.ready[1]?(g.ready[2]?0:1):g.ready[2]?2:0;
    const accounts={1:await read('freeAccounts/'+g.players[1]),2:await read('freeAccounts/'+g.players[2])};
    const amount=g.kind==='friend'||winner===0?0:Math.max(10,30+Math.trunc((accounts[3-winner].rating-accounts[winner].rating)/20));
    const patch={},ledger={at:serverTimestamp(),winner};for(const p of [1,2]){const a=accounts[p],before=Math.max(1000,Number(a.rating)||1000),wanted=winner===0?before:winner===p?before+amount:before-amount,after=Math.max(1000,wanted),d=after-before,isWin=winner===p;Object.assign(ledger,{['before'+p]:before,['after'+p]:after,['delta'+p]:d});patch['freeAccounts/'+g.players[p]]={...a,rating:after,games:Number(a.games||0)+1,onlineWins:Number(a.onlineWins||0)+(isWin&&g.kind!=='friend'?1:0),friendWins:Number(a.friendWins||0)+(isWin&&g.kind==='friend'?1:0),active:'',lastSettled:id};}patch[path+'/settled']=ledger;
    try{await update(ref(db),patch);}catch(e){if(!await read(path+'/settled'))throw e;}continue;
   }
   if(!s&&!terminal&&g.ready[1]&&g.ready[2]){try{await set(ref(db,path+'/state'),initial());}catch(e){if(!await read(path+'/state'))throw e;}continue;}
   if(s&&!terminal&&now()>=turnOpensAt(s)){
    g.own=await read(path+'/moves/'+s.turn+'/'+me);let moves=null;
    try{moves=await read(path+'/moves/'+s.turn);}catch(e){if(!String(e.code||e.message).toLowerCase().includes('permission'))throw e;}
    if(moves?.[1]!=null&&moves?.[2]!=null){const c=calculate(s,moves||{},id),state=Object.fromEntries(stateFields.map(k=>[k,k==='startedAt'?serverTimestamp():c[k]]));try{await update(ref(db,path),{transition:c,state});}catch(e){const fresh=await read(path+'/state');if(fresh.turn===s.turn&&!await read(path+'/resigned'))throw e;}continue;}
   }
   break;
  }
  const s=g.state,me=g.me,players={};for(const p of [1,2]){const account=await read('freeAccounts/'+g.players[p]);players[p]={name:account.name,rating:account.guest?null:Number.isFinite(account.rating)?account.rating:null,bot:false,titles:await window.titleService.loadoutFor(g.players[p])};}
  const loadouts={};if(g.ready[1]&&g.ready[2])for(const p of [1,2])loadouts[p]=await read(path+'/loadouts/'+p);
  const state=s?{turn:s.turn,...Object.fromEntries(['hp','gauge','seal','enhance','momentum','last'].map(k=>[k,[null,s[k+'1'],s[k+'2']]]))}:null;
  const closed=!!g.settled,opensAt=s?turnOpensAt(s):0;
  if(s)window.titleService.recordMatch({id,side:me,resolvedThrough:s.turn-1}).catch(console.warn);
  if(closed)window.titleService.claimRatings().catch(console.warn);
  return {id,kind:g.kind||'random',roomId:g.room||null,you:me,players,ready:g.ready,loadouts,state,closed,phase:closed?'finished':s?'turn':'select',revision:now(),serverNow:now(),opensAt,deadline:s?opensAt+10000:g.createdAt+60000,graceDeadline:s?opensAt+40000:g.createdAt+90000,ownAction:g.own??null,reveal:g.transition?{turn:g.transition.turn-1,actions:{1:g.transition.action1,2:g.transition.action2},damage:{1:g.transition.damage1,2:g.transition.damage2}}:null,result:closed?{winner:g.settled.winner,rated:g.kind!=='friend',reason:g.resigned?'resigned':g.abandoned&&s?.hp1>0&&s?.hp2>0?'reconnect-timeout':!s?'selection-timeout':s.misses1>=2||s.misses2>=2?'idle-forfeit':s.turn>300?'turn-limit':'battle'}:null,rating:closed?{before:g.settled['before'+me],after:g.settled['after'+me],delta:g.settled['delta'+me]}:null};
 }
 return async function request(d){
  const a=await profile(),u=auth.currentUser.uid;
  if(d.op==='profile')return a;
  if(d.op==='resume'){const id=a.active;return id?{match:await status(id)}:{};}
  if(d.op==='friendJoin'){
   if(a.active)return {match:await status(a.active)};
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
   if(a.active)return {match:await status(a.active)};
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
  const id=d.matchId,path='freeGames/'+id,players=await read(path+'/players'),me=players[1]===u?1:players[2]===u?2:0;if(!me)throw Error('参加者ではありません');
  if(d.op==='loadout')await update(ref(db,path),{['loadouts/'+me]:d.loadout,['ready/'+me]:true});
  else if(d.op==='action'){const s=await read(path+'/state');if(!s||now()<turnOpensAt(s))throw Error('プレイヤー紹介が終わるまでお待ちください');await set(ref(db,path+'/moves/'+d.turn+'/'+me),d.action);}
  else if(d.op==='resign')await set(ref(db,path+'/resigned/'+me),serverTimestamp());
  else if(d.op!=='status')throw Error('未対応の操作');
  return {match:await status(id)};
 };
}
