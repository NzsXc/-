const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {harness}=require('./rules-harness.cjs'),R=require('../room-rules.js'),A=require('../advanced/rules.js');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
function protectedApi(h,supported=true){
 const transport=async data=>h.transports[1](data);transport.supportsRoomRules=async()=>true;transport.supportsAdvanced=async()=>true;transport.supportsAdvancedOptions=async()=>supported;transport.supportsSpecialGauge=async()=>true;transport.supportsSpecialHp=async()=>supported;transport.supportsSpecialMoves=async()=>supported;
 const ctx=vm.createContext({window:{RoomRules:R,AdvancedRules:A,BattleAI:require('../bot-engine.js')},console,Date:{now:h.now},
  ref:(_db,p)=>({p}),get:async r=>{assert(h.allowed('.read',r.p,'p2'));return {val:()=>structuredClone(h.get(r.p))};},
  set:async(r,v)=>h.commit({[r.p]:v},'p2'),update:async(r,p)=>h.commit(Object.fromEntries(Object.entries(p).map(([k,v])=>[r.p+'/'+k,v])),'p2'),
  remove:async()=>{},push:()=>({key:'optionsRoom'}),serverTimestamp:h.now,onValue:()=>()=>{},onDisconnect:()=>({remove:async()=>{},cancel:async()=>{}}),signInAnonymously:async()=>{},
  setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},db:{},auth:{currentUser:{uid:'p2'},authStateReady:async()=>{}},transport,
  history:{find:async id=>h.get('battleHistory/'+id)}
 });
 vm.runInContext(read('advanced/spectator.js').replace('export function','function')+'\n'+read('protected-rooms.js').replace(/^import[^\n]*\n/gm,'').replace('export function','function'),ctx);
 const api=vm.runInContext('createProtectedRooms(db,auth,transport,history)',ctx);
 return {...api,snapshot:async()=>{let value,error;const stop=api.watchRoom('optionsRoom',v=>value=v,e=>error=e);for(let i=0;i<15;i++)await new Promise(setImmediate);stop();if(error)throw error;return value;}};
}
function fresh(){const h=harness();for(const p of [1,2])h.put('freeAccounts/p'+p,{name:p===1?'A':'B',rating:1000,guest:false,games:0,active:'',lastSettled:''});return h;}
function archiveFunctions(h){
 const calc=vm.runInContext('calculate',h.ctx),stateFields=vm.runInContext('stateFields',h.ctx),ctx=vm.createContext({window:{AdvancedRules:A,SpecialRules:require('../advanced/special-rules.js')},calculateV1:calc,calculateV2:calc,stateFields});
 vm.runInContext(read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),ctx);return {build:vm.runInContext('buildHistory',ctx),replay:vm.runInContext('replayHistory',ctx),match:vm.runInContext('historyMatch',ctx)};
}
(async()=>{
 assert.deepEqual(R.normalize({mode:'advanced'}),{mode:'advanced',hp:10,initialGauge:8,maxGauge:10});
 for(const key of ['skills','special'])for(const v of [0,1,'false',[],{}])assert.throws(()=>R.normalize({mode:'advanced',[key]:v}));
 for(const skills of [false,true])for(const special of [false,true]){
  const options=R.normalize({mode:'advanced',skills,special});assert.equal(R.hasSkills(options),skills);assert.equal(R.hasSpecial(options),special);assert.equal(R.SPECIAL_MAX,30);
  const h=fresh(),host=protectedApi(h);await host.create(special?{...options,hp:15}:options);assert.deepEqual(h.get('friendRooms/optionsRoom/roomRules'),options);
  if(R.needsAdvancedOptions(options)){const unsupported=fresh();await assert.rejects(()=>protectedApi(unsupported,false).create(options),/対戦ルールを更新/);assert.equal(unsupported.get('friendRooms/optionsRoom'),null);}
  assert.throws(()=>h.commit({'friendRooms/optionsRoom/roomRules/skills':!skills},'p2'),/permission_denied/);
  assert.throws(()=>h.commit({'friendRooms/optionsRoom/roomRules/special':!special},'p2'),/permission_denied/);
  const joined=(await h.transports[0]({op:'friendJoin',roomId:'optionsRoom'})).match,id=joined.id,p='freeGames/'+id;
  assert.deepEqual(plain(joined.roomRules),options);assert.equal(!!h.get(p+'/special'),special);
  if(special){assert.deepEqual(plain(joined.special),{max:30,version:2,gauge:{1:0,2:0}});for(const value of [1,30,31,-1])assert.throws(()=>h.commit({[p+'/special/gauge/1']:value},'p1'),/permission_denied/);assert.throws(()=>h.commit({[p+'/special/max']:31},'p1'),/permission_denied/);}
  await h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2],...(skills?{advancedSkill:'boost'}:{})});
  const start=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2],...(skills?{advancedSkill:'heal'}:{})})).match;
  assert.equal(start.state.hp[1],special?12:10);assert.equal(start.state.hp[2],special?12:10);assert.equal(start.state.turn,1);assert.equal(start.skillWindow.endAt-start.skillWindow.startAt,skills?3000:0);assert.equal(start.opensAt-h.get(p+'/state/startedAt'),skills?9100:5600);
  assert.equal(R.normalize({mode:'advanced',special:true,hp:10}).hp,10,'legacy HP10 stays unchanged');assert.equal(start.state.gauge[1],8);assert.equal(!!h.get(p+'/advanced/selected'),skills);
  let latest=start;
  if(skills){h.setClock(start.skillWindow.startAt+1);latest=(await h.transports[0]({op:'advancedSkill',matchId:id,turn:1})).match;assert.equal(latest.advanced.current[1].used,1);}
  else{await assert.rejects(()=>h.transports[0]({op:'advancedSkill',matchId:id,turn:1}),/スキルを使用できません/);assert.equal(h.get(p+'/state/skillsExhausted'),true);}
  const spectator=await host.snapshot();assert.deepEqual(plain(spectator.battle.roomRules),options);assert.equal(!!spectator.battle.special,special);
  h.setClock(latest.opensAt);await h.transports[0]({op:'action',matchId:id,turn:1,action:skills?1:0});
  const next=(await h.transports[1]({op:'action',matchId:id,turn:1,action:1})).match;
  assert.equal(next.state.turn,2);assert.equal(next.skillWindow.endAt-next.skillWindow.startAt,skills?3000:0);if(special)assert.deepEqual(plain(next.special),{max:30,version:2,gauge:{1:skills?1:3,2:1}});
  if(!skills){assert.equal(next.state.skillsExhausted,true);assert.equal(next.state.gauge[1],10);assert.equal(next.state.gauge[2],7);}
  const closed=(await h.transports[0]({op:'resign',matchId:id})).match;assert(closed.closed);
  const archive=archiveFunctions(h),game=h.get(p),saved=plain(archive.build(id,game,{1:h.get('freeAccounts/p1'),2:h.get('freeAccounts/p2')}));
  assert.equal(archive.replay(saved).length,1);if(special)assert.deepEqual(saved.special,{max:30,version:2,gauge:{1:skills?1:3,2:1}});
  h.commit({['battleHistory/'+id]:saved,['playerHistory/p1/'+id]:saved.endedAt,['playerHistory/p2/'+id]:saved.endedAt},'p1');
  assert.equal(saved.roomRules.hp,special?12:10);const restored=archive.match({...saved,id},'p1',h.now());assert.deepEqual(plain(restored.roomRules),options);assert.equal(!!restored.special,special);
  console.log('PASS real room → join → battle → spectator → history: skills='+skills+', special='+special);
 }
 // A room cannot provide an invalid flag type or move the gauge's maximum.
 for(const overrides of [{skills:'false',special:true},{skills:false,special:1}]){const h=fresh();assert.throws(()=>h.commit({'friendRooms/bad':{host:'p2',name:'B',createdAt:h.now(),heartbeat:h.now(),game:'',roomRules:{mode:'advanced',hp:10,initialGauge:8,maxGauge:10,...overrides}}},'p2'),/permission_denied/);}
 // Previously saved HP10/HP15 special rooms still accept heartbeats, joining and starting.
 for(const legacyHp of [10,15]){
 const legacy=fresh(),legacyRules={mode:'advanced',hp:legacyHp,initialGauge:8,maxGauge:10,skills:false,special:true};
 legacy.put('friendRooms/optionsRoom',{host:'p2',name:'B',createdAt:legacy.now(),heartbeat:legacy.now(),game:'',roomRules:legacyRules});
 legacy.commit({'friendRooms/optionsRoom/heartbeat':legacy.now()},'p2');
 const legacyMatch=(await legacy.transports[0]({op:'friendJoin',roomId:'optionsRoom'})).match;
 assert.equal(legacyMatch.roomRules.hp,legacyHp);
 await legacy.transports[0]({op:'loadout',matchId:legacyMatch.id,loadout:[0,1,2]});
 const legacyStart=(await legacy.transports[1]({op:'loadout',matchId:legacyMatch.id,loadout:[0,1,2]})).match;
 assert.equal(legacyStart.state.hp[1],legacyHp);assert.equal(legacyStart.state.hp[2],legacyHp);
 }
 for(const [special,hp]of [[true,10],[true,15],[true,14],[true,16],[false,15]]){
  const invalid=fresh();assert.throws(()=>invalid.commit({'friendRooms/bad':{host:'p2',name:'B',createdAt:invalid.now(),heartbeat:invalid.now(),game:'',roomRules:{mode:'advanced',hp,initialGauge:8,maxGauge:10,skills:false,special}}},'p2'),/permission_denied/);
 }
 const oldHpRules=JSON.parse(read('firebase-database.rules.json')).rules;delete oldHpRules.freeGames.$game.advanced.specialHp12;
 assert.equal(await harness(oldHpRules).transports[0].supportsSpecialHp(),false,'detect unpublished HP12 rules');
 assert.equal(await harness(oldHpRules).transports[0].supportsSpecialHp(15),true,'legacy HP15 protocol stays available');
 const bytes=Buffer.byteLength(read('firebase-database.rules.json'));assert(bytes<256*1024);console.log('PASS immutable flags, versioned accumulating meter, protocol fallback and Firebase size: '+bytes+' bytes');
 const oldRules=JSON.parse(read('firebase-database.rules.json')).rules;delete oldRules.freeGames.$game.advanced.optionsV1;
 const old=harness(oldRules);assert.equal(await old.transports[0].supportsAdvancedOptions(),false,'the real transport detects an unpublished options protocol');
})().catch(e=>{console.error(e);process.exitCode=1;});
