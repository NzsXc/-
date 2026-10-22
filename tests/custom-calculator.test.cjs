const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {harness,evaluate}=require('./rules-harness.cjs'),A=require('../advanced/rules.js'),S=require('../advanced/special-rules.js');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),rules=JSON.parse(read('firebase-database.rules.json')).rules,plain=x=>JSON.parse(JSON.stringify(x));
const calculate=vm.runInNewContext(read('free-calculator.js').replaceAll('export ','')+'\ncalculate');
function state(hp,max){return {turn:1,startedAt:0,hp1:hp-1,hp2:hp,gauge1:max-1,gauge2:max,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,...S.extraState()};}
let cases=0;
for(const [hp,maxGauge]of [[1,1],[15,6],[40,20],[100,100]])for(const skills of [false,true]){
 const settings={mode:'custom',hp,initialGauge:maxGauge,maxGauge,skills,special:true};
 const advanced=skills?{selected:{1:'boost',2:'heal'},current:{1:{id:'boost',turn:1},2:{id:'heal',turn:1}}}:{};
 const s=state(hp,maxGauge);
 for(let x=0;x<=26;x++)for(let y=0;y<=26;y++){
  const moves={1:x,2:y},result=plain(A.resolve(s,moves,advanced.selected,A.forTurn(advanced,1),calculate,settings));
  const game={kind:'friend',rulesVersion:3,roomRules:settings,state:s,advanced,special:{...S.initial(3),gauge:{1:30,2:30}},moves:{1:moves}},before={freeGames:{match:game}},after=structuredClone(before);
  after.freeGames.match.transition=result;after.freeGames.match.state={...s,...result};
  assert(evaluate(rules.freeGames.$game.transition['.validate'],before,after,'freeGames/match/transition','p1',10000,{$game:'match'}),'Custom formula '+JSON.stringify({hp,maxGauge,skills,x,y}));
  assert(result.gauge1>=0&&result.gauge1<=maxGauge);assert(result.hp1<=hp);cases++;
 }
 // A missing move defaults to attack only at the configured maximum.
 const moves={},result=plain(A.resolve(s,moves,advanced.selected,A.forTurn(advanced,1),calculate,settings)),before={freeGames:{match:{rulesVersion:3,roomRules:settings,state:s,advanced,special:S.initial(3)}}},after=structuredClone(before);
 after.freeGames.match.transition=result;after.freeGames.match.state={...s,...result};
 assert(evaluate(rules.freeGames.$game.transition['.validate'],before,after,'freeGames/match/transition','p1',10000,{$game:'match'}),'Custom timeout');
}
(async()=>{
 for(const maxGauge of [1,6,20,100]){
  const h=harness(),p='freeGames/match',settings={mode:'custom',hp:20,initialGauge:maxGauge,maxGauge,skills:false,special:true};
  h.put(p+'/kind','friend');h.put(p+'/roomRules',settings);h.put(p+'/rulesVersion',3);h.put(p+'/special',{...S.initial(3),gauge:{1:30,2:30}});h.put(p+'/foresightShield',true);
  h.put(p+'/state',{...state(20,maxGauge),hp1:20,gauge1:maxGauge,skillsExhausted:true});for(const side of [1,2])h.put(p+'/loadouts/'+side,[0,4,10]);
  h.setClock(5600);await assert.rejects(()=>h.transports[0]({op:'action',matchId:'match',turn:1,action:0}),/permission_denied/);
  await h.transports[0]({op:'action',matchId:'match',turn:1,action:19});
  const m=(await h.transports[1]({op:'action',matchId:'match',turn:1,action:maxGauge>=4?15:1})).match;
  assert.equal(m.state.hp[1],20);assert(m.state.gauge[1]<=maxGauge);assert.equal(m.state.turn,2);assert(m.special.gauge[1]<30);
 }
 console.log('PASS '+cases+' Custom skill/S action pairs, configurable HP/gauge caps, timeout defaults, full-gauge charge rejection and S Foresight transport');
})().catch(e=>{console.error(e);process.exitCode=1;});
