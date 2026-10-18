const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness}=require('./rules-harness.cjs'),A=require('../advanced/rules.js');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
// RTDB may serialize numeric-key collections as arrays with leading nulls.
function firebaseValue(value){
 if(!value||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(firebaseValue);
 const keys=Object.keys(value);
 if(keys.length&&keys.every(key=>/^\d+$/.test(key))){const out=Array(Math.max(...keys.map(Number))+1).fill(null);for(const key of keys)out[key]=firebaseValue(value[key]);return out;}
 return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,firebaseValue(item)]));
}
async function setup(){
 const h=harness(),warnings=[],originalGet=h.ctx.get;
 h.ctx.get=async ref=>{const snapshot=await originalGet(ref);return {val:()=>firebaseValue(snapshot.val())};};
 h.ctx.console={...console,warn:(...args)=>warnings.push(args)};
 h.ctx.calculateV1=vm.runInNewContext(read('history-calculator-v1.js').replaceAll('export ','')+'\ncalculate');
 h.ctx.calculateV2=vm.runInContext('calculate',h.ctx);
 vm.runInContext(read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),h.ctx);
 vm.runInContext(read('battle-history.js').replace(/^import[^\n]*\n/gm,'').replace('export function','function'),h.ctx);
 const histories=[1,2].map(side=>vm.runInContext(`createBattleHistory({uid:'p${side}'},{currentUser:{uid:'p${side}'}})`,h.ctx));
 const transports=histories.map((history,i)=>{h.ctx.testHistory=history;return vm.runInContext(`createFreeTransport({uid:'p${i+1}'},{currentUser:{uid:'p${i+1}'}},testHistory)`,h.ctx);});
 for(const side of [1,2])h.put('freeAccounts/p'+side,{name:side===1?'A':'B',rating:1000,guest:false,games:0,active:'',lastSettled:''});
 h.commit({'friendRooms/history':{host:'p2',name:'B',createdAt:h.now(),heartbeat:h.now(),game:'',roomRules:{mode:'advanced',hp:10,initialGauge:8,maxGauge:10}}},'p2');
 const joined=(await transports[0]({op:'friendJoin',roomId:'history'})).match;
 return {h,warnings,histories,transports,id:joined.id};
}
(async()=>{
 const receipt={id:'boost',turn:1,at:6000,used:1},latest={id:'boost',turn:3,at:30000,used:2};
 const advanced={selected:[null,'boost','heal'],current:[null,latest],uses:[null,[null,receipt,null,latest],null]};
 assert.deepEqual(A.forTurn(advanced,1),{1:receipt});assert.deepEqual(A.forTurn(advanced,3),{1:latest});
 for(const turn of [undefined,null,0,-1,NaN,'1']){assert.deepEqual(A.forTurn(advanced,turn),{});assert.equal(A.presentationMs(advanced,turn),0);}
 assert.deepEqual(A.forTurn({uses:[null,[null,null]]},2),{});
 const expired=await setup();
 await expired.transports[0]({op:'loadout',matchId:expired.id,loadout:[0,1,2],advancedSkill:'boost'});
 expired.h.setClock(expired.h.get('freeGames/'+expired.id+'/createdAt')+90000);
 for(const side of [0,1]){const m=(await expired.transports[side]({op:'status',matchId:expired.id})).match;assert(m.closed);assert.equal(m.state,null);assert.equal(m.result.reason,'selection-timeout');assert.equal(m.result.winner,1);}
 assert.equal(expired.h.get('freeGames/'+expired.id),null,'an Advanced game ending before battle can archive and clean up');
 const restored=(await expired.transports[0]({op:'status',matchId:expired.id})).match;assert.equal(restored.state,null);assert.equal(restored.players[1].name,'A');
 assert.deepEqual(expired.warnings,[]);assert.deepEqual(expired.h.denials,[]);
 const played=await setup();
 await played.transports[0]({op:'loadout',matchId:played.id,loadout:[0,1,2],advancedSkill:'boost'});
 let m=(await played.transports[1]({op:'loadout',matchId:played.id,loadout:[0,1,2],advancedSkill:'heal'})).match;
 played.h.setClock(m.skillWindow.startAt);await played.transports[0]({op:'advancedSkill',matchId:played.id,turn:1});m=(await played.transports[1]({op:'advancedSkill',matchId:played.id,turn:1})).match;
 for(const turn of [1,2]){played.h.setClock(m.opensAt);await played.transports[0]({op:'action',matchId:played.id,turn,action:1});m=(await played.transports[1]({op:'action',matchId:played.id,turn,action:1})).match;assert.equal(m.state.turn,turn+1);}
 const finished=(await played.transports[0]({op:'resign',matchId:played.id})).match;assert(finished.closed);assert.equal(finished.result.reason,'resigned');
 const saved=await played.histories[0].find(played.id);assert(Array.isArray(saved.advanced.uses[1]));assert.equal(saved.advanced.uses[1][0],null);
 played.h.ctx.saved=saved;assert.equal(vm.runInContext('replayHistory(saved)',played.h.ctx).length,2,'old turns replay through null array slots');
 for(const side of [0,1]){const m=(await played.transports[side]({op:'status',matchId:played.id})).match;assert(m.closed);assert.equal(m.state.turn,3);assert.equal(m.state.hp[1],finished.state.hp[1]);assert.equal(m.state.gauge[1],finished.state.gauge[1]);}
 assert.equal(played.h.get('freeGames/'+played.id),null);assert.equal(played.h.get('friendRooms/history'),null);
 assert.deepEqual(played.warnings,[]);assert.deepEqual(played.h.denials,[]);
 console.log('PASS: RTDB null-filled arrays, unknown turns, pre-battle timeout, actual history archive/index/cleanup, both-player restoration and replay with real security rules');
})().catch(error=>{console.error(error);process.exitCode=1;});
