const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),plain=v=>JSON.parse(JSON.stringify(v));
const calc=vm.runInNewContext(read('free-calculator.js').replaceAll('export ','')+'\ncalculate'),catalog=require('../bot-engine.js').ACTIONS;
const S=require('../advanced/special-rules.js');
const ctx=vm.createContext({window:{}});vm.runInContext(read('battle-timeline.js')+read('battle-effects.js'),ctx);
const resources=ctx.window.BattleResources,effects=ctx.window.BattleEffects;
const seed={turn:1,hp1:7,hp2:8,gauge1:8,gauge2:6,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,...S.extraState()};
const board=s=>({hp:{1:s.hp1,2:s.hp2},gauge:{1:s.gauge1,2:s.gauge2}});
function caseOf(a,b,state=seed,version=3,rules={hp:10,maxGauge:10}){
 const raw=[a,b].map(id=>id<15?catalog[id]:{...catalog[id-12],special:true,specialCost:S.definition(id).cost}),out=calc(state,{1:a,2:b},version,rules,{},true),damage=[out.damage1,out.damage2];
 const before={...board(state),special:{1:30,2:30}},after={...board(out),special:S.advance({...S.initial(3),gauge:{1:30,2:30}},out).gauge};
 const plan=effects.createPlan(raw,{rawActions:raw,damage}),input={before,after,outcome:out,actions:plan.players.map(p=>p.action),rawActions:raw,damage,impacts:plan.events,maxGauge:rules.maxGauge};
 return {input,out,plan,view:resources.begin(input)};
}
// HP changes on the actual impact, not on effect completion, including reflection/clashes.
for(const [a,b]of [[1,0],[3,1],[1,4],[5,0],[6,1],[9,1],[14,3],[15,3]]){
 const {view,plan,out}=caseOf(a,b);
 for(const hit of plan.events){view.tick(hit.at-.01);const p=hit.side;assert.equal(view.current().hp[p],out['healed'+p]);view.tick(hit.at);assert.equal(view.current().hp[p],out['hp'+p]);view.tick(hit.at);assert.equal(view.current().hp[p],out['hp'+p],'repeat frame cannot apply damage twice');}
 view.finish();assert.equal(resources.current(),null);
}
{
 const {view,out}=caseOf(1,0);assert.equal(view.current().gauge[1],7,'cost is visible at cast');assert.equal(view.current().gauge[2],6);
 view.tick(299);assert.equal(view.current().gauge[2],6);view.tick(300);assert.equal(view.current().gauge[2],8,'charge appears during the effect');view.tick(440);assert.equal(view.current().hp[2],out.hp2);view.finish();
}
for(const [a,b,state]of [[12,0,seed],[12,12,seed],[12,0,{...seed,gauge1:10,gauge2:0}],[12,12,{...seed,gauge1:3,gauge2:3}]]){
 const {view,input}=caseOf(a,b,state);view.tick(649);const before=plain(view.current().gauge);view.tick(650);const after=plain(view.current().gauge);if((input.outcome.stolen1>0)!==(input.outcome.stolen2>0))assert.notDeepEqual(after,before,'first packet changes the live gauge');view.tick(900);assert.deepEqual(plain(view.current().gauge),plain(input.after.gauge));view.finish();
}
// Check intermediate bounds and exact confirmed end values across all old/S combinations.
let cases=0;
for(const version of [2,3])for(const state of [seed,{...seed,hp1:10,hp2:1,gauge1:10,gauge2:0,ruin1:2,specialRuin1:2}, {...seed,gauge1:3,gauge2:3,seal1:true,momentum2:true,enhance1:2}])for(let a=0;a<(version===3?27:15);a++)for(let b=0;b<(version===3?27:15);b++){
 const c=caseOf(a,b,state,version),unchanged=JSON.stringify(c.input);
 for(const t of [0,140,300,370,440,650,740,830,1200,1800]){
  c.view.tick(t);const v=c.view.current();for(const p of [1,2]){assert(v.hp[p]>=0&&v.hp[p]<=10);assert(v.gauge[p]>=0&&v.gauge[p]<=10);assert(v.special[p]>=0&&v.special[p]<=30);}
 }
 assert.deepEqual(plain(c.view.current().hp),plain(c.input.after.hp),a+','+b+' HP');assert.deepEqual(plain(c.view.current().gauge),plain(c.input.after.gauge),a+','+b+' gauge');
 assert.equal(JSON.stringify(c.input),unchanged,'visual frames never mutate confirmed state');c.view.finish();cases++;
}
{
 const first=caseOf(1,0).view,second=caseOf(0,0).view;first.cancel();assert(second.current(),'cancel from an old effect cannot clear a newer one');first.finish();assert(second.current());second.cancel();assert.equal(resources.current(),null);
}
// Busy event loops and late snapshots still paint each unshown digit for one full second.
function clockFixture(){let now=0,id=0;const jobs=new Map(),events=[];const c=vm.createContext({window:{},performance:{now:()=>now},setTimeout:(fn,ms)=>{jobs.set(++id,{at:now+ms,fn});return id;},clearTimeout:n=>jobs.delete(n)});vm.runInContext(read('battle-timeline.js'),c);return {api:c.window.BattleCountdown,events,set(t){now=t;},advance(t,stalled=false){if(stalled)now=t;let job;while((job=[...jobs].filter(([,j])=>j.at<=t).sort((a,b)=>a[1].at-b[1].at)[0])){jobs.delete(job[0]);if(!stalled)now=job[1].at;job[1].fn();}now=t;},start(key='m'){c.window.BattleCountdown.start(key,{show:n=>events.push([n,now]),onComplete:()=>events.push(['battle',now])});}};}
{
 const c=clockFixture();c.set(5000);c.start();c.advance(8000);assert.deepEqual(c.events,[[3,5000],[2,6000],[1,7000],['battle',8000]]);
 const d=clockFixture();d.start();d.advance(5000,true);assert.deepEqual(d.events,[[3,0],[2,5000]]);d.advance(7000);assert.deepEqual(d.events,[[3,0],[2,5000],[1,6000],['battle',7000]]);
 const e=clockFixture();e.api.observe('m',3,0);e.api.observe('m',2,1000);e.set(1500);e.start();e.advance(3000);assert.deepEqual(e.events,[[2,1500],[1,2000],['battle',3000]],'continue the visible last seconds without resetting to 3');
 const f=clockFixture();f.start();f.api.cancel();f.advance(9000);assert.equal(f.events.length,1,'leaving cannot trigger delayed effects');
}
console.log('PASS: '+cases+' normal/S outcomes, impact HP, charge, Siphon packets, caps, reflection, healing, no mutation/double apply, cancellation and late/stalled 3-2-1');

(async()=>{
 const h=require('./rules-harness.cjs').harness(),first=(await h.transports[0]({op:'status',matchId:'match'})).match;
 h.setClock(first.opensAt);await h.transports[0]({op:'action',matchId:'match',turn:1,action:1});await h.transports[1]({op:'action',matchId:'match',turn:1,action:0});
 const peers=await Promise.all(h.transports.map(t=>t({op:'status',matchId:'match'}))),stored=h.get('freeGames/match/transition');
 for(const {match}of peers){const r=match.reveal.resources;assert(r);for(const p of [1,2]){assert.equal(r.after.hp[p],stored['hp'+p]);assert.equal(r.after.gauge[p],stored['gauge'+p]);for(const k of ['paid','charged','healed','rampage','stolen'])assert.equal(r.outcome[k+p],stored[k+p]);}}
 assert.deepEqual(h.denials,[]);assert.equal(h.updates.length,1,'presentation adds no writes or extra turn resolutions');console.log('PASS actual transport/rules: both peers receive identical confirmed resource checkpoints, one resolution, no extra writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
