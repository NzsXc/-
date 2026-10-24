const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness,evaluate}=require('./rules-harness.cjs'),A=require('../advanced/rules.js');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const calc=vm.runInNewContext(read('free-calculator.js').replaceAll('export ','')+'\ncalculate',{window:{BattleV4:require('../combat-v4.js')}});
const settings={mode:'advanced',hp:10,initialGauge:8,maxGauge:10},rules=JSON.parse(read('firebase-database.rules.json')).rules;
const base={turn:1,startedAt:0,hp1:10,hp2:10,gauge1:8,gauge2:8,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0};
const advanced=(turn=1)=>({selected:{1:'stance',2:'heal'},current:{1:{id:'stance',turn,used:1,at:6000}},uses:{1:{1:{id:'stance',turn,used:1,at:6000}}}});
function resolve(moves,state=base,record=advanced()){return A.resolve(state,moves,record.selected,A.forTurn(record,state.turn),calc,settings);}
async function join(a='stance',b='heal'){
 const h=harness();for(const p of [1,2])h.put('freeAccounts/p'+p,{name:'P'+p,rating:1000,guest:false,games:0,active:'',lastSettled:''});
 h.commit({'friendRooms/stance':{host:'p2',name:'P2',createdAt:h.now(),heartbeat:h.now(),game:'',roomRules:settings}},'p2');
 const id=(await h.transports[0]({op:'friendJoin',roomId:'stance'})).match.id;
 await h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:a});
 const match=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:b})).match;
 return {h,id,match};
}
(async()=>{
 assert.equal(A.byId.chain.limit,7);assert.equal(A.byId.invincible.limit,3);assert.equal(A.byId.stance.limit,3);
 assert.equal(resolve({1:1,2:0}).damage2,2,'ordinary attack gains one damage');
 assert.equal(resolve({1:3,2:2}).damage2,3,'piercing attacks retain their block bypass');
 assert.equal(resolve({1:1,2:2}).damage2,0,'stance does not pierce block');
 assert.equal(resolve({1:1,2:4}).damage1,1,'a counter still reflects exactly one');
 assert.equal(resolve({1:4,2:1}).power1,0,'non-attack actions receive no attack power');
 assert.equal(resolve({1:0,2:1}).power1,0,'charge does not become an attack');
 assert.equal(resolve({1:1,2:0},{...base,enhance1:1}).power1,3,'stance stacks with Enhance');
 assert.equal(resolve({1:8,2:0},{...base,enhance1:1,momentum1:true}).power1,4,'Momentum and Enhance stack normally');
 assert.equal(resolve({1:14,2:1}).damage2,1,'a mirrored attack receives the owner\'s stance bonus');
 assert.equal(resolve({1:1,2:0},{...base,turn:2}).power1,1,'a previous-turn receipt cannot carry the bonus');
 assert.equal(calc(base,{1:1,2:0},2,settings).power1,1,'ordinary calculator calls retain their default power');
 const f=await join();f.h.put('freeGames/'+f.id+'/state/gauge2',6);f.h.setClock(f.match.skillWindow.startAt);
 const used=(await f.h.transports[0]({op:'advancedSkill',matchId:f.id,turn:1})).match;
 f.h.setClock(used.opensAt);await f.h.transports[0]({op:'action',matchId:f.id,turn:1,action:1});
 const next=(await f.h.transports[1]({op:'action',matchId:f.id,turn:1,action:0})).match;
 assert.equal(next.state.hp[2],8);assert.equal(f.h.get('freeGames/'+f.id+'/transition/power1'),2);
 f.h.setClock(next.opensAt);await f.h.transports[0]({op:'action',matchId:f.id,turn:2,action:1});
 const following=(await f.h.transports[1]({op:'action',matchId:f.id,turn:2,action:0})).match;
 assert.equal(following.state.hp[2],7);assert.equal(f.h.get('freeGames/'+f.id+'/transition/power1'),1);
 assert.equal(f.h.get('freeGames/'+f.id+'/state/powerBonus'),null,'the one-turn bonus is not persisted');
 await f.h.transports[0]({op:'resign',matchId:f.id});
 const context=vm.createContext({window:{SpecialRules:require('../advanced/special-rules.js'),BattleV4:require('../combat-v4.js'),AdvancedRules:A},calculateV1:calc,calculateV2:calc,stateFields:Object.keys(base)});
 vm.runInContext(read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),context);
 const history=JSON.parse(JSON.stringify(vm.runInContext('buildHistory',context)(f.id,f.h.get('freeGames/'+f.id),{1:f.h.get('freeAccounts/p1'),2:f.h.get('freeAccounts/p2')})));
 const replay=vm.runInContext('replayHistory',context)(history);
 assert.equal(replay[0].damage[2],2);assert.equal(replay[1].damage[2],1,'history replays the one-turn bonus');
 const a=advanced(),moves={1:1,2:0},before={freeGames:{match:{kind:'friend',rulesVersion:2,roomRules:settings,state:base,advanced:a,moves:{1:moves}}}},after=structuredClone(before);
 after.freeGames.match.transition=JSON.parse(JSON.stringify(resolve(moves)));
 after.freeGames.match.transition.power1++;after.freeGames.match.transition.damage2++;
 assert.equal(evaluate(rules.freeGames.$game.transition['.validate'],before,after,'freeGames/match/transition','p1',9000,{$game:'match'}),false,'rules reject inflated attack power');
 after.freeGames.match.transition=JSON.parse(JSON.stringify(resolve(moves)));before.freeGames.match.advanced.current[1].turn=0;
 assert.equal(evaluate(rules.freeGames.$game.transition['.validate'],before,after,'freeGames/match/transition','p1',9000,{$game:'match'}),false,'rules reject a stale stance receipt');
 const chain=await join('chain','heal'),game='freeGames/'+chain.id;let chainMatch=chain.match;
 for(let turn=1;turn<=7;turn++){
  chainMatch=(await chain.h.transports[0]({op:'status',matchId:chain.id})).match;
  chain.h.setClock(chainMatch.skillWindow.startAt);
  const use=(await chain.h.transports[0]({op:'advancedSkill',matchId:chain.id,turn})).match;
  chain.h.setClock(use.opensAt);await chain.h.transports[0]({op:'action',matchId:chain.id,turn,action:1});
  chainMatch=(await chain.h.transports[1]({op:'action',matchId:chain.id,turn,action:1})).match;
 }
 assert.equal(chain.h.get(game+'/advanced/current/1/used'),7);
 await chain.h.transports[0]({op:'resign',matchId:chain.id});
 const saved=JSON.parse(JSON.stringify(vm.runInContext('buildHistory',context)(chain.id,chain.h.get(game),{1:chain.h.get('freeAccounts/p1'),2:chain.h.get('freeAccounts/p2')})));
 chain.h.commit({['battleHistory/'+chain.id]:saved,['playerHistory/p1/'+chain.id]:saved.endedAt,['playerHistory/p2/'+chain.id]:saved.endedAt},'p1');
 for(const missing of [6,7]){
  const forged=chain.h.copy();delete forged.battleHistory[chain.id].advanced.uses[1][missing];
  assert.equal(chain.h.evaluate(rules.battleHistory.$game.advanced.uses[1]['.validate'],chain.h.copy(),forged,'battleHistory/'+chain.id+'/advanced/uses/1','p1',{$game:chain.id}),false,'history must retain use '+missing);
 }
 const old=JSON.parse(read('firebase-database.rules.json'));delete old.rules.freeGames.$game.advanced.attackStance;
 assert.equal(await harness(old.rules).transports[0].supportsAdvanced(),false,'clients reject old rules before a new skill can be selected');
 console.log('PASS: attack stance, stacking, block/counter/mirror, next-turn expiry, transport damage, replay, forged power, seven-use history and old-rule gate');
})().catch(error=>{console.error(error);process.exitCode=1;});
