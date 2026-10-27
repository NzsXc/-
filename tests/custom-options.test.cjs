const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {harness}=require('./rules-harness.cjs'),R=require('../room-rules.js'),A=require('../advanced/rules.js');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
function protectedApi(h,supported=true){
 const transport=async data=>h.transports[1](data);transport.supportsCustomOptions=async()=>supported;transport.supportsRoomRules=async()=>true;transport.supportsAdvanced=async()=>true;transport.supportsAdvancedOptions=async()=>supported;transport.supportsSpecialGauge=async()=>true;transport.supportsSpecialHp=async()=>supported;transport.supportsSpecialMoves=async()=>supported;transport.supportsSpecialExpansion=async()=>supported;transport.supportsSpecialCompletion=async()=>supported;
 const ctx=vm.createContext({window:{BattleV4:require('../combat-v4.js'),SpecialRules:require('../advanced/special-rules.js'),AdvancedRules:require('../advanced/rules.js'),RoomRules:R,AdvancedRules:A,BattleAI:require('../bot-engine.js')},console,Date:{now:h.now},
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
 const calc=vm.runInContext('calculate',h.ctx),stateFields=vm.runInContext('stateFields',h.ctx),ctx=vm.createContext({window:{BattleV4:require('../combat-v4.js'),SpecialRules:require('../advanced/special-rules.js'),AdvancedRules:require('../advanced/rules.js'),AdvancedRules:A,SpecialRules:require('../advanced/special-rules.js')},calculateV1:calc,calculateV2:calc,stateFields});
 vm.runInContext(read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),ctx);return {build:vm.runInContext('buildHistory',ctx),replay:vm.runInContext('replayHistory',ctx),match:vm.runInContext('historyMatch',ctx)};
}
(async()=>{
 for(const skills of [false,true])for(const special of [false,true])for(const [hp,initialGauge,maxGauge]of [[15,3,6],[40,8,20],[100,99,100],[1,1,1]]){
  const options=R.normalize({mode:'custom',hp,initialGauge,maxGauge,skills,special}),enhanced=skills||special;
  assert.equal(R.hasSkills(options),skills);assert.equal(R.hasSpecial(options),special);assert.equal(A.isAdvanced(options),enhanced);
  const h=fresh(),host=protectedApi(h);await host.create(options);assert.deepEqual(h.get('friendRooms/optionsRoom/roomRules'),options);
  if(enhanced){const unsupported=fresh();await assert.rejects(()=>protectedApi(unsupported,false).create(options),/対戦ルールを更新/);assert.equal(unsupported.get('friendRooms/optionsRoom'),null);}
  for(const key of ['skills','special','hp','maxGauge'])assert.throws(()=>h.commit({['friendRooms/optionsRoom/roomRules/'+key]:key==='hp'||key==='maxGauge'?50:!options[key]},'p2'),/permission_denied/);
  const joined=(await h.transports[0]({op:'friendJoin',roomId:'optionsRoom'})).match,id=joined.id,p='freeGames/'+id;
  assert.deepEqual(plain(joined.roomRules),options);assert.equal(!!h.get(p+'/special'),special);
  await h.transports[0]({op:'loadout',matchId:id,loadout:[0,4,10],...(skills?{advancedSkill:'boost'}:{})});
  let latest=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,4,10],...(skills?{advancedSkill:'heal'}:{})})).match;
  assert.equal(latest.state.hp[1],hp);assert.equal(latest.state.gauge[1],initialGauge);
  if(enhanced)assert.equal(latest.skillWindow.endAt-latest.skillWindow.startAt,skills?3000:0);
  if(skills){h.setClock(latest.skillWindow.startAt+1);latest=(await h.transports[0]({op:'advancedSkill',matchId:id,turn:1})).match;assert.equal(A.preview(h.get(p+'/state'),h.get(p+'/advanced/selected'),A.forTurn(h.get(p+'/advanced'),1),options).gauge1,Math.min(maxGauge,initialGauge+2));}
  else await assert.rejects(()=>h.transports[0]({op:'advancedSkill',matchId:id,turn:1}),/スキルを使用できません/);
  const spectator=await host.snapshot();assert.deepEqual(plain(spectator.battle.roomRules),options);assert.equal(!!spectator.battle.special,special);
  h.setClock(latest.opensAt);await h.transports[0]({op:'action',matchId:id,turn:1,action:1});
  const next=(await h.transports[1]({op:'action',matchId:id,turn:1,action:1})).match;
  assert.equal(next.state.turn,2);assert.equal(next.state.gauge[1],(skills?Math.min(maxGauge,initialGauge+2):initialGauge)-1);assert.equal(next.state.hp[1],hp);
  if(special)assert.deepEqual(plain(next.special),{max:30,version:require('../advanced/special-rules.js').MOVE_VERSION,gauge:{1:1,2:1}});
  const closed=(await h.transports[0]({op:'resign',matchId:id})).match;assert(closed.closed);
  const archive=archiveFunctions(h),saved=plain(archive.build(id,h.get(p),{1:h.get('freeAccounts/p1'),2:h.get('freeAccounts/p2')}));
  assert.equal(archive.replay(saved).length,1);h.commit({['battleHistory/'+id]:saved,['playerHistory/p1/'+id]:saved.endedAt,['playerHistory/p2/'+id]:saved.endedAt},'p1');
  const restored=archive.match({...saved,id},'p1',h.now());assert.deepEqual(plain(restored.roomRules),options);assert.equal(!!restored.special,special);assert.equal(saved.roomRules.hp,hp);
  console.log('PASS Custom room → battle → spectator → history '+JSON.stringify(options));
 }
 for(const key of ['skills','special'])for(const v of [0,1,'false',[],{}])assert.throws(()=>R.normalize({mode:'custom',hp:10,initialGauge:8,maxGauge:10,[key]:v}));
 const oldRules=JSON.parse(read('firebase-database.rules.json')).rules;delete oldRules.freeGames.$game.advanced.customOptionsV1;
 assert.equal(await harness(oldRules).transports[0].supportsCustomOptions(),false);
 console.log('PASS invalid types and unpublished Custom protocol detection');
})().catch(e=>{console.error(e);process.exitCode=1;});
