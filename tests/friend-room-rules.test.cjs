const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness,evaluate}=require('./rules-harness.cjs'),RoomRules=require('../room-rules.js');
const root=path.resolve(__dirname,'..'),source=file=>fs.readFileSync(path.join(root,file),'utf8'),plain=v=>JSON.parse(JSON.stringify(v));
const rules=JSON.parse(source('firebase-database.rules.json')).rules;
const calc=vm.runInNewContext(source('free-calculator.js').replaceAll('export ','')+'\ncalculate');
const custom={mode:'custom',hp:20,initialGauge:14,maxGauge:20};
function protectedApi(h,{supported=true}={}){
 const reads=[],writes=[],jobs=new Map();let timer=0;
 const get=async r=>{reads.push(r.p);assert(h.allowed('.read',r.p,'p2'));return {val:()=>structuredClone(h.get(r.p))};};
 const transport=data=>h.transports[1](data);transport.supportsRoomRules=async()=>supported;
 const context=vm.createContext({window:{RoomRules,BattleAI:require('../bot-engine.js')},console,Date:{now:h.now},
  ref:(_db,p)=>({p}),get,push:()=>({key:'testRoom'}),serverTimestamp:h.now,signInAnonymously:()=>assert.fail('already signed in'),
  set:async(r,v)=>{writes.push(r.p);h.commit({[r.p]:v},'p2');},
  update:async(r,patch)=>h.commit(Object.fromEntries(Object.entries(patch).map(([k,v])=>[r.p+'/'+k,v])),'p2'),
  remove:async r=>h.commit({[r.p]:null},'p2'),
  onValue(r,callback){if(r.p==='.info/serverTimeOffset')callback({val:()=>0});return ()=>{};},
  onDisconnect:()=>({remove:async()=>{},cancel:async()=>{}}),
  setInterval:()=>++timer,clearInterval(){},setTimeout:(fn,ms)=>{jobs.set(++timer,{fn,ms});return timer;},clearTimeout:id=>jobs.delete(id),
  db:{},auth:{currentUser:{uid:'p2'},authStateReady:async()=>{}},transport,
  history:{find:async id=>h.get('battleHistory/'+id)}
 });
 vm.runInContext(source('protected-rooms.js').replace(/^import[^\n]*\n/gm,'').replace('export function','function'),context);
 const api=vm.runInContext('createProtectedRooms(db,auth,transport,history)',context);
 async function snapshot(id){let value,error;const stop=api.watchRoom(id,v=>value=v,e=>error=e);for(let i=0;i<20;i++)await new Promise(setImmediate);stop();if(error)throw error;return plain(value);}
 return {api,reads,writes,snapshot};
}
function fresh(){const h=harness();for(const p of [1,2])h.put('freeAccounts/p'+p,{name:p===1?'A':'B',rating:1000,guest:false,games:0,active:'',lastSettled:''});return h;}
function historyApi(){
 const ctx=vm.createContext({calculateV1:calc,calculateV2:calc,stateFields:vm.runInNewContext(source('free-calculator.js').replaceAll('export ','')+'\nstateFields')});
 vm.runInContext(source('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),ctx);
 return {build:vm.runInContext('buildHistory',ctx),replay:vm.runInContext('replayHistory',ctx),match:vm.runInContext('historyMatch',ctx)};
}
(async()=>{
 assert.deepEqual(RoomRules.normalize(),{mode:'standard',hp:10,initialGauge:8,maxGauge:10});
 for(const bad of [{mode:'advanced'},{...custom,hp:0},{...custom,hp:101},{...custom,hp:1.5},{...custom,maxGauge:0},{...custom,maxGauge:101},{...custom,initialGauge:-1},{...custom,initialGauge:21}])assert.throws(()=>RoomRules.normalize(bad));
 const std=fresh(),standard=protectedApi(std,{supported:false});await standard.api.create();
 assert.equal(std.get('friendRooms/testRoom/roomRules'),null,'Standard keeps the existing room format');
 const old=fresh(),oldApi=protectedApi(old,{supported:false});await assert.rejects(()=>oldApi.api.create(custom),/まだ利用できません/);assert.deepEqual(oldApi.writes,[]);
 for(const bad of [{...custom,hp:0},{...custom,hp:101},{...custom,initialGauge:21},{...custom,maxGauge:0},{...custom,mode:'advanced'},{...custom,extra:true}]){
  const invalid=fresh();assert.throws(()=>invalid.commit({'friendRooms/invalid':{host:'p2',name:'B',createdAt:invalid.now(),heartbeat:invalid.now(),game:'',roomRules:bad}},'p2'),/permission_denied/,'database must reject invalid Custom settings');
 }
 const h=fresh(),host=protectedApi(h);await host.api.create(custom);
 assert.deepEqual(h.get('friendRooms/testRoom/roomRules'),custom);
 assert.throws(()=>h.commit({'friendRooms/testRoom/roomRules/hp':30},'p2'),/permission_denied/);
 assert.throws(()=>h.commit({'friendRooms/testRoom/roomRules':null},'p2'),/permission_denied/);
 // The actual friendJoin transport copies the host's immutable configuration.
 const joined=(await h.transports[0]({op:'friendJoin',roomId:'testRoom'})).match,id=joined.id;
 assert.deepEqual(h.get('freeGames/'+id+'/roomRules'),custom);assert.deepEqual(plain(joined.roomRules),custom);
 assert.throws(()=>h.commit({['freeGames/'+id+'/roomRules/hp']:30},'p1'),/permission_denied/);
 await h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2]});
 const start=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2]})).match;
 assert.equal(start.state.hp[1],20);assert.equal(start.state.hp[2],20);assert.equal(start.state.gauge[1],14);assert.equal(start.state.gauge[2],14);
 const seen=await host.snapshot('testRoom');assert.deepEqual(seen.battle.roomRules,custom);assert.equal(seen.battle.hp[1],20);
 assert(!host.reads.some(p=>/\/(moves|advance)(?:\/|$)/.test(p)));
 h.setClock(start.opensAt);await h.transports[0]({op:'action',matchId:id,turn:1,action:0});
 const turn=(await h.transports[1]({op:'action',matchId:id,turn:1,action:0})).match;
 assert.equal(turn.state.turn,2);assert.equal(turn.state.gauge[1],16);assert.equal(turn.state.hp[1],20);
 const closed=(await h.transports[0]({op:'resign',matchId:id})).match;assert(closed.closed);assert.equal(closed.rating.delta,0);
 const history=historyApi(),game=h.get('freeGames/'+id),saved=plain(history.build(id,game,{1:h.get('freeAccounts/p1'),2:h.get('freeAccounts/p2')}));
 assert.deepEqual(saved.roomRules,custom);assert.equal(history.replay(saved)[0].after.gauge[1],16);assert.equal(history.match({...saved,id},'p1',h.now()).roomRules.hp,20);
 h.commit({['battleHistory/'+id]:saved,['playerHistory/p1/'+id]:saved.endedAt,['playerHistory/p2/'+id]:saved.endedAt},'p1');
 const forged=structuredClone(saved);forged.roomRules.hp=10;
 const after=h.copy();after.battleHistory[id]=forged;
 assert(!h.evaluate(rules.battleHistory.$game.roomRules['.validate'],h.copy(),after,'battleHistory/'+id+'/roomRules','p1',{$game:id}));
 // Check every action pairing against the exact deterministic database validation.
 let cases=0;
 for(const settings of [custom,{mode:'custom',hp:5,initialGauge:0,maxGauge:3},{mode:'custom',hp:1,initialGauge:1,maxGauge:1}]){
  const initial={...h.get('freeGames/match/state'),turn:1,startedAt:0,hp1:settings.hp,hp2:settings.hp,gauge1:settings.initialGauge,gauge2:settings.initialGauge};
  for(let a=0;a<15;a++)for(let b=0;b<15;b++){
   const moves={1:a,2:b},result=calc(initial,moves,2,settings),before={freeGames:{match:{kind:'friend',rulesVersion:2,roomRules:settings,state:initial,moves:{1:moves}}}},after=structuredClone(before);
   after.freeGames.match.transition=plain(result);after.freeGames.match.state={...initial,...plain(result)};
   assert(evaluate(rules.freeGames.$game.transition['.validate'],before,after,'freeGames/match/transition','p1',9000,{$game:'match'}),JSON.stringify({settings,a,b,result}));
   assert(result.hp1<=settings.hp&&result.hp2<=settings.hp&&result.gauge1<=settings.maxGauge&&result.gauge2<=settings.maxGauge);cases++;
  }
 }
 // A forged participant cannot silently join a Custom lobby as Standard.
 const omitted=fresh(),omittedHost=protectedApi(omitted);await omittedHost.api.create(custom);
 const patch={'freeGames/forged/players':{1:'p1',2:'p2'},'freeGames/forged/kind':'friend','freeGames/forged/room':'testRoom','freeGames/forged/createdAt':omitted.now(),'freeAccounts/p1/active':'forged','freeAccounts/p2/active':'forged','friendRooms/testRoom/game':'forged'};
 assert.throws(()=>omitted.commit(patch,'p1'),/permission_denied/);
 // Input and timeout defaults follow the selected gauge cap, including caps above/below 10.
 const html=source('index.html'),limits=html.slice(html.indexOf('function battleLimits(){'),html.indexOf('function updateBattleUI(){'));
 const available=html.slice(html.indexOf('function isBattleActionAvailable('),html.indexOf('function chooseAction('));
 const input=vm.createContext({window:{},rankedActive:true,rankedMatch:{roomRules:custom},gameMode:'ranked',gauge:{1:14,2:14},blockSeal:{},lastAction:{}});
 vm.runInContext(limits+available,input);assert(vm.runInContext('isBattleActionAvailable(1,"charge",{type:"charge",cost:0})',input));
 input.gauge[1]=20;assert(!vm.runInContext('isBattleActionAvailable(1,"charge",{type:"charge",cost:0})',input));
 const ranked=source('ranked-client.js'),autoSource=ranked.slice(ranked.indexOf('function rankedAutoSelect(){'),ranked.indexOf('function rankedTick(){'));
 const defaults=[],auto=vm.createContext({performance:{now:()=>1000},rankedMatch:{id:'test',you:1,state:{turn:2,gauge:{1:14}},roomRules:custom,ownAction:null},rankedActive:true,rankedAnimating:false,rankedSending:false,rankedTurnClockKey:'test:2',rankedTurnDeadline:900,rankedAutoRetryAt:0,rankedScheduleAuto(){},rankedSubmitAction:(_m,id)=>defaults.push(id)});
 vm.runInContext(autoSource,auto);vm.runInContext('rankedAutoSelect()',auto);assert.equal(defaults.at(-1),0,'14/20 must still charge');
 auto.rankedMatch.state.gauge[1]=20;auto.rankedAutoRetryAt=0;vm.runInContext('rankedAutoSelect()',auto);assert.equal(defaults.at(-1),1,'20/20 defaults to attack');
 console.log('PASS: Standard compatibility, Custom validation/immutability, real create → join → loadout → turns → settlement/history, spectator metadata, forged joins and '+cases+' custom action-pair rule checks');
})().catch(error=>{console.error(error);process.exitCode=1;});
