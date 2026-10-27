const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');let clock=5600;
const backend=require('./rules-harness.cjs').harness(),transports=backend.transports;
function client(){
 let next=1;const jobs=new Map(),events=[],elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',className:'',hidden:true,classList:{add(){},remove(){},toggle(){}},appendChild(){},replaceChildren(){},style:{}});return elements.get(id);};
 const schedule=(fn,delay=0)=>{const id=next++;jobs.set(id,{at:clock+Math.max(0,delay),fn});return id;};
 const ctx=vm.createContext({console,window:{MatchModes:require('../match-modes.js'),rankedTransport:{transitionMs:transports[0].transitionMs}},performance:{now:()=>clock},Date:{now:()=>clock},setTimeout:schedule,clearTimeout:id=>jobs.delete(id),requestAnimationFrame:fn=>schedule(fn,16),cancelAnimationFrame:id=>jobs.delete(id),document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>element('dummy')},PlayerIntro:{cancel(){},reset(){},start(){},DURATION_MS:4300},syncBattleInspector(){},stopCountdownRing(){},startTurnCountdownSE(){},stopTurnCountdownSE(){},setCountdownRingStep(){},setupActionNames(){},setPlayerNames(){},updateBattleUI(){},botDisplayName:()=>'',showScreen(){},basicActions:{charge:{name:'Charge',type:'charge'},attack:{name:'Attack',type:'attack'},block:{name:'Block',type:'block'}},techniquePool:[],gameMode:'ranked',selectedTechniques:{},player1Techs:[],player2Techs:[],hp:{},gauge:{},blockSeal:{},enhanceTurns:{},momentumBonus:{},ruinTurns:{},lastAction:{},locked:{},selectingPlayer:1,ONLINE_REVEAL_MS:1300,playBattleSituationSE(){},showTechniqueReveal(){events.push({event:'reveal',at:clock});},playBattleEffect(_a,_b,done){events.push({event:'effect',at:clock});schedule(()=>{events.push({event:'effect-end',at:clock});done();},1200);}});
 ctx.window.AdvancedRules=require('../advanced/rules.js');
 vm.runInContext(fs.readFileSync(path.join(root,'ranked-client.js'),'utf8'),ctx);vm.runInContext('rankedActive=true',ctx);
 return{ctx,events,apply(m){ctx.snapshot=m;vm.runInContext('rankedApply(snapshot)',ctx);},advance(at){let job;while((job=[...jobs].filter(([,v])=>v.at<=at).sort((a,b)=>a[1].at-b[1].at)[0])){jobs.delete(job[0]);clock=job[1].at;job[1].fn(clock);}clock=at;},state(){return vm.runInContext('({animating:rankedAnimating,opensAt:rankedTurnOpensAt,deadline:rankedTurnDeadline,display:document.getElementById("countdown").textContent})',ctx);}};
}
(async()=>{
 const clients=[client(),client()];
 for(let side=0;side<2;side++)clients[side].apply((await transports[side]({op:'status',matchId:'match'})).match);
 const results=[];
 for(const remaining of [7000,2200,1200,200,0,-500]){
  const initial=(await transports[0]({op:'status',matchId:'match'})).match,at=initial.deadline-remaining;
  for(const c of clients)c.advance(at);
  backend.setClock(at);
  const currentTurn=initial.state.turn;
  await transports[0]({op:'action',matchId:'match',turn:currentTurn,action:1});
  await transports[1]({op:'action',matchId:'match',turn:currentTurn,action:1});
  const snapshots=await Promise.all(transports.map(t=>t({op:'status',matchId:'match'}).then(r=>r.match)));
  const countdownMs=Math.max(0,Math.min(3000,remaining));
  assert.equal(snapshots[0].opensAt,snapshots[1].opensAt);assert.equal(snapshots[0].opensAt,at+countdownMs+3100);
  clients.forEach((c,i)=>c.apply(snapshots[i]));
  for(const c of clients)c.advance(at+17);
  const numeric=clients.map(c=>Number(c.state().display));assert(numeric.every(n=>!Number.isFinite(n)||n<=Math.ceil(Math.max(0,remaining)/1000)));
  const opensAt=snapshots[0].opensAt;
  for(const c of clients)c.advance(opensAt+17);
  for(const c of clients){const reveal=c.events.filter(e=>e.event==='reveal').at(-1),ended=c.events.filter(e=>e.event==='effect-end').at(-1);assert.equal(reveal.at,at+countdownMs+500);assert.equal(ended.at,at+countdownMs+3000);assert.equal(opensAt-ended.at,100);assert.equal(c.state().animating,false);assert.equal(c.state().display,'10');assert.equal(c.state().deadline-opensAt,10000);}
  // Both sides can immediately submit the next legal move at the exposed opening.
  const available=(await transports[0]({op:'status',matchId:'match'})).match;assert.equal(available.state.turn,currentTurn+1);
  results.push({remaining,turn:currentTurn,countdownMs,countdownToReveal:500,effectEnd:at+countdownMs+3000,nextInput:opensAt,idleMs:100,nextInputMs:10000});
  backend.setClock(opensAt);
  const accepted=await transports[0]({op:'action',matchId:'match',turn:currentTurn+1,action:1});
  assert.equal(accepted.match.ownAction,1);assert.equal(accepted.match.state.turn,currentTurn+1);
 }
 assert.equal(backend.updates.length,6);assert.equal(backend.claims.length,6);assert.equal(backend.denials.length,0);
 console.log(JSON.stringify(results));console.log('PASS: actual rules + two clients, six turns including late/expired commits, 500 ms call, 100 ms post-effect gap, 10-second input, one update per turn, no denials');
})().catch(e=>{console.error(e);process.exitCode=1});
