import {ref,get,set,update,remove,push,onValue,onDisconnect,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import {signInAnonymously} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
export function createProtectedRooms(db,auth,transport,history){
 let offset=0,hostRoom=null,heartbeat=null,disconnect=null;onValue(ref(db,'.info/serverTimeOffset'),s=>offset=Number(s.val()||0));
 const now=()=>Date.now()+offset,read=async p=>(await get(ref(db,p))).val();
 async function ensure(){await auth.authStateReady();if(!auth.currentUser)await signInAnonymously(auth);await transport({op:'profile'});}
 async function create(options){const rules=window.RoomRules.normalize(options);await ensure();const who=auth.currentUser.uid;const account=await read('freeAccounts/'+who);if(account.active)throw Error('進行中の対戦を終了してください');
  if(rules.mode==='custom'&&!await transport.supportsRoomRules?.())throw Error('カスタム対戦はまだ利用できません。更新後にお試しください。');
  const roomPatch=rules.mode==='custom'?{roomRules:rules}:{};
  const id=push(ref(db,'friendRooms')).key;await set(ref(db,'friendRooms/'+id),{host:who,name:account.name,createdAt:serverTimestamp(),heartbeat:serverTimestamp(),game:'',...roomPatch});hostRoom=id;
  disconnect=onDisconnect(ref(db,'friendRooms/'+id));await disconnect.remove();
  heartbeat=setInterval(()=>update(ref(db,'friendRooms/'+id),{heartbeat:serverTimestamp()}).catch(()=>{}),5000);return id;
 }
 async function releaseHost(){clearInterval(heartbeat);heartbeat=null;const d=disconnect;disconnect=null;hostRoom=null;if(d)await d.cancel();}
 async function leave(){const id=hostRoom;await releaseHost();if(id){const room=await read('friendRooms/'+id);if(room?.game)return transport({op:'status',matchId:room.game});if(room)await remove(ref(db,'friendRooms/'+id));}return null;}
 async function join(id){await ensure();return transport({op:'friendJoin',roomId:id});}
 function watchList(callback,onError){let stop=null,cancelled=false;ensure().then(()=>{if(!cancelled)stop=onValue(ref(db,'friendRooms'),s=>callback(s.val()||{}),onError);}).catch(onError);return ()=>{cancelled=true;stop?.();};}
 function watchHost(id,onMatch,onError){let busy=false;return onValue(ref(db,'friendRooms/'+id),async s=>{const room=s.val();if(room?.game&&!busy){busy=true;try{await releaseHost();onMatch((await transport({op:'status',matchId:room.game})).match);}catch(e){busy=false;onError(e);}}},onError);}
 const observedGames=new Map();
 function archivedSnapshot(h){
  const s=h?.finalState;if(!s)return null;const people={};
  for(const p of [1,2])people[p]={name:h.players[p].name,joined:true,online:false,techniques:h.players[p].loadout?[0,1,2].map(i=>h.players[p].loadout[i]):[]};
  return {players:people,battle:{roomRules:h.roomRules||null,phase:'finished',turn:s.turn,updatedAt:now(),result:h.settled.winner?h.settled.winner+'P WIN':'DRAW',hp:{1:s.hp1,2:s.hp2},gauge:{1:s.gauge1,2:s.gauge2},enhanceTurns:{1:s.enhance1,2:s.enhance2},blockSeal:{1:s.seal1,2:s.seal2}}};
 }
 const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]+$/.test(id);
 async function snapshot(roomId,accounts){
  const random=roomId.startsWith('random:'),room=random?null:await read('friendRooms/'+roomId);
  const id=random?roomId.slice(7):room?.game||observedGames.get(roomId);if(!validId(id))return null;
  observedGames.set(roomId,id);if(observedGames.size>100)observedGames.delete(observedGames.keys().next().value);
  const archived=async()=>{const h=await history?.find(id);return random&&h?.kind!=='random'?null:archivedSnapshot(h);};
  if(!random&&!room?.game)return archived();const path='freeGames/'+id;
  // Read public children separately: a live game root includes private moves.
  const [players,s,ready,settled,reveal,kind]=await Promise.all(['players','state','ready','settled','transition','kind'].map(k=>read(path+'/'+k)));
  if(!players||!s)return archived();if(random&&kind!=='random')return null;
  const roomRules=await transport.supportsRoomRules?.()?await read(path+'/roomRules'):null;
  const people={};try{for(const p of [1,2]){const a=accounts?.[players[p]]||await read('freeAccounts/'+players[p]);people[p]={name:a?.name||'プレイヤー',joined:true,online:!settled,techniques:ready?.[1]===true&&ready?.[2]===true?await read(path+'/loadouts/'+p):[]};}}
  catch(error){if(!await read(path+'/players'))return archived();throw error;}
  // Settlement can archive/delete the live node between these reads.
  if(!await read(path+'/players'))return archived();
  const battle={roomRules,phase:settled?'finished':'battle',turn:s.turn,updatedAt:now(),result:settled?(settled.winner?settled.winner+'P WIN':'DRAW'):'',hp:{1:s.hp1,2:s.hp2},gauge:{1:s.gauge1,2:s.gauge2},enhanceTurns:{1:s.enhance1,2:s.enhance2},blockSeal:{1:s.seal1,2:s.seal2},ruinTurns:{1:s.ruin1||0,2:s.ruin2||0},lastAction:{1:s.last1?{data:{type:s.last1}}:null,2:s.last2?{data:{type:s.last2}}:null}};
  const countdownEnd=Number.isFinite(s.previousDeadline)?Math.max(s.startedAt,Math.min(s.startedAt+3000,s.previousDeadline)):s.startedAt+3000;
  if(!settled&&reveal?.turn===s.turn&&s.turn>1&&now()<countdownEnd+3000){const action=id=>window.BattleAI.ACTIONS[id];battle.phase='effect';battle.resolvedTurn=reveal.turn-1;battle.countdownEndsAt=countdownEnd;battle.revealAt=countdownEnd+500;battle.effectStartAt=countdownEnd+1800;battle.damageTo1=reveal.damage1;battle.damageTo2=reveal.damage2;battle.actions={1:{id:reveal.action1,data:action(reveal.action1)},2:{id:reveal.action2,data:action(reveal.action2)}};}
  return {players:people,battle};
 }
 function poll(task,callback,onError){let cancelled=false,timer=null;const loop=async()=>{try{await ensure();const result=await task();if(!cancelled){try{callback(result);}catch(error){console.error('観戦画面の更新に失敗しました',error);}}}catch(e){if(!cancelled)onError?.(e);}finally{if(!cancelled)timer=setTimeout(loop,1200);}};loop();return ()=>{cancelled=true;clearTimeout(timer);};}
 function watchAllRooms(callback,onError){
  let cancelled=false,stopPoll=null,accounts=null,rooms=null;const stops=[];
  const reportError=error=>{if(!cancelled)onError?.(error);};
  function start(){
   if(cancelled||stopPoll||accounts===null||rooms===null)return;
   stopPoll=poll(async()=>{
    const targets=new Map(),out={},currentAccounts=accounts;
    for(const [code,room]of Object.entries(rooms))if(validId(code)&&validId(room?.game))targets.set(room.game,code);
    // Both participants reference the same game. Deduplicate; do not read freeGames wholesale.
    for(const account of Object.values(currentAccounts))if(validId(account?.active)&&!targets.has(account.active))targets.set(account.active,'random:'+account.active);
    const results=await Promise.allSettled([...targets.values()].slice(-100).map(async code=>{
     const value=await snapshot(code,currentAccounts);if(value&&!value.battle.result)out[code]=value;
    }));
    if(results.length&&results.every(result=>result.status==='rejected'))throw results[0].reason;
    return out;
   },callback,reportError);
  }
  ensure().then(()=>{
   if(cancelled)return;
   stops.push(onValue(ref(db,'freeAccounts'),s=>{accounts=s.val()||{};start();},reportError));
   stops.push(onValue(ref(db,'friendRooms'),s=>{rooms=s.val()||{};start();},reportError));
  }).catch(reportError);
  return ()=>{cancelled=true;stopPoll?.();stops.forEach(stop=>stop());};
 }
 return {resume:async()=>{await ensure();return transport({op:'resume'});},ensure,create,join,leave,now,watchList,watchHost,watchAllRooms,watchRoom:(id,callback,onError)=>poll(()=>snapshot(id),callback,onError)};
}
