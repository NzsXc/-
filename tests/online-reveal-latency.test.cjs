const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function extract(name){const start=html.indexOf('function '+name+'('),next=html.indexOf('\nfunction ',start+1);return html.slice(start,next);}
function client(mode,offset=0,timeline=false){
 let clock=offset,id=0;const jobs=new Map(),events=[],audio=[],elements=new Map();
 const el=k=>{if(!elements.has(k))elements.set(k,{textContent:'',className:'',style:{},classList:{add(){},remove(){},toggle(){}},replaceChildren(){}});return elements.get(k);};
 const ctx=vm.createContext({console,performance:{now:()=>clock},Date:{now:()=>clock},setTimeout:(fn,ms=0)=>{jobs.set(++id,{fn,at:clock+Math.max(0,ms)});return id;},clearTimeout:n=>jobs.delete(n),clearInterval:n=>jobs.delete(n),requestAnimationFrame:()=>0,cancelAnimationFrame(){},
 window:{rankedTransport:{transitionMs:6100},onlineBattle:{localPlayer:2,publishBattleState:async()=>{},clearActions:async()=>{}}},document:{getElementById:el,querySelectorAll:()=>[]},PlayerIntro:{reset(){},cancel(){}},
 ONLINE_REVEAL_MS:1300,ONLINE_EFFECT_LEAD_MS:500,gameMode:mode,onlineNow:()=>clock-offset,onlineMatchSession:1,onlineTurnNumber:1,onlineInputOpen:false,countdownTimer:0,countdownFinishTimeout:0,onlineInputDeadline:0,onlineTurnPhase:'input',spectatorSession:1,spectatorActive:true,
 hp:{1:10,2:10},gauge:{1:8,2:8},enhanceTurns:{},ruinTurns:{},lastAction:{},lastLastAction:{},momentumBonus:{},blockSeal:{},selectedAction:{},locked:{},basicActions:{attack:{name:'Attack',type:'attack'}},techniquePool:[],
 syncBattleInspector(){},stopCountdownRing(){},startTurnCountdownSE(){audio.push('start');},stopTurnCountdownSE(){audio.push('stop');},setCountdownRingStep(){},updateBattleUI(){},setupActionNames(){},setPlayerNames(){},botDisplayName:()=>'',showScreen(){},applyOnlineBlockSealState(){},clearOnlineTechniqueDescription(){},clearSpectatorTimers(){},beginSpectatorCountdown(){},updateSpectatorBattleUI(){},
 showTechniqueReveal(){events.push({type:'reveal',at:clock});},playBattleSituationSE(){},playBattleEffect(a,b,done){events.push({type:'effect',at:clock});ctx.done=done;},showBattleResult(){events.push({type:'result',at:clock});},startTurn(){events.push({type:'input',at:clock});}
 });
 ctx.window.AdvancedRules=require('../advanced/rules.js');ctx.window.SpecialRules=require('../advanced/special-rules.js');
 if(timeline)vm.runInContext(fs.readFileSync(path.join(root,'battle-timeline.js'),'utf8'),ctx);
 vm.runInContext('let onlineVisualTurn=0,onlinePendingBattleState=null,spectatorVisualTurn=0,spectatorPendingBattleState=null;',ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'ranked-client.js'),'utf8'),ctx);
 vm.runInContext('rankedActive=true;rankedMatch={id:"m",state:{turn:1},serverNow:0,opensAt:0,deadline:10000};rankedSeenReveal=0;',ctx);
 for(const name of ['applySpectatorState','prepareSpectatorEffect','receiveSpectatorBattleState','receiveOnlineBattleState'])vm.runInContext(extract(name),ctx);
 const snapshot=at=>({id:'m',you:2,phase:'turn',revision:2,serverNow:at,opensAt:6100,deadline:16100,graceDeadline:20000,ownAction:null,state:{turn:2,hp:{1:10,2:10},gauge:{1:8,2:8},seal:{},enhance:{},momentum:{},last:{}},loadouts:{1:[],2:[]},players:{1:{name:'P1'},2:{name:'P2'}},reveal:{turn:1,startedAt:0,countdownEndsAt:3000,actions:{1:1,2:1}}});
 const state={phase:'effect',turn:1,resolvedTurn:1,revealAt:3500,effectStartAt:4800,actions:{1:{id:'attack',data:{type:'attack'}},2:{id:'attack',data:{type:'attack'}}},hp:{1:10,2:10},gauge:{1:8,2:8}};
 return {events,audio,ctx,receive(at){clock=at+offset;ctx.m=mode==='ranked'?snapshot(at):state;vm.runInContext(mode==='ranked'?'rankedApply(m)':mode==='spectator'?'receiveSpectatorBattleState(m,{})':'receiveOnlineBattleState(m)',ctx);},advance(at,stalled=false){const end=at+offset;let job;if(stalled)clock=end;while((job=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0])){jobs.delete(job[0]);if(!stalled)clock=job[1].at;job[1].fn();}clock=end;},next(){ctx.next={...state,phase:'battle',turn:2,startAt:6100};vm.runInContext(mode==='ranked'?'m={...m,revision:3};rankedApply(m)':mode==='spectator'?'receiveSpectatorBattleState(next,{})':'receiveOnlineBattleState(next)',ctx);},cancel(){vm.runInContext(mode==='ranked'?'rankedVisualStop()':mode==='spectator'?'spectatorSession++':'onlineMatchSession++',ctx);},finish(){ctx.done?.();}};
}
for(const mode of ['ranked','online','spectator']){
 for(const arrival of [0,3500,4700,4800,5400]){
  const peers=[client(mode),client(mode,200000)];
  peers[0].receive(0);peers[1].receive(arrival);
  for(const c of peers){c.advance(7000);const [r,e]=c.events;assert.equal(r?.type,'reveal',mode);assert.equal(e?.type,'effect',mode);assert(e.at-r.at>=1300,`${mode}: arrival ${arrival}: reveal lasted ${e.at-r.at}ms`);assert.equal(c.events.length,2);}
 }
 const stalled=client(mode);stalled.receive(0);stalled.advance(5000,true);assert.deepEqual(stalled.events.map(e=>e.type),['reveal'],mode+': a busy event loop must paint the reveal before starting effects');stalled.advance(6299);assert.equal(stalled.events.length,1);stalled.advance(6300);assert.equal(stalled.events[1].type,'effect');
 const queued=client(mode);queued.receive(4700);queued.advance(4700);queued.next();queued.advance(6000);assert.deepEqual(queued.events.map(e=>e.type),['reveal','effect'],mode+': newer snapshots must not cancel the reveal');
 queued.finish();queued.advance(6200);assert.equal(vm.runInContext('onlineTurnNumber',queued.ctx),mode==='ranked'?1:2,'deferred next-turn state is applied after the effect');if(mode==='online')assert.equal(queued.events.at(-1).type,'input');
 const cancelled=client(mode);cancelled.receive(4700);cancelled.advance(4700);cancelled.cancel();cancelled.advance(7000);assert.deepEqual(cancelled.events.map(e=>e.type),['reveal'],mode+': leaving must cancel pending effects');
 console.log('PASS '+mode+': asymmetric latency, clock offsets, stalled event loop, newer snapshots and cancellation');
}
const rankedCountdown=client('ranked');rankedCountdown.receive(0);vm.runInContext('rankedTick()',rankedCountdown.ctx);assert.equal(rankedCountdown.audio.at(-1),'start');rankedCountdown.advance(3000);vm.runInContext('rankedTick()',rankedCountdown.ctx);assert.equal(rankedCountdown.audio.at(-1),'stop');
for(const mode of ['online','spectator']){const c=client(mode);vm.runInContext(extract(mode==='online'?'beginOnlineBattleCountdown':'beginSpectatorCountdown'),c.ctx);vm.runInContext(mode==='online'?'beginOnlineBattleCountdown(3000)':'spectatorCountdownKey="";beginSpectatorCountdown(3000)',c.ctx);assert.equal(c.audio.at(-1),'start',mode+': tick during 3-2-1');c.advance(3000);assert.equal(c.audio.at(-1),'stop',mode+': stop at BATTLE');}
console.log('PASS countdown audio: ranked, online and spectator 3-2-1, then stop at BATTLE');

for(const mode of ['ranked','online','spectator']){
 const c=client(mode,200000,true),text=()=>vm.runInContext('document.getElementById("countdown").textContent',c.ctx);
 c.receive(5400);assert.equal(text(),'3',mode+': late snapshot starts with the unshown 3');
 c.advance(6400);assert.equal(text(),'2');c.advance(7400);assert.equal(text(),'1');c.advance(8400);assert.equal(text(),'BATTLE!');
 c.advance(8900);assert.equal(c.events[0].type,'reveal');c.next();c.advance(10200);assert.equal(c.events[1].type,'effect');assert.equal(c.events.length,2);
 if(mode==='ranked'){assert.equal(vm.runInContext('rankedVisualMatch.state.turn',c.ctx),1);assert.equal(vm.runInContext('rankedMatch.deadline',c.ctx),16100,'presentation never rewrites the server input deadline');}
 c.cancel();
 const stalled=client(mode,0,true);stalled.receive(0);stalled.advance(5000,true);assert.equal(vm.runInContext('document.getElementById("countdown").textContent',stalled.ctx),'2');assert.equal(stalled.events.length,0,'stalled 3 does not jump straight to effects');stalled.advance(8800);assert.deepEqual(stalled.events.map(e=>e.type),['reveal','effect']);
 const left=client(mode,0,true);left.receive(0);left.cancel();left.advance(9000);assert.equal(left.events.length,0,'leaving during 3 cancels the entire presentation');
 console.log('PASS '+mode+': real timeline, unshown 3-2-1, late snapshots, stalled callbacks, queued next state and cancellation');
}
const spectatorSameTurn=client('spectator',0,true);spectatorSameTurn.receive(0);vm.runInContext('receiveSpectatorBattleState({...m,phase:"battle",startAt:6100},{})',spectatorSameTurn.ctx);assert.equal(vm.runInContext('spectatorPendingBattleState.phase',spectatorSameTurn.ctx),'battle','protected spectator snapshots must wait even when their public turn number is unchanged');spectatorSameTurn.advance(4800);assert.deepEqual(spectatorSameTurn.events.map(e=>e.type),['reveal','effect']);
