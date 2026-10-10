const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');let clock=5600;
const storage={
 freeAccounts:{p1:{name:'A',rating:1000,active:'match'},p2:{name:'B',rating:1000,active:'match'}},
 freeGames:{match:{players:{1:'p1',2:'p2'},createdAt:0,ready:{1:true,2:true},loadouts:{1:[0,1,2],2:[0,1,2]},kind:'random',profiles:{1:{name:'A',rating:1000,titles:{0:'',1:'',2:''}},2:{name:'B',rating:1000,titles:{0:'',1:'',2:''}}}}}
};
const read=p=>p.split('/').reduce((v,k)=>v?.[k],storage)??null;
function write(p,value){const keys=p.split('/'),last=keys.pop();let node=storage;for(const key of keys)node=node[key]??=( {} );node[last]=structuredClone(value);}
const transportContext=vm.createContext({window:{},console,Date:{now:()=>clock},setTimeout,clearTimeout,Promise,ref:(_db,p)=>p,get:async p=>({val:()=>structuredClone(read(p))}),set:async(p,v)=>write(p,v),update:async(p,v)=>{for(const [k,value]of Object.entries(v))write((p?p+'/':'')+k,value);},serverTimestamp:()=>clock,onValue:()=>()=>{},runTransaction:async(p,fn)=>{const value=fn(read(p));if(value!==undefined)write(p,value);},historyMatch:()=>null,push:()=>({key:'unused'})});
vm.runInContext(fs.readFileSync(path.join(root,'free-calculator.js'),'utf8').replaceAll('export ',''),transportContext);
vm.runInContext(fs.readFileSync(path.join(root,'free-transport.js'),'utf8').replace(/^import[^\n]*\n/gm,'').replace('export function','function'),transportContext);
storage.freeGames.match.state=Object.fromEntries(vm.runInContext('stateFields',transportContext).map(k=>[k,k==='turn'?1:k==='startedAt'?0:k.startsWith('hp')?10:k.startsWith('gauge')?8:k.startsWith('seal')||k.startsWith('momentum')?false:k.startsWith('last')?'':0]));
const transports=[1,2].map(side=>vm.runInContext('createFreeTransport({}, {currentUser:{uid:"p'+side+'"}})',transportContext));
function client(){
 let next=1;const jobs=new Map(),events=[],elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',className:'',hidden:true,classList:{add(){},remove(){},toggle(){}},appendChild(){},replaceChildren(){},style:{}});return elements.get(id);};
 const schedule=(fn,delay=0)=>{const id=next++;jobs.set(id,{at:clock+Math.max(0,delay),fn});return id;};
 const ctx=vm.createContext({console,window:{rankedTransport:{transitionMs:transports[0].transitionMs}},performance:{now:()=>clock},Date:{now:()=>clock},setTimeout:schedule,clearTimeout:id=>jobs.delete(id),requestAnimationFrame:fn=>schedule(fn,16),cancelAnimationFrame:id=>jobs.delete(id),document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>element('dummy')},PlayerIntro:{cancel(){},reset(){},start(){},DURATION_MS:4300},syncBattleInspector(){},stopCountdownRing(){},startTurnCountdownSE(){},stopTurnCountdownSE(){},setCountdownRingStep(){},setupActionNames(){},setPlayerNames(){},updateBattleUI(){},botDisplayName:()=>'',showScreen(){},basicActions:{charge:{name:'Charge',type:'charge'},attack:{name:'Attack',type:'attack'},block:{name:'Block',type:'block'}},techniquePool:[],gameMode:'ranked',selectedTechniques:{},player1Techs:[],player2Techs:[],hp:{},gauge:{},blockSeal:{},enhanceTurns:{},momentumBonus:{},ruinTurns:{},lastAction:{},locked:{},selectingPlayer:1,ONLINE_REVEAL_MS:1300,playBattleSituationSE(){},showTechniqueReveal(){events.push({event:'reveal',at:clock});},playBattleEffect(_a,_b,done){events.push({event:'effect',at:clock});schedule(()=>{events.push({event:'effect-end',at:clock});done();},1200);}});
 vm.runInContext(fs.readFileSync(path.join(root,'ranked-client.js'),'utf8'),ctx);vm.runInContext('rankedActive=true',ctx);
 return{ctx,events,apply(m){ctx.snapshot=m;vm.runInContext('rankedApply(snapshot)',ctx);},advance(at){let job;while((job=[...jobs].filter(([,v])=>v.at<=at).sort((a,b)=>a[1].at-b[1].at)[0])){jobs.delete(job[0]);clock=job[1].at;job[1].fn(clock);}clock=at;},state(){return vm.runInContext('({animating:rankedAnimating,opensAt:rankedTurnOpensAt,deadline:rankedTurnDeadline,display:document.getElementById("countdown").textContent})',ctx);}};
}
(async()=>{
 const clients=[client(),client()];
 for(let side=0;side<2;side++)clients[side].apply((await transports[side]({op:'status',matchId:'match'})).match);
 const results=[];
 for(const remaining of [7000,2200,200]){
  const initial=(await transports[0]({op:'status',matchId:'match'})).match,at=initial.deadline-remaining;
  for(const c of clients)c.advance(at);
  const currentTurn=initial.state.turn;
  await transports[0]({op:'action',matchId:'match',turn:currentTurn,action:1});
  await transports[1]({op:'action',matchId:'match',turn:currentTurn,action:1});
  const snapshots=await Promise.all(transports.map(t=>t({op:'status',matchId:'match'}).then(r=>r.match)));
  assert.equal(snapshots[0].opensAt,snapshots[1].opensAt);assert.equal(snapshots[0].opensAt,at+6100);
  clients.forEach((c,i)=>c.apply(snapshots[i]));
  for(const c of clients)c.advance(at+17);
  const numeric=clients.map(c=>Number(c.state().display));assert(numeric.every(n=>!Number.isFinite(n)||n<=Math.ceil(remaining/1000)));
  const opensAt=snapshots[0].opensAt;
  for(const c of clients)c.advance(opensAt+17);
  for(const c of clients){const ended=c.events.filter(e=>e.event==='effect-end').at(-1);assert.equal(ended.at,at+6000);assert.equal(opensAt-ended.at,100);assert.equal(c.state().animating,false);assert.equal(c.state().display,'10');assert.equal(c.state().deadline-opensAt,10000);}
  // Both sides can immediately submit the next legal move at the exposed opening.
  const available=(await transports[0]({op:'status',matchId:'match'})).match;assert.equal(available.state.turn,currentTurn+1);
  results.push({remaining,turn:currentTurn,transitionAt:at,effectEnd:at+6000,nextInput:opensAt,idleMs:100,nextInputMs:10000});
  const accepted=await transports[0]({op:'action',matchId:'match',turn:currentTurn+1,action:1});
  assert.equal(accepted.match.ownAction,1);assert.equal(accepted.match.state.turn,currentTurn+1);
 }
 console.log(JSON.stringify(results));console.log('PASS: actual transport and two clients over three turns, early/late commits, 100 ms post-effect gap, full 10-second input, no countdown increase');
})().catch(e=>{console.error(e);process.exitCode=1});
