import {ref,get,set,update,remove,push,onValue,onDisconnect,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import {signInAnonymously} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {spectatorSkillMatch} from './advanced/spectator.js?v=spectator-special-skills-20261025';
export function createProtectedRooms(db,auth,transport,history){
 let offset=0,hostRoom=null,heartbeat=null,disconnect=null,stopHostWatch=null;onValue(ref(db,'.info/serverTimeOffset'),s=>offset=Number(s.val()||0));
 const now=()=>Date.now()+offset,read=async p=>(await get(ref(db,p))).val();
 async function ensure(){await auth.authStateReady();if(!auth.currentUser)await signInAnonymously(auth);await transport({op:'profile'});}
 async function create(options){const rules=window.RoomRules.normalize(options);if(rules.mode==='advanced'&&window.RoomRules.hasSpecial(rules))rules.hp=10;await ensure();const who=auth.currentUser.uid;const account=await read('freeAccounts/'+who);if(account.active)throw Error('進行中の対戦を終了してください');
  if(rules.mode==='custom'&&!await transport.supportsRoomRules?.())throw Error('カスタム対戦はまだ利用できません。更新後にお試しください。');
  if(rules.mode==='custom'&&window.AdvancedRules.isAdvanced(rules)&&!await transport.supportsCustomOptions?.())throw Error('Customの追加設定を利用するには、Firebaseの対戦ルールを更新・公開してください。');
  if(window.AdvancedRules.isAdvanced(rules)&&!await transport.supportsAdvanced?.())throw Error('Advancedはまだ利用できません。更新後にお試しください。');
  if(window.RoomRules.needsAdvancedOptions(rules)&&!await transport.supportsAdvancedOptions?.())throw Error('Advancedの追加設定を利用するには、対戦ルールを更新してください。');
  if(window.RoomRules.hasSpecial(rules)&&!await transport.supportsSpecialGauge?.())throw Error('スペシャルゲージを利用するには、対戦ルールを更新してください。');
  if(rules.mode==='advanced'&&window.RoomRules.hasSpecial(rules)&&!await transport.supportsSpecialHp?.())throw Error('HP10のスペシャル対戦を利用するには、Firebaseの対戦ルールを更新・公開してください。');
  if(window.RoomRules.hasSpecial(rules)&&!await transport.supportsSpecialMoves?.())throw Error('S技を利用するには、Firebaseの対戦ルールを更新・公開してください。');
  if(window.RoomRules.hasSpecial(rules)&&!await transport.supportsSpecialExpansion?.())throw Error('新しいS技を利用するには、Firebaseの対戦ルールを更新・公開してください。');
  const roomPatch=rules.mode!=='standard'?{roomRules:rules}:{};
  const id=push(ref(db,'friendRooms')).key;await set(ref(db,'friendRooms/'+id),{host:who,name:account.name,createdAt:serverTimestamp(),heartbeat:serverTimestamp(),game:'',...roomPatch});hostRoom=id;
  disconnect=onDisconnect(ref(db,'friendRooms/'+id));await disconnect.remove();
  heartbeat=setInterval(()=>update(ref(db,'friendRooms/'+id),{heartbeat:serverTimestamp()}).catch(()=>{}),5000);return id;
 }
 async function releaseHost(keepRoom=false){clearInterval(heartbeat);heartbeat=null;const d=disconnect;disconnect=null;if(!keepRoom)hostRoom=null;if(d)await d.cancel();}
 async function leave(){stopHostWatch?.();const id=hostRoom;await releaseHost();if(id){const room=await read('friendRooms/'+id);if(room?.game)return transport({op:'status',matchId:room.game});if(room)await remove(ref(db,'friendRooms/'+id));}return null;}
 async function join(id){await ensure();return transport({op:'friendJoin',roomId:id});}
 function watchList(callback,onError){let stop=null,cancelled=false;ensure().then(()=>{if(!cancelled)stop=onValue(ref(db,'friendRooms'),s=>callback(s.val()||{}),onError);}).catch(onError);return ()=>{cancelled=true;stop?.();};}
 function watchHost(id,onMatch,onError){
  stopHostWatch?.();
  let game=null,busy=false,cancelled=false,finished=false,timer=null,delay=1000;
  async function connect(){
   timer=null;if(cancelled||finished||busy||!game)return;busy=true;
   try{
    // Stop the waiting-room heartbeat, but keep its ID until entry succeeds.
    await releaseHost(true);if(cancelled)return;
    const response=await transport({op:'status',matchId:game});if(cancelled)return;
    finished=true;if(hostRoom===id)hostRoom=null;onMatch(response.match);
   }catch(error){
    if(!cancelled&&!finished){timer=setTimeout(connect,delay);delay=Math.min(5000,delay*2);onError?.(error);}
   }finally{busy=false;}
  }
  const unsubscribe=onValue(ref(db,'friendRooms/'+id),s=>{
   if(cancelled||finished)return;
   const room=s.val();if(room?.game){game=room.game;if(!busy&&timer===null)connect();}
  },error=>{if(!cancelled&&!finished)onError?.(error);});
  const stop=()=>{cancelled=true;clearTimeout(timer);timer=null;unsubscribe();if(stopHostWatch===stop)stopHostWatch=null;};
  stopHostWatch=stop;return stop;
 }
 const specialStates=s=>Object.fromEntries(['specialSeal','specialRuin','specialMomentum','weaken'].map(k=>[k,{1:s[k+'1']||0,2:s[k+'2']||0}]));
 const publicState=s=>({turn:s.turn,skillsExhausted:!!s.skillsExhausted,hp:{1:s.hp1,2:s.hp2},gauge:{1:s.gauge1,2:s.gauge2},enhanceTurns:{1:s.enhance1,2:s.enhance2},blockSeal:{1:!!s.seal1,2:!!s.seal2},ruinTurns:{1:s.ruin1||0,2:s.ruin2||0},momentumBonus:{1:!!s.momentum1,2:!!s.momentum2},frozen:{1:s.frozen1||0,2:s.frozen2||0},poison:{1:s.poison1||0,2:s.poison2||0},...specialStates(s),lastAction:{1:s.last1?{data:{type:s.last1}}:null,2:s.last2?{data:{type:s.last2}}:null}});
 const revealedAction=(id,special)=>id<3?window.BattleAI.ACTIONS[id]:window.SpecialRules.actionData(id,window.BattleAI.techniques,null,special?.version);
 function beforeAction(reveal,state){
  if(![1,2].every(p=>Number.isFinite(reveal['inputHp'+p])&&Number.isFinite(reveal['inputGauge'+p])))return null;
  const before={...state,turn:reveal.turn-1};
  for(const p of [1,2])for(const field of ['hp','gauge','seal','enhance','momentum','ruin','last','specialSeal','specialRuin','specialMomentum','frozen','poison','weaken']){
   const value=reveal['input'+field[0].toUpperCase()+field.slice(1)+p];if(value!=null)before[field+p]=value;
  }
  return publicState(before);
 }
 const observedGames=new Map();
 function archivedSnapshot(h){
  const raw=h?.finalState;if(!raw)return null;const s=window.AdvancedRules.isAdvanced(h.roomRules)?window.AdvancedRules.preview(raw,h.advanced?.selected,window.AdvancedRules.forTurn(h.advanced,raw.turn),h.roomRules):raw,people={};
  for(const p of [1,2])people[p]={name:h.players[p].name,joined:true,online:false,techniques:h.players[p].loadout?[0,1,2].map(i=>h.players[p].loadout[i]):[]};
  return {players:people,battle:{matchId:h.id||'archive',foresightShield:h.foresightShield===true,special:h.special||null,...publicState(s),skillMatch:spectatorSkillMatch(h.id||'archive',raw,h.advanced,h.roomRules,people,true,now()),roomRules:h.roomRules||null,phase:'finished',updatedAt:now(),result:h.settled.winner?h.settled.winner+'P WIN':'DRAW'}};
 }
 const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]+$/.test(id);
 async function snapshot(roomId,accounts){
  const random=roomId.startsWith('random:'),room=random?null:await read('friendRooms/'+roomId);
  const id=random?roomId.slice(7):room?.game||observedGames.get(roomId);if(!validId(id))return null;
  observedGames.set(roomId,id);if(observedGames.size>100)observedGames.delete(observedGames.keys().next().value);
  const archived=async()=>{const h=await history?.find(id);return random&&h?.kind!=='random'?null:archivedSnapshot(h);};
  if(!random&&!room?.game)return archived();const path='freeGames/'+id;
  // Read public children separately: a live game root includes private moves.
  const [players,rawState,ready,settled,reveal,kind,foresightShield]=await Promise.all(['players','state','ready','settled','transition','kind','foresightShield'].map(k=>read(path+'/'+k)));
  if(!players||!rawState)return archived();if(random&&kind!=='random')return null;
  const roomRules=await transport.supportsRoomRules?.()?await read(path+'/roomRules'):null;
  const advanced=window.RoomRules.hasSkills(roomRules)?await read(path+'/advanced'):null;
  const special=window.RoomRules.hasSpecial(roomRules)?await read(path+'/special'):null;
  const skillMatch=spectatorSkillMatch(id,rawState,advanced,roomRules,null,settled,now());
  const s=skillMatch&&window.AdvancedRules.presentationComplete(skillMatch,skillMatch.serverNow)?window.AdvancedRules.preview(rawState,advanced?.selected,window.AdvancedRules.forTurn(advanced,rawState.turn),roomRules):rawState;
  const people={};try{for(const p of [1,2]){const a=accounts?.[players[p]]||await read('freeAccounts/'+players[p]);people[p]={name:a?.name||'プレイヤー',joined:true,online:!settled,techniques:ready?.[1]===true&&ready?.[2]===true?await read(path+'/loadouts/'+p):[]};}}
  catch(error){if(!await read(path+'/players'))return archived();throw error;}
  if(skillMatch)skillMatch.players=people;
  // Settlement can archive/delete the live node between these reads.
  if(!await read(path+'/players'))return archived();
  const battle={matchId:id,foresightShield:foresightShield===true,roomRules,special,...publicState(s),phase:settled?'finished':'battle',updatedAt:now(),result:settled?(settled.winner?settled.winner+'P WIN':'DRAW'):''};
  const countdownEnd=Number.isFinite(s.previousDeadline)?Math.max(s.startedAt,Math.min(s.startedAt+3000,s.previousDeadline)):s.startedAt+3000;
  if(!settled&&reveal?.turn===s.turn&&s.turn>1&&now()<countdownEnd+3000){
   battle.phase='effect';battle.resolvedTurn=reveal.turn-1;battle.countdownEndsAt=countdownEnd;battle.revealAt=countdownEnd+500;battle.effectStartAt=countdownEnd+1800;
   battle.damageTo1=reveal.damage1;battle.damageTo2=reveal.damage2;battle.before=beforeAction(reveal,rawState);
   battle.resources={foresightShield:foresightShield===true,...(battle.before?{before:{hp:battle.before.hp,gauge:battle.before.gauge}}:{}),after:{hp:{1:reveal.hp1,2:reveal.hp2},gauge:{1:reveal.gauge1,2:reveal.gauge2},...(special?{special:special.gauge}:{})},outcome:Object.fromEntries(['paid','charged','foresight','healed','rampage','stolen','specialGain'].flatMap(key=>[1,2].filter(p=>Number.isFinite(reveal[key+p])).map(p=>[key+p,reveal[key+p]])))};
   battle.actions={1:{id:reveal.action1,data:revealedAction(reveal.action1,special)},2:{id:reveal.action2,data:revealedAction(reveal.action2,special)}};
  }
  if(skillMatch)battle.skillMatch=skillMatch;
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

