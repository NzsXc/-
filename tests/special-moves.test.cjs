const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {harness,evaluate}=require('./rules-harness.cjs'),S=require('../advanced/special-rules.js'),A=require('../advanced/rules.js');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const rules=JSON.parse(read('firebase-database.rules.json')).rules,roomRules={mode:'advanced',hp:15,initialGauge:8,maxGauge:10,skills:false,special:true};
const calculate=vm.runInNewContext(read('free-calculator.js').replaceAll('export ','')+'\ncalculate');
const base=()=>({turn:1,startedAt:0,hp1:9,hp2:9,gauge1:8,gauge2:8,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,...S.extraState()});
const resolve=(a,b,extra={})=>plain(calculate({...base(),...extra},{1:a,2:b},3,roomRules));
assert.deepEqual(S.definitions.map(d=>d.cost),[8,8,8,12,12,8,12,12,16,8,4,6]);
assert.deepEqual([resolve(15,17).damage1,resolve(15,17).damage2],[0,2]);
assert.deepEqual([resolve(15,15).damage1,resolve(15,15).damage2],[0,0]);
assert.equal(resolve(16,1).damage2,2);assert.equal(resolve(17,0).damage2,3);assert.equal(resolve(17,9).damage2,5);assert.equal(resolve(17,2).damage2,0);assert.equal(resolve(17,0).gauge2,9);
assert.equal(resolve(18,2).hp1,11);assert.equal(resolve(18,2,{hp1:14}).hp1,15);
assert.equal(resolve(19,2,{gauge1:3}).gauge1,5);assert.equal(resolve(19,0,{gauge1:3}).gauge1,8);
let c=resolve(20,2);assert.equal(c.specialMomentum1,1);c=plain(calculate({...c,startedAt:0},{1:0,2:2},3,roomRules));assert.equal(c.specialMomentum1,1);c=plain(calculate(c,{1:8,2:0},3,roomRules));assert.equal(c.power1,2);assert.equal(c.specialMomentum1,0);
assert.equal(resolve(22,1).specialSeal2,2);assert.equal(resolve(21,2).specialGain1,15);assert.equal(resolve(21,2).damage1,2);assert.equal(resolve(23,2).enhance1,4);
assert.deepEqual([resolve(24,0).stolen1,resolve(24,0).gauge1,resolve(24,0).gauge2],[3,8,7]);assert.equal(resolve(24,2,{gauge2:1}).stolen1,1);
assert.equal(resolve(25,2).specialRuin2,3);assert.equal(resolve(0,2,{specialRuin1:3,ruin1:3,gauge1:3}).gauge1,4);assert.equal(resolve(0,2,{specialRuin1:3,ruin1:3}).damage1,1);
assert.equal(resolve(26,0,{gauge1:3,gauge2:3}).gauge1,5);assert.equal(resolve(26,6,{gauge1:3}).gauge1,1);
assert.equal(resolve(14,23).enhance1,4,'normal Mirror copies S effects');assert.equal(resolve(26,25).specialRuin2,3);assert.equal(resolve(26,26).effectBase1,-1);
assert.equal(S.advance({...S.initial(2),gauge:{1:12,2:0}},resolve(21,2)).gauge[1],18,'pay 12, gain 15+turn+self damage');
// Compare every S/base action pair with independently evaluated deployment rules.
let cases=0;
for(let x=0;x<=26;x++)for(let y=0;y<=26;y++){
 const s={...base(),enhance1:x%3,momentum2:!!(y%2),specialMomentum1:x%2,specialRuin1:x%4,ruin1:x%4,specialSeal1:1},moves={1:x,2:y};
 const result=plain(calculate(s,moves,3,roomRules)),game={kind:'friend',rulesVersion:3,roomRules,state:s,special:{...S.initial(2),gauge:{1:30,2:30}},moves:{1:moves}};
 const before={freeGames:{match:game}},after=structuredClone(before);after.freeGames.match.transition=result;after.freeGames.match.state={...s,...result};
 assert(evaluate(rules.freeGames.$game.transition['.validate'],before,after,'freeGames/match/transition','p1',10000,{$game:'match'}),`pair ${x}/${y}: ${JSON.stringify(result)}`);cases++;
}
// Skills apply before S moves, with their receipts and temporary stance bonus.
for(const a of A.SKILLS)for(const b of A.SKILLS)for(const pair of [[25,0],[15,17],[14,23],[26,21],[18,19],[20,24]]){
 const state={...base(),seal1:true,ruin1:2,specialSeal1:2,specialRuin1:2},advanced={selected:{1:a.id,2:b.id},current:{1:{id:a.id,turn:1},2:{id:b.id,turn:1}}},settings={...roomRules,skills:true},moves={1:pair[0],2:pair[1]};
 const result=plain(A.resolve(state,moves,advanced.selected,A.forTurn(advanced,1),calculate,settings));const before={freeGames:{match:{rulesVersion:3,roomRules:settings,state,advanced,moves:{1:moves}}}},after=structuredClone(before);after.freeGames.match.transition=result;after.freeGames.match.state={...state,...result};
 assert(evaluate(rules.freeGames.$game.transition['.validate'],before,after,'freeGames/match/transition','p1',10000,{$game:'match'}),'S skills '+a.id+'/'+b.id+'/'+pair);cases++;
 const tampered=structuredClone(after);tampered.freeGames.match.transition.gauge1++;assert.equal(evaluate(rules.freeGames.$game.transition['.validate'],before,tampered,'freeGames/match/transition','p1',10000,{$game:'match'}),false);
}
function setup(loadout=[0,7,9]){const h=harness(),p='freeGames/match';h.put(p+'/kind','friend');h.put(p+'/rulesVersion',3);h.put(p+'/roomRules',roomRules);h.put(p+'/special',{...S.initial(2),gauge:{1:30,2:30}});h.put(p+'/state',{...base(),hp1:15,hp2:15,skillsExhausted:true});for(const side of [1,2])h.put(p+'/loadouts/'+side,loadout);h.setClock(5600);return {h,p};}
(async()=>{
 const {h,p}=setup();await h.transports[0]({op:'action',matchId:'match',turn:1,action:24});const m=(await h.transports[1]({op:'action',matchId:'match',turn:1,action:22})).match;
 assert.equal(m.state.turn,2);assert.equal(m.state.specialSeal[1],2);assert.equal(m.state.gauge[1],8);assert.equal(m.state.gauge[2],5);assert.equal(m.special.gauge[1],23);assert.equal(m.special.gauge[2],19);
 h.setClock(m.opensAt);for(const action of [2,3,15,22,24])await assert.rejects(()=>h.transports[0]({op:'action',matchId:'match',turn:2,action}),/permission_denied/);
 await h.transports[0]({op:'action',matchId:'match',turn:2,action:1});const m2=(await h.transports[1]({op:'action',matchId:'match',turn:2,action:0})).match;assert.equal(m2.state.specialSeal[1],1);
 h.setClock(m2.opensAt);await h.transports[0]({op:'action',matchId:'match',turn:3,action:0});const m3=(await h.transports[1]({op:'action',matchId:'match',turn:3,action:0})).match;assert.equal(m3.state.specialSeal[1],0);
 const short=setup();short.h.put(short.p+'/special/gauge/1',7);await assert.rejects(()=>short.h.transports[0]({op:'action',matchId:'match',turn:1,action:24}),/permission_denied/);
 const unequipped=setup();await assert.rejects(()=>unequipped.h.transports[0]({op:'action',matchId:'match',turn:1,action:23}),/permission_denied/);
 const forged=setup();assert.throws(()=>forged.h.commit({[forged.p+'/special/gauge/1']:29},'p1'),/permission_denied/);
 const oldRules=structuredClone(rules);delete oldRules.freeGames.$game.advanced.specialMovesV1;assert.equal(await harness(oldRules).transports[0].supportsSpecialMoves(),false);
 const f=harness(),ctx=vm.createContext({window:{SpecialRules:S,AdvancedRules:A},calculateV1:calculate,calculateV2:calculate,stateFields:vm.runInContext('stateFields',f.ctx)});vm.runInContext(read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),ctx);
 const replay=setup(),rh=replay.h,rp=replay.p;rh.put(rp+'/special',S.initial(2));let current=(await rh.transports[0]({op:'status',matchId:'match'})).match;
 for(let turn=1;turn<=13;turn++){rh.setClock(current.opensAt);const moves=turn===13?[24,22]:[1,2].map(p=>current.state.gauge[p]<10?0:1);await rh.transports[0]({op:'action',matchId:'match',turn,action:moves[0]});current=(await rh.transports[1]({op:'action',matchId:'match',turn,action:moves[1]})).match;}
 await rh.transports[0]({op:'resign',matchId:'match'});const saved=plain(vm.runInContext('buildHistory',ctx)('match',rh.get(rp),{1:rh.get('freeAccounts/p1'),2:rh.get('freeAccounts/p2')}));assert.equal(saved.rulesVersion,3);assert.equal(vm.runInContext('replayHistory',ctx)(saved).length,13);rh.commit({'battleHistory/match':saved,'playerHistory/p1/match':saved.endedAt,'playerHistory/p2/match':saved.endedAt},'p1');
 assert(Buffer.byteLength(read('firebase-database.rules.json'))<256*1024);
 console.log('PASS 12 S moves, '+cases+' action pairs, costs/equipment, 2-turn seal, atomic gauge, old protocol, full transport and history');
})().catch(e=>{console.error(e);process.exitCode=1;});
