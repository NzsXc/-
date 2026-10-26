const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function extract(name){const start=html.indexOf('function '+name+'('),next=html.indexOf('\nfunction ',start+1);assert(start>=0);return html.slice(start,next);}
function client(mode,offset=0,timeline=false,frozenSide=0){
 let clock=offset,id=0;const jobs=new Map(),events=[],audio=[],elements=new Map();
 const el=k=>{if(!elements.has(k))elements.set(k,{textContent:'',className:'',classList:{add(){},remove(){},toggle(){}},replaceChildren(){}});return elements.get(k);};
 const ctx=vm.createContext({console,performance:{now:()=>clock},Date:{now:()=>clock},setTimeout:(fn,ms=0)=>{jobs.set(++id,{fn,at:clock+Math.max(0,ms)});return id;},clearTimeout:n=>jobs.delete(n),clearInterval:n=>jobs.delete(n),requestAnimationFrame:()=>0,cancelAnimationFrame(){},
 window:{rankedTransport:{transitionMs:6100},AdvancedRules:{isAdvanced:()=>false}},document:{getElementById:el},PlayerIntro:{reset(){},cancel(){}},ONLINE_REVEAL_MS:1300,gameMode:mode,hp:{1:10,2:10},gauge:{1:8,2:8},locked:{},basicActions:{attack:{name:'Attack',type:'attack'}},
 syncBattleInspector(){},stopCountdownRing(){},startTurnCountdownSE(){audio.push('start');},stopTurnCountdownSE(){audio.push('stop');},setCountdownRingStep(){},showTechniqueReveal(){events.push({type:'reveal',at:clock});},playBattleSituationSE(){},playBattleEffect(){events.push({type:'effect',at:clock});}});
 if(timeline)vm.runInContext(fs.readFileSync(path.join(root,'battle-timeline.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'ranked-client.js'),'utf8'),ctx);
 vm.runInContext('rankedActive=true;rankedMatch={id:"m",state:{turn:1},serverNow:0,opensAt:0,deadline:10000};',ctx);
 return {events,audio,ctx,receive(at){clock=at+offset;ctx.m={id:'m',you:2,state:{turn:2,hp:{1:10,2:10},gauge:{1:8,2:8}},serverNow:at,opensAt:6100,deadline:16100,reveal:{turn:1,startedAt:0,countdownEndsAt:3000,actions:{1:frozenSide===1?-1:1,2:frozenSide===2?-1:1}}};vm.runInContext('rankedReveal(m,rankedMatch)',ctx);},advance(at){const end=at+offset;let job;while((job=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0])){jobs.delete(job[0]);clock=job[1].at;job[1].fn();}clock=end;},cancel(){vm.runInContext('rankedVisualStop()',ctx);}};
}

for(const frozenSide of [1,2])for(const timeline of [false,true])for(const arrival of [0,5400]){
 const c=client('ranked',200000,timeline,frozenSide);
 c.receive(arrival);
 assert.deepEqual(c.events,[{type:'reveal',at:arrival+200000}],'frozen turn reveals immediately on receipt');
 assert.equal(vm.runInContext('document.getElementById("countdown").textContent',c.ctx),'');
 c.advance(arrival+1299);assert.equal(c.events.length,1);
 c.advance(arrival+1300);assert.equal(c.events[1].type,'effect','technique reveal retains its full duration');
 assert.equal(c.audio.at(-1),'stop');
 const cancelled=client('ranked',0,timeline,frozenSide);cancelled.receive(arrival);cancelled.cancel();cancelled.advance(arrival+5000);assert.equal(cancelled.events.length,1,'leaving cancels the pending effect');
}
for(const frozenSide of [1,2]){
 const c=client('ranked',0,true);
 vm.runInContext(`rankedMatch={id:'m',you:${frozenSide},state:{turn:1,frozen:{${frozenSide}:1}},phase:'turn',serverNow:0,opensAt:0,deadline:10000,graceDeadline:40000,ownAction:null};rankedTurnClockKey='m:1';rankedTurnOpensAt=0;rankedTurnDeadline=10000;rankedTick();`,c.ctx);
 assert.equal(vm.runInContext('document.getElementById("resultMessage").textContent',c.ctx),'相手の行動を待っています');
 assert.equal(vm.runInContext(`locked[${frozenSide}]`,c.ctx),true,'frozen input is locked even before its automatic move arrives');
 assert.equal(vm.runInContext('document.getElementById("countdown").textContent',c.ctx),'');
 c.advance(10000);vm.runInContext('rankedTick()',c.ctx);
 assert.equal(vm.runInContext('rankedSending',c.ctx),false,'frozen side never submits a timeout charge');
 assert.equal(vm.runInContext('document.getElementById("resultMessage").textContent',c.ctx),'相手の行動を待っています');
}
console.log('PASS frozen turns: both sides, real timeline, immediate reveal, full reveal duration, cancellation and frozen waiting UI');
// Normal turns retain their existing countdown.
const normal=client('ranked',0,true);normal.receive(0);assert.equal(normal.events.length,0);normal.advance(3499);assert.equal(normal.events.length,0);normal.advance(3500);assert.equal(normal.events[0].type,'reveal');
// Offline and bot turns share the same immediate completion gate.
for(const frozenSide of [1,2,3,0]){
 let finishes=0;const cancelled=[],ctx=vm.createContext({gameMode:'offline',selectedAction:{1:{id:frozenSide===1||frozenSide===3?'frozen':'attack'},2:{id:frozenSide===2||frozenSide===3?'frozen':'attack'}},countdown:1,countdownTimer:10,countdownFinishTimeout:11,clearInterval:id=>cancelled.push(id),clearTimeout:id=>cancelled.push(id),document:{getElementById:()=>({textContent:''})},finishTurn(){finishes++;}});
 vm.runInContext(extract('finishFrozenTurnIfReady'),ctx);
 assert.equal(vm.runInContext('finishFrozenTurnIfReady()',ctx),frozenSide>0);assert.equal(finishes,frozenSide>0?1:0);assert.deepEqual(cancelled,frozenSide>0?[10,11]:[]);
 ctx.selectedAction[2]=null;assert.equal(vm.runInContext('finishFrozenTurnIfReady()',ctx),false,'still waits for the unfrozen player');
}
console.log('PASS normal countdown retained; offline frozen turns finish immediately and cancel old timers');
(async()=>{
 for(const frozenSide of [1,2]){
  const backend=require('./rules-harness.cjs').harness(),path='freeGames/match';
  backend.put(path+'/rulesVersion',4);
  backend.put(path+'/state',{...backend.get(path+'/state'),...require('../advanced/special-rules.js').extraState(),...require('../combat-v4.js').extraState(),['frozen'+frozenSide]:1});
  const response=await backend.transports[2-frozenSide]({op:'action',matchId:'match',turn:1,action:1});
  assert.equal(response.match.state.turn,2,'unfrozen action advances without requesting frozen player input');
  assert.equal(response.match.reveal.actions[frozenSide],-1);
  assert.equal(response.match.reveal.actions[3-frozenSide],1);
  assert.equal(backend.updates.length,1);assert.equal(backend.denials.length,0);
 }
 console.log('PASS actual database rules: either frozen side auto-confirms; only the active player submits an action');
})().catch(error=>{console.error(error);process.exitCode=1;});
