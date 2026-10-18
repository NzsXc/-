const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness}=require('./rules-harness.cjs'),A=require('../advanced/rules.js');
const source=fs.readFileSync(path.join(__dirname,'../ranked-client.js'),'utf8');
function client(){
 let clock=0,id=0;const jobs=new Map(),elements=new Map(),seen=[];
 const element=k=>{if(!elements.has(k))elements.set(k,{textContent:'',className:'',classList:{toggle(){},add(){},remove(){}},style:{}});return elements.get(k);};
 const ctx=vm.createContext({window:{AdvancedRules:A,AdvancedSkills:{sync(m,now){seen.push(now);}}},performance:{now:()=>clock},Date:{now:()=>clock},console,
  document:{getElementById:element,querySelectorAll:()=>[]},setTimeout:(fn,ms)=>{jobs.set(++id,{fn,ms});return id;},clearTimeout:n=>jobs.delete(n),requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  syncBattleInspector(){},PlayerIntro:{cancel(){}},stopCountdownRing(){},stopTurnCountdownSE(){},setCountdownRingStep(){},startTurnCountdownSE(){},locked:{},hp:{},gauge:{},blockSeal:{},enhanceTurns:{},momentumBonus:{},ruinTurns:{},lastAction:{},updateBattleUI(){}});
 vm.runInContext(source,ctx);vm.runInContext('rankedActive=true',ctx);
 return{apply(m,at){clock=at;ctx.m=m;vm.runInContext('rankedMatch=m;rankedClockServer=m.serverNow;rankedClockAt=performance.now();rankedSyncTurnClock(m);rankedPaintState(m);rankedTick()',ctx);},tick(at){clock=at;vm.runInContext('rankedTick()',ctx);},state(){return vm.runInContext('({opensAt:rankedTurnOpensAt,deadline:rankedTurnDeadline,locked:locked[rankedMatch.you],hp2:hp[2],text:document.getElementById("countdown").textContent})',ctx);},ctx};
}
(async()=>{
 const h=harness(),rules={mode:'advanced',hp:10,initialGauge:8,maxGauge:10};
 for(const side of [1,2])h.put('freeAccounts/p'+side,{name:'P'+side,rating:1000,guest:false,games:0,active:'',lastSettled:''});
 h.commit({'friendRooms/clock':{host:'p2',name:'P2',createdAt:h.now(),heartbeat:h.now(),game:'',roomRules:rules}},'p2');
 const id=(await h.transports[0]({op:'friendJoin',roomId:'clock'})).match.id;
 await h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:'boost'});
 const start=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:'heal'})).match;
 const c1=client(),c2=client();c1.apply({...start,you:1},0);c2.apply({...start,you:2},20000);
 h.put('freeGames/'+id+'/state/hp2',8);h.setClock(start.skillWindow.endAt-1);await h.transports[1]({op:'advancedSkill',matchId:id,turn:1});
 const end=start.skillWindow.confirmAt;
 // Hold the boundary snapshot in flight: neither side may expose the stale opening.
 for(const c of [c1,c2])vm.runInContext('rankedTick.skillBoundary=m.id+":"+m.state.turn',c.ctx);
 c1.tick(end-start.serverNow);c2.tick(20000+end-start.serverNow);assert(c1.state().locked);assert(c2.state().locked);
 h.setClock(end+250);const m=(await h.transports[0]({op:'status',matchId:id})).match;
 c1.apply(m,m.serverNow-start.serverNow);c2.apply({...m,you:2},20000+m.serverNow-start.serverNow);
 assert.equal(c1.state().deadline-c1.state().opensAt,10000);assert.equal(c2.state().deadline-c2.state().opensAt,10000);
 assert.equal(c2.state().opensAt-c1.state().opensAt,20000,'different device clocks share the same server opening');
 // A repeated snapshot does not restart the presentation or push the deadline.
 const clock1=c1.state();h.setClock(end+500);const repeat=(await h.transports[0]({op:'status',matchId:id})).match;c1.apply(repeat,repeat.serverNow-start.serverNow);assert.equal(c1.state().opensAt,clock1.opensAt);assert.equal(c1.state().deadline,clock1.deadline);
 c1.tick(m.opensAt-start.serverNow-1);assert(c1.state().locked);assert.equal(c1.state().hp2,8,'HP stays unchanged until the effect finishes');c1.tick(m.opensAt-start.serverNow);assert.equal(c1.state().hp2,9,'HP commits at the effect boundary without waiting for another poll');assert.equal(c1.state().locked,false);assert.equal(c1.state().text,'10');
 c2.tick(20000+m.opensAt-start.serverNow);assert.equal(c2.state().locked,false);assert.equal(c2.state().text,'10');
 console.log('PASS: two device clocks, last-millisecond opponent receipt, stale-boundary lock, stable shared opening and full 10-second input');
})().catch(error=>{console.error(error);process.exitCode=1;});
