const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),html=read('index.html');
const spectator=html.slice(html.indexOf('let spectatorActive = false;'),html.indexOf('function startOnlineMatch(type){'));
const effectStart=html.indexOf('function playBattleEffect('),effect=html.slice(effectStart,html.indexOf('\nfunction ',effectStart+1));
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const timers=new Map(),effects=[],renders=[],sounds=[],observed=[];let next=0;
 const element={textContent:'',className:'',hidden:false,style:{},classList:{add(){},remove(){}},querySelector(){return {textContent:''};},setAttribute(){},removeAttribute(){}};
 const window={AdvancedSkills:{observe:(m,done)=>observed.push({m,done}),reset(){}},devicePixelRatio:1};
 const context=vm.createContext({window,console,performance:{now:()=>1000},gameMode:'spectator',onlineTurnNumber:0,ONLINE_REVEAL_MS:1300,
  hp:{1:10,2:10},gauge:{1:8,2:8},enhanceTurns:{},blockSeal:{},ruinTurns:{},momentumBonus:{},lastAction:{},selectedAction:{},
  setTimeout:(fn,delay)=>(timers.set(++next,{fn,delay}),next),clearTimeout:id=>timers.delete(id),
  document:{getElementById:()=>element,querySelector:()=>null,querySelectorAll:()=>[]},
  battleLimits:()=>({maxGauge:window._spectatorRoomRules?.maxGauge??10}),stopTurnCountdownSE(){},onlineNow:()=>1000,clearOnlineTechniqueDescription(){},showBattleResult(){},
  updateBattleUI(){renders.push(copy({hp:context.hp,gauge:context.gauge,view:window.BattleResources.current(),match:window._spectatorSpecialMatch}));},
  showTechniqueReveal(a,b){window.confirmedRevealedActions=[a,b];},playBattleSituationSE:(...args)=>sounds.push(args),
  resetOnlineMatchState(){window.BattleEffects.cancel();window.BattleResources.cancel();},showScreen(){}});
 vm.runInContext(read('battle-timeline.js'),context);delete window.BattleCountdown;
 vm.runInContext(read('battle-effects.js'),context);
 const api=window.BattleEffects;window.BattleEffects={...api,play(options){effects.push(options);return true;},cancel(){}};
 vm.runInContext(spectator+'\n'+effect+'\nspectatorActive=true;',context);
 const call=(name,...args)=>vm.runInContext(name,context)(...args);
 const tick=()=>{const [id,timer]=[...timers].sort((a,b)=>a[1].delay-b[1].delay)[0]||[];assert(timer,'expected a scheduled visual callback');timers.delete(id);timer.fn();};
 return {context,window,effects,renders,sounds,observed,call,tick,timers};
}
const before={turn:1,hp:{1:7,2:20},gauge:{1:12,2:10},blockSeal:{1:false,2:false},enhanceTurns:{1:0,2:0},ruinTurns:{1:0,2:0},momentumBonus:{1:false,2:false},frozen:{1:0,2:0},poison:{1:2,2:0},specialSeal:{1:0,2:0},specialRuin:{1:0,2:0},specialMomentum:{1:0,2:0},lastAction:{1:null,2:null}};
const state={...before,matchId:'observed',turn:2,phase:'effect',resolvedTurn:1,foresightShield:true,roomRules:{mode:'custom',hp:20,initialGauge:14,maxGauge:20,skills:true,special:true},special:{version:3,max:30,gauge:{1:9,2:22}},before,
 hp:{1:7,2:17},gauge:{1:8,2:12},damageTo1:0,damageTo2:3,countdownEndsAt:500,revealAt:900,effectStartAt:1000,
 actions:{1:{id:15,data:{name:'Sブリーチ',type:'attack',skill:'tech1',cost:4,power:2,pierce:true,special:true,specialCost:12}},2:{id:0,data:{name:'チャージ',type:'charge',cost:0,power:0}}},
 resources:{foresightShield:true,before:{hp:before.hp,gauge:before.gauge},after:{hp:{1:7,2:17},gauge:{1:8,2:12},special:{1:9,2:22}},outcome:{paid1:8,paid2:10,charged1:8,charged2:12}}};
for(const known of [false,true]){
 const f=fixture();
 if(known)f.call('applySpectatorState',{...before,matchId:'observed',roomRules:state.roomRules,special:{version:3,gauge:{1:20,2:20}}});
 f.call('receiveSpectatorBattleState',copy(state),{});
 assert.deepEqual(copy(f.context.hp),before.hp,'joining an effect displays confirmed pre-action HP');
 assert.equal(f.window._spectatorRoomRules.hp,20);assert.equal(f.window._spectatorSpecialMatch.spectator,true);
 f.tick();f.tick();assert.equal(f.effects.length,1,'real playBattleEffect accepts complete resource inputs');
 assert.equal(f.effects[0].foresightShield,true);assert.equal(f.sounds[0][4],true);assert(f.effects[0].actions[0].special);
 const view=f.window.BattleResources.current();assert.equal(view.hp[2],20);assert.equal(view.gauge[1],8);
 if(known)assert.equal(view.special[1],8,'S cost is subtracted from the previous observed gauge');else assert.equal(view.special,null,'do not invent an unknown pre-action S gauge');
 f.effects[0].onFrame(500);assert.equal(f.window.BattleResources.current().hp[2],17);
 f.call('receiveSpectatorBattleState',copy(state),{});assert.equal(f.effects.length,1,'polling never replays the same action');
 const next={...state,phase:'battle',hp:{1:8,2:17},skillMatch:{state:{turn:2}}};
 f.call('receiveSpectatorBattleState',next,{});assert.equal(f.context.hp[1],7,'new skill values wait until the action completes');
 f.effects[0].onComplete();assert.deepEqual(copy(f.context.hp),next.hp);assert.equal(f.window.BattleResources.current(),null);assert.equal(f.observed.at(-1).m,next.skillMatch);
}
// Old snapshots without transition inputs can still render without crashing or inventing totals.
const old=fixture();old.call('receiveSpectatorBattleState',{...state,before:null,resources:{after:state.resources.after}},{});old.tick();old.tick();assert.equal(old.effects.length,1);assert.equal(old.window.BattleResources.current(),null);assert.deepEqual(copy(old.context.hp),state.hp);old.effects[0].onComplete();
const left=fixture();left.call('receiveSpectatorBattleState',copy(state),{});left.tick();left.tick();left.call('leaveSpectator');const count=left.renders.length;left.effects[0].onComplete();assert.equal(left.renders.length,count,'a late S-effect callback cannot repaint after leaving');assert.equal(left.timers.size,0);
// Normal and S Ruin have independent public counters, including S-only durations.
const indicators={},statuses={appendChild(el){indicators[el.id]=el;}};
const ruinContext=vm.createContext({window:{_spectatorSpecialMatch:{state:{specialRuin:{1:0,2:3}}}},rankedActive:false,gameMode:'spectator',ruinTurns:{1:0,2:0},document:{getElementById:id=>id.includes('Statuses')?statuses:indicators[id],createElement:()=>({classList:{add(){}},setAttribute(){}})}});
const ruinStart=html.indexOf('function updateRuinIndicators(');vm.runInContext(html.slice(ruinStart,html.indexOf('function updateActionChainIndicators(',ruinStart)),ruinContext);
vm.runInContext('updateRuinIndicators()',ruinContext);assert.equal(indicators.p2Ruin.hidden,false);assert.equal(indicators.p2Ruin.textContent,'Sルイン 3T');assert(!indicators.p2Ruin.title.includes('1ダメージ'));
ruinContext.ruinTurns[2]=2;vm.runInContext('updateRuinIndicators()',ruinContext);assert.equal(indicators.p2Ruin.textContent,'ルイン 2T / Sルイン 3T');
ruinContext.window._spectatorSpecialMatch.state.specialRuin[2]=0;vm.runInContext('updateRuinIndicators()',ruinContext);assert.equal(indicators.p2Ruin.textContent,'ルイン 2T');
console.log('PASS spectator + real resource/effect code: S move entry, HP/gauge/S costs, shield flag, queued skills, duplicate snapshots, old matches and exit cancellation');
