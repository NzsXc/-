const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const {harness,Snapshot}=require('./rules-harness.cjs'),R=require('../room-rules.js'),M=require('../match-modes.js'),V=require('../combat-v4.js'),S=require('../advanced/special-rules.js');
const plain=x=>JSON.parse(JSON.stringify(x)),custom=extra=>R.normalize({mode:'custom',hp:20,initialGauge:10,maxGauge:10,...extra});
assert.throws(()=>custom({classic:true,skills:true}));assert.throws(()=>custom({classic:true,special:true}));assert.throws(()=>custom({classic:true,draft:true}));
assert.deepEqual(M.order(1),[1,2,2,1,1,2]);assert.deepEqual(M.order(2),[2,1,1,2,2,1]);
const rules=JSON.parse(fs.readFileSync('firebase-database.rules.json')).rules,validation=new vm.Script('('+rules.freeGames.$game.transition['.validate']+')');
for(const a of [0,1,2,3,4,5])for(const b of [0,1,2,3,4,5]){
 const state={turn:1,startedAt:0,hp1:20,hp2:20,gauge1:10,gauge2:10,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,...V.extraState(),...S.extraState()},config=custom({classic:true}),moves={1:a,2:b},out=V.calculate(state,moves,4,config,{},true);
 const before={freeGames:{match:{rulesVersion:4,roomRules:config,state,moves:{1:moves},foresightShield:true}}},after=structuredClone(before);after.freeGames.match.transition=out;after.freeGames.match.state={...state,...out};assert(validation.runInNewContext({root:new Snapshot(before),data:new Snapshot(before,'freeGames/match/transition'),newData:new Snapshot(after,'freeGames/match/transition'),$game:'match'}),'Classic pair '+a+'/'+b);
 if(a===3&&b===2)assert.equal(out.damage2,2);if(a===5&&b===0){assert.equal(out.damage2,4);assert.equal(out.gauge2,10,'Classic Punish has no separate gauge reduction');}
}
function fresh(options){const h=harness();h.ctx.window.MatchModes=M;for(const p of [1,2])h.put('freeAccounts/p'+p,{name:'P'+p,guest:false,rating:1000,games:0,active:'',lastSettled:''});h.put('friendRooms/room',{host:'p2',name:'P2',createdAt:0,heartbeat:h.now(),game:'',roomRules:options});return h;}
(async()=>{
 {
 const h=fresh(custom({classic:true}));let m=(await h.transports[0]({op:'friendJoin',roomId:'room'})).match,id=m.id;
 await assert.rejects(()=>h.transports[0]({op:'loadout',matchId:id,loadout:[1,2,3]}),/固定/);
 await h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2]});m=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2]})).match;
 for(let turn=1;turn<=2;turn++){h.setClock(m.opensAt);await h.transports[0]({op:'action',matchId:id,turn,action:4});m=(await h.transports[1]({op:'action',matchId:id,turn,action:1})).match;assert.equal(m.state.hp[1],20);assert.equal(m.state.hp[2],20-turn,'Classic Counter works on consecutive turns');}
 const closed=(await h.transports[0]({op:'resign',matchId:id})).match;assert(closed.closed);
 const context=vm.createContext({window:{BattleV4:V,SpecialRules:S,AdvancedRules:require('../advanced/rules.js')},calculateV1:vm.runInContext('calculate',h.ctx),calculateV2:vm.runInContext('calculate',h.ctx),stateFields:vm.runInContext('stateFields',h.ctx)});
 vm.runInContext(fs.readFileSync('battle-history-core.js','utf8').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),context);
 context.game=id;context.saved=h.get('freeGames/'+id);context.accounts={1:h.get('freeAccounts/p1'),2:h.get('freeAccounts/p2')};const history=vm.runInContext('buildHistory(game,saved,accounts)',context);context.history=history;assert.equal(vm.runInContext('replayHistory(history).length',context),2);h.commit({['battleHistory/'+id]:history,['playerHistory/p1/'+id]:history.endedAt,['playerHistory/p2/'+id]:history.endedAt},'p1');
 console.log('PASS Classic fixed loadouts and both consecutive counter turns through actual transport/rules');
 }
 for(const first of [1,2]){
 const h=fresh(custom({draft:true}));let m=(await h.transports[0]({op:'friendJoin',roomId:'room'})).match,id=m.id,path='freeGames/'+id;
 h.put(path+'/draft/first',first);m=(await h.transports[0]({op:'status',matchId:id})).match;assert(m.draft);
 for(let step=0;step<6;step++){
  const owner=M.order(first)[step],other=3-owner,view=M.view(m.draft,h.now());h.setClock(view.deadline-1000);
  await assert.rejects(()=>h.transports[other-1]({op:'draftPick',matchId:id,step,tech:step}),/相手/);
  if(step===2){h.setClock(view.deadline);m=(await h.transports[other-1]({op:'status',matchId:id})).match;assert.equal(m.draft.picks[step].automatic,true,'either participant can settle an expired pick');}
  else{const available=Array.from({length:19},(_,i)=>i).filter(i=>!M.view(m.draft).taken.includes(i));m=(await h.transports[owner-1]({op:'draftPick',matchId:id,step,tech:available[0]})).match;}
  assert.equal(M.view(m.draft).count,step+1);if(step<5)await assert.rejects(()=>h.transports[owner-1]({op:'draftPick',matchId:id,step:step+1,tech:m.draft.picks[0].tech}),/選べません|相手/);
 }
 const view=M.view(m.draft);assert.equal(m.deadline,h.get(path+'/createdAt')+150000);assert.equal(m.graceDeadline,h.get(path+'/createdAt')+180000);assert.equal(new Set(view.taken).size,6);assert.equal(view.loadouts[1].length,3);assert.equal(view.loadouts[2].length,3);
 await assert.rejects(()=>h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2]}),/ドラフト/).catch(e=>{if(JSON.stringify(view.loadouts[1])!=='[0,1,2]')throw e;});
 await h.transports[0]({op:'loadout',matchId:id,loadout:view.loadouts[1]});m=(await h.transports[1]({op:'loadout',matchId:id,loadout:view.loadouts[2]})).match;assert(m.state);assert.deepEqual(plain(m.loadouts),plain(view.loadouts));
 assert.throws(()=>h.commit({[path+'/draft/first']:3-first},'p1'),/permission_denied/);assert.throws(()=>h.commit({[path+'/draft/picks/0/tech']:18},'p1'),/permission_denied/);
 console.log('PASS Draft first='+first+': snake order, timeout, unique pool, ownership, immutable picks and battle start');
 }
 for(const skills of [false,true])for(const special of [false,true]){
  const options=custom({draft:true,skills,special}),h=fresh(options);let m=(await h.transports[0]({op:'friendJoin',roomId:'room'})).match,id=m.id;
  for(let step=0;step<6;step++){const view=M.view(m.draft,h.now());m=(await h.transports[view.player-1]({op:'draftPick',matchId:id,step,tech:step})).match;}
  const view=M.view(m.draft);await h.transports[0]({op:'loadout',matchId:id,loadout:view.loadouts[1],...(skills?{advancedSkill:'boost'}:{})});m=(await h.transports[1]({op:'loadout',matchId:id,loadout:view.loadouts[2],...(skills?{advancedSkill:'heal'}:{})})).match;
  assert(m.state);assert.equal(!!m.special,special);assert.equal(!!m.advanced,skills);assert.equal(m.state.hp[1],20);
  console.log('PASS Draft with skills='+skills+' special='+special+' through ready and initial state');
 }
 assert(fs.statSync('firebase-database.rules.json').size<256*1024,'rules fit Firebase limit');
})().catch(e=>{console.error(e);process.exitCode=1;});
