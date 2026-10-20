const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness}=require('./rules-harness.cjs'),S=require('../advanced/special-rules.js'),A=require('../advanced/rules.js');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
function setup(version=3,gauge=0,hp=10){
 const h=harness(),p='freeGames/match';h.put(p+'/kind','friend');h.put(p+'/rulesVersion',3);h.put(p+'/roomRules',{mode:'advanced',hp,initialGauge:8,maxGauge:10,skills:false,special:true});
 h.put(p+'/special',{...S.initial(version),gauge:{1:gauge,2:gauge}});h.put(p+'/state',{turn:1,startedAt:0,hp1:hp,hp2:hp,gauge1:8,gauge2:8,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,skillsExhausted:true,...S.extraState()});h.setClock(5600);return {h,p};
}
(async()=>{
 assert.equal(S.definition(15).cost,12);assert.equal(S.definition(15,2).cost,8);
 assert.equal(S.definition(15).description,'攻撃同士の相殺に、一方的に打ち勝つ');assert.equal(S.definition(24).description,'奪うゲージの量+1');
 for(const [version,cost]of [[2,8],[3,12]])for(const side of [1,2]){
  const {h,p}=setup(version,cost-1);await assert.rejects(()=>h.transports[side-1]({op:'action',matchId:'match',turn:1,action:15}),/permission_denied/);
  h.put(p+'/special/gauge/'+side,cost);await h.transports[side-1]({op:'action',matchId:'match',turn:1,action:15});const m=(await h.transports[2-side]({op:'action',matchId:'match',turn:1,action:2})).match;
  assert.equal(m.special.gauge[side],1);assert.equal(h.get(p+'/transition/specialCost'+side),cost);assert.equal(m.state.hp[3-side],8);
 }
 for(const [version,hp]of [[2,12],[2,15],[3,10]]){
  const {h,p}=setup(version,0,hp);let m=(await h.transports[0]({op:'status',matchId:'match'})).match;
  for(let turn=1;turn<=13;turn++){h.setClock(m.opensAt);const actions=turn===13?[15,2]:[1,2].map(p=>m.state.gauge[p]<10?0:1);await h.transports[0]({op:'action',matchId:'match',turn,action:actions[0]});m=(await h.transports[1]({op:'action',matchId:'match',turn,action:actions[1]})).match;}
  await h.transports[0]({op:'resign',matchId:'match'});
  const ctx=vm.createContext({window:{SpecialRules:S,AdvancedRules:A},calculateV1:vm.runInContext('calculate',h.ctx),calculateV2:vm.runInContext('calculate',h.ctx),stateFields:vm.runInContext('stateFields',h.ctx)});vm.runInContext(read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),ctx);
  const saved=plain(vm.runInContext('buildHistory',ctx)('match',h.get(p),{1:h.get('freeAccounts/p1'),2:h.get('freeAccounts/p2')})),replay=vm.runInContext('replayHistory',ctx)(saved);
  assert.equal(replay.length,13);assert.equal(saved.special.version,version);assert.equal(saved.roomRules.hp,hp);assert.equal(replay.at(-1).special.after[1],saved.special.gauge[1]);h.commit({'battleHistory/match':saved,'playerHistory/p1/match':saved.endedAt,'playerHistory/p2/match':saved.endedAt},'p1');
 }
 console.log('PASS exact 12/8 cost boundaries on both sides and HP10/12/15 versioned battle history');
})().catch(e=>{console.error(e);process.exitCode=1;});
