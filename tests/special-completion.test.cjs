const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {harness,Snapshot}=require('./rules-harness.cjs'),V=require('../combat-v4.js'),S=require('../advanced/special-rules.js');
const read=f=>fs.readFileSync(path.resolve(__dirname,'..',f),'utf8');
const settings={mode:'advanced',hp:10,initialGauge:8,maxGauge:10,skills:false,special:true};
const seed=()=>({turn:1,startedAt:0,hp1:4,hp2:7,gauge1:3,gauge2:8,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,skillsExhausted:true,...S.extraState(),...V.extraState(),...V.extraSpecialState()});
const run=(a,b,state={},version=5,extra={})=>V.calculate({...seed(),...state},{1:a,2:b},4,{...settings,specialVersion:version,...extra},{},true);
assert.equal(S.definition(34).cost,6);assert.equal(S.definition(35).cost,8);assert.equal(S.definition(34,4).cost,0);assert.equal(S.definition(35,4).cost,0);
for(const side of [1,2]){
 const q=3-side,pair=(a,b)=>side===1?[a,b]:[b,a],k=name=>name+side;
 let r=run(...pair(34,0),{[k('gauge')]:2});assert.equal(r[k('gain')],5);assert.equal(r[k('gauge')],7);
 r=run(...pair(34,1));assert.equal(r[k('gain')],0);
 r=run(...pair(27,0));assert.equal(r[k('gain')],3);
 r=run(...pair(34,0),{},4);assert.equal(r[k('gain')],3);assert.equal(r[k('specialCost')],0);
 r=run(...pair(34,0),{[k('gauge')]:9});assert.equal(r[k('gauge')],10);
 r=run(...pair(35,36),{[k('hp')]:3});assert.equal(r[k('damage')],4);assert.equal(r[k('recoveredAttack')],4);assert.equal(r[k('hp')],3,'lethal attack is immediately recovered, preserving pre-existing missing HP');assert.equal(r[k('gain')],5);
 r=run(...pair(35,0),{[k('hp')]:3});assert.equal(r[k('hp')],3);assert.equal(r[k('recoveredAttack')],0,'no attack never heals old damage');
 r=run(...pair(35,36),{[k('hp')]:3,[k('poison')]:2});assert.equal(r[k('damage')],5);assert.equal(r[k('recoveredAttack')],4);assert.equal(r[k('hp')],2,'poison damage remains');
 r=run(...pair(35,36),{[k('hp')]:1,[k('poison')]:1});assert.equal(r[k('hp')],0,'poison can still defeat S Convert');
 r=run(...pair(28,36),{[k('hp')]:3});assert.equal(r[k('hp')],0,'normal Convert still receives damage');
 r=run(...pair(35,36),{[k('hp')]:3},4);assert.equal(r[k('hp')],0,'S version 4 keeps its original Convert');
 r=run(...pair(14,35));assert.equal(r[k('skill')],'tech14');assert.equal(r[k('recoveredAttack')],0,'Mirror can copy S Convert, but no attack means no healing');
}
// Match actual server expressions for all pairs under both saved and new S protocols.
const rules=JSON.parse(read('firebase-database.rules.json')).rules,validation=new vm.Script('('+rules.freeGames.$game.transition['.validate']+')');
let cases=0;
for(const version of [4,5])for(let a=0;a<=40;a++)for(let b=0;b<=40;b++){
 const state={...seed(),hp1:2+a%7,hp2:1+b%8,enhance1:a%3,weaken2:b%3,poison1:a%3},moves={1:a,2:b},result=run(a,b,state,version);
 const before={freeGames:{match:{rulesVersion:4,roomRules:settings,foresightShield:true,special:{...S.initial(version),gauge:{1:30,2:30}},state,moves:{1:moves}}}},after=structuredClone(before);
 after.freeGames.match.transition=result;after.freeGames.match.state={...state,...result};
 const ctx=vm.createContext({root:new Snapshot(before),data:new Snapshot(before,'freeGames/match/transition'),newData:new Snapshot(after,'freeGames/match/transition'),$game:'match'});
 assert(validation.runInContext(ctx),'S version '+version+' actions '+a+'/'+b);cases++;
}
// HP is restored on the impact frame, never healed above the pre-hit value.
const timeline=vm.createContext({window:{}});vm.runInContext(read('battle-timeline.js'),timeline);
for(const side of [1,2]){
 const q=3-side,out=run(...(side===1?[35,36]:[36,35]),{['hp'+side]:2,['poison'+side]:1});
 const raw=[1,2].map(p=>({type:p===side?'convert':'attack',kind:p===side?'convert':'blast',cost:1,special:true,specialCost:p===side?8:10}));
 const view=timeline.window.BattleResources.begin({before:{hp:{1:side===1?2:4,2:side===2?2:4},gauge:{1:3,2:8},special:{1:20,2:20}},after:{hp:{1:out.hp1,2:out.hp2},gauge:{1:out.gauge1,2:out.gauge2}},outcome:out,actions:raw,rawActions:raw,damage:[out.damage1,out.damage2],impacts:[{side,at:440}]});
 view.tick(439);assert.equal(view.current().hp[side],2);view.tick(440);assert.equal(view.current().hp[side],1);view.tick(440);assert.equal(view.current().hp[side],1,'repeat frame cannot recover twice');view.cancel();
}
console.log('PASS S Focus / S Convert: missing HP unchanged, lethal attack recovery, poison preserved, normal/old versions, instant HP frames, and '+cases+' rule-validated pairs');
function setup(index,cost){const h=harness(),p='freeGames/match';h.put(p+'/kind','friend');h.put(p+'/rulesVersion',4);h.put(p+'/roomRules',settings);h.put(p+'/special',{...S.initial(5),gauge:{1:cost,2:cost}});h.put(p+'/state',{...seed(),hp1:10,hp2:10,gauge1:8,gauge2:8});for(const side of [1,2])h.put(p+'/loadouts/'+side,[index,14,18]);h.setClock(5600);return {h,p};}
(async()=>{
 for(const[id,cost,index]of [[34,6,12],[35,8,13]])for(const side of [1,2]){
  const {h,p}=setup(index,cost-1);await assert.rejects(()=>h.transports[side-1]({op:'action',matchId:'match',turn:1,action:id}),/permission_denied/);
  h.put(p+'/special/gauge/'+side,cost);await h.transports[side-1]({op:'action',matchId:'match',turn:1,action:id});const result=(await h.transports[2-side]({op:'action',matchId:'match',turn:1,action:1})).match;
  assert.equal(result.state.turn,2);assert.equal(h.get(p+'/transition/specialCost'+side),cost);
  if(id===35){assert.equal(result.state.hp[side],10);assert.equal(result.special.gauge[side],2,'received attack still builds S gauge');assert.equal(result.reveal.resources.outcome['recoveredAttack'+side],1);}
 }
 const unsupported=structuredClone(rules);delete unsupported.freeGames.$game.advanced.specialMovesV4;assert.equal(await harness(unsupported).transports[0].supportsSpecialCompletion(),false);
 console.log('PASS S6/S8 boundaries on both players, complete transport, recovery outcome and unsupported rules');
 for(const id of [34,35]){
  const {h,p}=setup(id===34?12:13,0);let current=(await h.transports[0]({op:'status',matchId:'match'})).match;
  for(let turn=1;turn<=23;turn++){
   h.setClock(current.opensAt);const moves=[1,2].map(side=>current.state.gauge[side]>=10?1:0);if(turn===21){moves[0]=id;if(id===35)moves[1]=1;}
   await h.transports[0]({op:'action',matchId:'match',turn,action:moves[0]});current=(await h.transports[1]({op:'action',matchId:'match',turn,action:moves[1]})).match;
  }
  await h.transports[0]({op:'resign',matchId:'match'});
  const c=vm.createContext({window:{BattleV4:V,SpecialRules:S,AdvancedRules:require('../advanced/rules.js')},calculateV1:vm.runInContext('calculate',h.ctx),calculateV2:vm.runInContext('calculate',h.ctx),stateFields:vm.runInContext('stateFields',h.ctx)});
  vm.runInContext(read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),c);
  const saved=JSON.parse(JSON.stringify(vm.runInContext('buildHistory',c)('match',h.get(p),{1:h.get('freeAccounts/p1'),2:h.get('freeAccounts/p2')})));
  assert.equal(saved.special.version,5);assert.equal(vm.runInContext('replayHistory',c)(saved).length,23);
  h.commit({'battleHistory/match':saved,'playerHistory/p1/match':saved.endedAt,'playerHistory/p2/match':saved.endedAt},'p1');
 }
 console.log('PASS both S version 5 moves: 23-turn history replay and validated archive writes');

})().catch(e=>{console.error(e);process.exitCode=1;});
