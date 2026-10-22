const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {harness,evaluate}=require('./rules-harness.cjs'),A=require('../advanced/rules.js'),S=require('../advanced/special-rules.js');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
const calc=vm.runInNewContext(read('free-calculator.js').replaceAll('export ','')+'\ncalculate');
const initial={turn:1,startedAt:0,hp1:10,hp2:10,gauge1:8,gauge2:8,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0};
const rules=JSON.parse(read('firebase-database.rules.json')).rules;
for(const version of [2,3])for(const flag of [false,true])for(const side of [1,2])for(const defense of version===3?[7,19]:[7])for(const attack of [1,3,5,8,...(version===3?[15,17,20]:[])]){
 const other=3-side,state={...initial,...(version===3?S.extraState():{}),enhance1:1,enhance2:1},moves={[side]:defense,[other]:attack};
 const roomRules=version===3?{mode:'advanced',hp:10,initialGauge:8,maxGauge:10,skills:false,special:true}:{};
 const result=calc(state,moves,version,roomRules, {},flag);
 assert.equal(result['damage'+side],!flag&&[3,15].includes(attack)?3:0);
 assert.equal(result['damage'+other],0,'shield never reflects damage');
 assert.equal(result['gauge'+side],(defense===19?10:7)-(attack===5||attack===17?1:0),'cost and Punish drain unchanged');
 const before={freeGames:{match:{rulesVersion:version,...(version===3?{roomRules,special:S.initial(3)}:{}),...(flag?{foresightShield:true}:{}),state,moves:{1:moves}}}},after=structuredClone(before);
 after.freeGames.match.transition=JSON.parse(JSON.stringify(result));after.freeGames.match.state={...state,...result};
 assert(evaluate(rules.freeGames.$game.transition['.validate'],before,after,'freeGames/match/transition','p1',9000,{$game:'match'}),'rules match '+[version,flag,side,attack]);
 if(flag&&[3,15].includes(attack)){
  after.freeGames.match.transition['damage'+side]=3;
  assert(!evaluate(rules.freeGames.$game.transition['.validate'],before,after,'freeGames/match/transition','p1',9000,{$game:'match'}),'rules reject pierced shield');
 }
}
for(const side of [1,2]){
 const other=3-side,moves={[side]:7,[other]:3};
 assert.equal(calc({...initial,['seal'+side]:true},moves,2,{}, {},true)['damage'+side],2,'seal still disables shield');
 assert.equal(calc(initial,{[side]:2,[other]:3},2,{}, {},true)['damage'+side],2,'normal block is still pierced');
 assert.equal(calc(initial,{[side]:7,[other]:0},2,{}, {},true)['gauge'+side],10,'charge prediction still adds three');
 assert.equal(calc(initial,{[side]:14,[other]:7},2,{}, {},true)['gauge'+side],6,'Mirror keeps its own cost');
 const ctx=vm.createContext({window:{AdvancedRules:A,SpecialRules:S},calculateV1:calc,calculateV2:calc,stateFields:Object.keys(initial)});
 vm.runInContext(read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),ctx);
 for(const flag of [false,true]){
  const result=calc(initial,moves,2,{}, {},flag),g={rulesVersion:2,...(flag?{foresightShield:true}:{}),state:{...Object.fromEntries(Object.keys(initial).map(k=>[k,result[k]??initial[k]])),startedAt:9000},createdAt:0,players:{1:'p1',2:'p2'},moves:{1:moves},settled:{at:12000,winner:1}};
  const history=vm.runInContext('buildHistory',ctx)('match',g,{}),turns=vm.runInContext('replayHistory',ctx)(history);
  assert.equal(turns[0].damage[side],flag?0:2,'new and old histories replay their own shield rule');
 }
}
(async()=>{
 const h=harness();h.put('freeGames/match/foresightShield',true);h.put('freeGames/match/rulesVersion',2);h.put('freeGames/match/loadouts',{1:[0,4,11],2:[0,4,11]});h.put('freeGames/match/moves/1',{1:3,2:7});h.setClock(9000);
 const match=(await h.transports[0]({op:'status',matchId:'match'})).match;
 assert.equal(match.foresightShield,true);assert.equal(match.state.hp[2],10);assert.equal(h.denials.length,0);
 h.setClock(match.opensAt);
 for(const action of [2,7])await assert.rejects(h.transports[1]({op:'action',matchId:'match',turn:2,action}),/permission_denied/,'block and foresight still share their usage restriction');
 assert.throws(()=>h.commit({'freeGames/match/foresightShield':true},'p1'),/permission_denied/,'cannot enable during a match');
 await h.transports[0]({op:'resign',matchId:'match'});
 const historyContext=vm.createContext({window:{AdvancedRules:A,SpecialRules:S},calculateV1:calc,calculateV2:calc,stateFields:Object.keys(initial)});
 vm.runInContext(read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),historyContext);
 const saved=JSON.parse(JSON.stringify(vm.runInContext('buildHistory',historyContext)('match',h.get('freeGames/match'),{})));
 assert.equal(saved.foresightShield,true);
 const forged={...saved};delete forged.foresightShield;
 assert.throws(()=>h.commit({'battleHistory/match':forged,'playerHistory/p1/match':saved.endedAt,'playerHistory/p2/match':saved.endedAt},'p1'),/permission_denied/,'history cannot omit the rule flag');
 h.commit({'battleHistory/match':saved,'playerHistory/p1/match':saved.endedAt,'playerHistory/p2/match':saved.endedAt},'p1');
 const legacyRules=structuredClone(rules);delete legacyRules.freeGames.$game.foresightShield;
 const old=harness(legacyRules);old.put('freeGames/match/rulesVersion',2);old.put('freeGames/match/moves/1',{1:3,2:7});old.setClock(9000);
 const oldMatch=(await old.transports[0]({op:'status',matchId:'match'})).match;
 assert.equal(oldMatch.state.hp[2],8);assert.equal(old.denials.length,0,'unpublished rules keep matches usable');
 const joined=harness();for(const p of [1,2]){joined.put('freeAccounts/p'+p,{name:'P'+p,rating:1000,active:'',guest:false,games:0,lastSettled:''});joined.put('freeQueue/p'+p,{joinedAt:joined.now(),heartbeat:joined.now()});}
 const fresh=(await joined.transports[0]({op:'join'})).match;
 assert.equal(joined.get('freeGames/'+fresh.id+'/foresightShield'),true,'new matches opt into the shield rule');
 console.log('PASS: Standard/S attacks, both sides, seal, no reflection, charge reward, Mirror, exact rules, old/new history, transport, consecutive restriction, immutable flag and legacy rollout');
})().catch(e=>{console.error(e);process.exitCode=1;});
