import {ref,get,set,update,remove,push,onValue,onDisconnect,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import {signInAnonymously} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
export function createProtectedRooms(db,auth,transport,history){
 let offset=0,hostRoom=null,heartbeat=null,disconnect=null;onValue(ref(db,'.info/serverTimeOffset'),s=>offset=Number(s.val()||0));
 const now=()=>Date.now()+offset,read=async p=>(await get(ref(db,p))).val();
 async function ensure(){await auth.authStateReady();if(!auth.currentUser)await signInAnonymously(auth);await transport({op:'profile'});}
 async function create(){await ensure();const who=auth.currentUser.uid;const account=await read('freeAccounts/'+who);if(account.active)throw Error('進行中の対戦を終了してください');
  const id=push(ref(db,'friendRooms')).key;await set(ref(db,'friendRooms/'+id),{host:who,name:account.name,createdAt:serverTimestamp(),heartbeat:serverTimestamp(),game:''});hostRoom=id;
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
  return {players:people,battle:{phase:'finished',turn:s.turn,updatedAt:now(),result:h.settled.winner?h.settled.winner+'P WIN':'DRAW',hp:{1:s.hp1,2:s.hp2},gauge:{1:s.gauge1,2:s.gauge2},enhanceTurns:{1:s.enhance1,2:s.enhance2},blockSeal:{1:s.seal1,2:s.seal2}}};
 }
 async function snapshot(roomId){
  const room=await read('friendRooms/'+roomId),id=room?.game||observedGames.get(roomId);if(!id)return null;
  observedGames.set(roomId,id);if(observedGames.size>100)observedGames.delete(observedGames.keys().next().value);
  if(!room?.game)return archivedSnapshot(await history?.find(id));const path='freeGames/'+id;
  const [players,s,ready,settled,reveal]=await Promise.all(['players','state','ready','settled','transition'].map(k=>read(path+'/'+k)));if(!players||!s)return archivedSnapshot(await history?.find(id));
  const people={};for(const p of [1,2]){const a=await read('freeAccounts/'+players[p]);people[p]={name:a?.name||'プレイヤー',joined:true,online:!settled,techniques:ready?.[1]&&ready?.[2]?await read(path+'/loadouts/'+p):[]};}
  const battle={phase:settled?'finished':'battle',turn:s.turn,updatedAt:now(),result:settled?(settled.winner?settled.winner+'P WIN':'DRAW'):'',hp:{1:s.hp1,2:s.hp2},gauge:{1:s.gauge1,2:s.gauge2},enhanceTurns:{1:s.enhance1,2:s.enhance2},blockSeal:{1:s.seal1,2:s.seal2}};
  if(!settled&&reveal&&now()<s.startedAt+2500){const action=id=>id<3?window.BattleAI.ACTIONS[id]:window.BattleAI.techniques[id-3];battle.phase='effect';battle.resolvedTurn=reveal.turn-1;battle.revealAt=s.startedAt;battle.effectStartAt=s.startedAt+1300;battle.damageTo1=reveal.damage1;battle.damageTo2=reveal.damage2;battle.actions={1:{id:reveal.action1,data:action(reveal.action1)},2:{id:reveal.action2,data:action(reveal.action2)}};}
  return {players:people,battle};
 }
 function poll(task,callback,onError){let cancelled=false,timer=null;const loop=async()=>{try{await ensure();const result=await task();if(!cancelled)callback(result);}catch(e){if(!cancelled)onError?.(e);}finally{if(!cancelled)timer=setTimeout(loop,1200);}};loop();return ()=>{cancelled=true;clearTimeout(timer);};}
 function watchAllRooms(callback,onError){return poll(async()=>{const all=await read('friendRooms')||{},out={};await Promise.all(Object.entries(all).filter(([,r])=>r.game).slice(-100).map(async([id])=>{const value=await snapshot(id);if(value&&!value.battle.result)out[id]=value;}));return out;},callback,onError);}
 return {resume:async()=>{await ensure();return transport({op:'resume'});},ensure,create,join,leave,now,watchList,watchHost,watchAllRooms,watchRoom:(id,callback,onError)=>poll(()=>snapshot(id),callback,onError)};
}
