const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness,Snapshot}=require('./rules-harness.cjs'),V=require('../combat-v4.js'),S=require('../advanced/special-rules.js');
const read=f=>fs.readFileSync(path.resolve(__dirname,'..',f),'utf8');
const settings={mode:'advanced',hp:10,initialGauge:8,maxGauge:10,skills:false,special:true};
const base=()=>({turn:1,startedAt:0,hp1:10,hp2:10,gauge1:8,gauge2:8,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,skillsExhausted:true,...S.extraState(),...V.extraState(),...V.extraSpecialState()});
const run=(a,b,extra={},rules={})=>V.calculate({...base(),...extra},{1:a,2:b},4,{...settings,specialVersion:4,...rules},{},true);
const costs={17:10,20:10,36:10,37:16,38:4,39:12,40:8};
for(const[id,cost]of Object.entries(costs))assert.equal(S.definition(Number(id),4).cost,cost);
for(const id of [17,20])assert.equal(S.definition(id,3).cost,8);
for(const id of [36,37,38,39,40])assert.equal(S.definition(id,3).cost,0);
for(const side of [1,2]){
 const q=3-side,pair=(own,enemy)=>side===1?[own,enemy]:[enemy,own],field=k=>k+side,other=k=>k+q;
 let r=run(...pair(40,2));assert.equal(r[other('gauge')],6);assert.equal(r[field('gauge')],6,'blocked drain has no normal absorption');
 r=run(...pair(40,0));assert.equal(r[other('gauge')],7);assert.equal(r[field('gauge')],7);assert.equal(r[field('drained')],1);
 r=run(...pair(40,2),{[other('gauge')]:0});assert.equal(r[other('gauge')],0);
 r=run(...pair(36,0));assert.equal(r[field('power')],4);assert.equal(r[other('damage')],4);
 r=run(...pair(36,0),{[field('weaken')]:2,[field('enhance')]:2});assert.equal(r[field('power')],4,'Blast, Enhance and weakening stack');
 r=run(...pair(37,0));assert.equal(r[other('frozen')],2);
 for(const remaining of [1,0]){r=run(...pair(0,36),r);assert.equal(r[other('action')],-1);assert.equal(r[other('frozen')],remaining);}
 r=run(...pair(0,36),r);assert.equal(r[other('action')],36);
 r=run(...pair(38,7));assert.equal(r[field('gain')],0);assert.equal(r[field('gauge')],8,'refund +3 still applies through Foresight');assert.equal(r[other('gauge')],10);
 r=run(...pair(38,0),{[field('gauge')]:3,[other('gauge')]:0});assert.equal(r[field('gauge')],6);assert.equal(r[other('gauge')],5);
 r=run(...pair(39,0));assert.equal(r[other('poison')],2);assert.equal(r[other('weaken')],2);
 for(const remaining of [1,0]){r=run(...pair(0,1),r);assert.equal(r[other('power')],0);assert.equal(r[field('damage')],0);assert.equal(r[other('damage')],1);assert.equal(r[other('weaken')],remaining);}
 r=run(...pair(0,1),r);assert.equal(r[other('power')],1);
 r=run(...pair(33,0),{[field('weaken')]:2});assert.equal(r[field('power')],0);assert.equal(r[field('drained')],0,'zero-power Drain does not steal');
 r=run(...pair(14,39));assert.equal(r[field('weaken')],2);assert.equal(r[other('weaken')],2,'Mirror copies S Venom');
 r=run(...pair(14,40));assert.equal(r[field('specialDrain')],2,'Mirror copies S Drain');
}
assert.equal(run(38,38).specialRefund,6);assert.equal(run(38,38).gauge1,10);assert.equal(run(38,38).gauge2,10);
const rules=JSON.parse(read('firebase-database.rules.json')).rules,validation=new vm.Script('('+rules.freeGames.$game.transition['.validate']+')');
let cases=0;
for(const version of [3,4])for(let a=0;a<=40;a++)for(let b=0;b<=40;b++){
 const state={...base(),enhance1:a%3,momentum2:!!(b%2),specialMomentum1:a%2,poison2:b%3,frozen1:a%3,weaken1:a%3,weaken2:b%3};
 if(version<4)for(const k of V.specialFields)delete state[k];
 const moves={1:a,2:b},result=V.calculate(state,moves,4,{...settings,specialVersion:version},{},true);
 const before={freeGames:{match:{rulesVersion:4,roomRules:settings,foresightShield:true,special:{...S.initial(version),gauge:{1:30,2:30}},state,moves:{1:moves}}}},after=structuredClone(before);
 after.freeGames.match.transition=result;after.freeGames.match.state={...state,...result};
 const ctx=vm.createContext({root:new Snapshot(before),data:new Snapshot(before,'freeGames/match/transition'),newData:new Snapshot(after,'freeGames/match/transition'),$game:'match'});
 if(!validation.runInContext(ctx))throw Error('Formula mismatch version='+version+' moves='+a+'/'+b+'\n'+JSON.stringify(result));
 cases++;
}
console.log('PASS 5 S effects, duration, zero floor, caps, both sides, Mirror, preserved costs and '+cases+' server-validated action pairs');
const Advanced=require('../advanced/rules.js');
let skillCases=0;
for(const a of Advanced.SKILLS)for(const b of Advanced.SKILLS)for(const moves of [{1:36,2:33},{1:14,2:39},{1:40,2:38},{1:37,2:1},{1:27,2:1}]){
 const state={...base(),weaken1:2,weaken2:1,poison1:1,enhance1:1,seal1:true,specialSeal1:1,ruin1:2};
 const advanced={selected:{1:a.id,2:b.id},current:{1:{id:a.id,turn:1},2:{id:b.id,turn:1}}};
 const roomRules={...settings,mode:'custom',hp:20,maxGauge:17,skills:true};
 const calculate=(s,m,v,r,bonus)=>V.calculate(s,m,v,{...r,specialVersion:4},bonus,true);
 const result=Advanced.resolve(state,moves,advanced.selected,Advanced.forTurn(advanced,1),calculate,roomRules);
 const before={freeGames:{match:{rulesVersion:4,roomRules,foresightShield:true,special:{...S.initial(4),gauge:{1:30,2:30}},state,advanced,moves:{1:moves}}}},after=structuredClone(before);
 after.freeGames.match.transition=result;after.freeGames.match.state={...state,...result};
 const ctx=vm.createContext({root:new Snapshot(before),data:new Snapshot(before,'freeGames/match/transition'),newData:new Snapshot(after,'freeGames/match/transition'),$game:'match'});
 assert(validation.runInContext(ctx),'custom skill pair '+a.id+'/'+b.id+' moves '+JSON.stringify(moves));skillCases++;
}
console.log('PASS '+skillCases+' skill combinations with new S effects, weakening and Custom HP/gauge limits');

function setup(index=0,gauge=30,version=4){const h=harness(),p='freeGames/match';h.put(p+'/kind','friend');h.put(p+'/rulesVersion',4);h.put(p+'/roomRules',settings);h.put(p+'/special',{...S.initial(version),gauge:{1:gauge,2:gauge}});const state=base();if(version<4)for(const k of V.specialFields)delete state[k];h.put(p+'/state',state);for(const side of [1,2])h.put(p+'/loadouts/'+side,[index,(index+1)%19,(index+2)%19]);h.setClock(5600);return {h,p};}
(async()=>{
 for(const[id,cost]of Object.entries(costs))for(const side of [1,2]){
  const {h,p}=setup(V.indexOf(Number(id)),cost-1);
  await assert.rejects(()=>h.transports[side-1]({op:'action',matchId:'match',turn:1,action:Number(id)}),/permission_denied/);
  h.put(p+'/special/gauge/'+side,cost);await h.transports[side-1]({op:'action',matchId:'match',turn:1,action:Number(id)});
  const next=(await h.transports[2-side]({op:'action',matchId:'match',turn:1,action:2})).match;
  assert.equal(next.state.turn,2);assert.equal(h.get(p+'/transition/specialCost'+side),cost);assert.equal(next.special.gauge[side],1+(next.reveal.damage?.[side]||0));
 }
 const frozen=setup(15,16);await frozen.h.transports[0]({op:'action',matchId:'match',turn:1,action:37});let m=(await frozen.h.transports[1]({op:'action',matchId:'match',turn:1,action:0})).match;assert.equal(m.state.frozen[2],2);
 for(const remaining of [1,0]){frozen.h.setClock(m.opensAt);m=(await frozen.h.transports[0]({op:'action',matchId:'match',turn:m.state.turn,action:0})).match;assert.equal(m.reveal.actions[2],-1);assert.equal(m.state.frozen[2],remaining);}
 const venom=setup(17,12);await venom.h.transports[0]({op:'action',matchId:'match',turn:1,action:39});const poisoned=(await venom.h.transports[1]({op:'action',matchId:'match',turn:1,action:0})).match;assert.equal(poisoned.state.weaken[2],2);
 assert.throws(()=>venom.h.commit({[venom.p+'/state/weaken2']:0},'p1'),/permission_denied/);
 const unsupported=structuredClone(rules);delete unsupported.freeGames.$game.advanced.specialMovesV3;assert.equal(await harness(unsupported).transports[0].supportsSpecialExpansion(),false);
 assert(Buffer.byteLength(read('firebase-database.rules.json'))<256*1024);
 console.log('PASS complete transport + RTDB: 14 cost boundaries, 2 automatic frozen turns, weakening status, forged state rejection and missing-rule detection');
 // Replay funded matches from their real zero-S-gauge start and validate archive writes.
 for(const id of [36,37,38,39,40]){
  const {h,p}=setup(V.indexOf(id),0);let current=(await h.transports[0]({op:'status',matchId:'match'})).match;
  for(let turn=1;turn<=23;turn++){
   h.setClock(current.opensAt);
   const actions=[1,2].map(side=>current.state.gauge[side]>=10?1:0);if(turn===21)actions[0]=id;
   await h.transports[0]({op:'action',matchId:'match',turn,action:actions[0]});
   current=(await h.transports[1]({op:'action',matchId:'match',turn,action:actions[1]})).match;
  }
  await h.transports[0]({op:'resign',matchId:'match'});
  const ctx=vm.createContext({window:{BattleV4:V,SpecialRules:S,AdvancedRules:require('../advanced/rules.js')},calculateV1:vm.runInContext('calculate',h.ctx),calculateV2:vm.runInContext('calculate',h.ctx),stateFields:vm.runInContext('stateFields',h.ctx)});
  vm.runInContext(read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),ctx);
  const saved=JSON.parse(JSON.stringify(vm.runInContext('buildHistory',ctx)('match',h.get(p),{1:h.get('freeAccounts/p1'),2:h.get('freeAccounts/p2')})));
  assert.equal(saved.special.version,4);assert.equal(vm.runInContext('replayHistory',ctx)(saved).length,23);
  h.commit({'battleHistory/match':saved,'playerHistory/p1/match':saved.endedAt,'playerHistory/p2/match':saved.endedAt},'p1');
 }
 console.log('PASS five 23-turn matches: new effects, freeze/poison follow-up turns, versioned history replay and archive rules');

})().catch(error=>{console.error(error);process.exitCode=1;});
