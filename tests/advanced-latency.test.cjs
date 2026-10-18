const assert=require('node:assert/strict'),{harness}=require('./rules-harness.cjs'),A=require('../advanced/rules.js');
async function setup(){
 const h=harness();for(const p of [1,2])h.put('freeAccounts/p'+p,{name:'P'+p,rating:1000,guest:false,games:0,active:'',lastSettled:''});
 h.commit({'friendRooms/latency':{host:'p2',name:'P2',createdAt:h.now(),heartbeat:h.now(),game:'',roomRules:{mode:'advanced',hp:10,initialGauge:8,maxGauge:10}}},'p2');
 const id=(await h.transports[0]({op:'friendJoin',roomId:'latency'})).match.id;
 await h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:'boost'});
 const start=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:'heal'})).match;
 await h.transports[0]({op:'status',matchId:id});return {h,id,start};
}
(async()=>{
 for(const delay of [0,100,300,A.GRACE_MS]){
  const {h,id,start}=await setup(),events=[],get=h.ctx.get,update=h.ctx.update;
  h.ctx.get=async r=>{events.push('read');return get(r);};
  h.ctx.update=async(r,patch)=>{if(patch['advanced/current/1']){events.push('write');h.setClock(h.now()+delay);}return update(r,patch);};
  const clicked=start.skillWindow.endAt-1;h.setClock(clicked);
  const m=(await h.transports[0]({op:'advancedSkill',matchId:id,turn:1})).match;
  assert.equal(events[0],'write','the displayed snapshot sends before profile/participant/status reads');
  assert.equal(h.get('freeGames/'+id+'/advanced/current/1/at'),clicked,'the receipt retains the click time');
  assert.equal(m.advanced.current[1].used,1);assert.equal(m.state.gauge[1],8,'late acceptance still waits for effects');
  assert.equal(m.opensAt,start.skillWindow.confirmAt+A.CUTIN_MS+A.EFFECT_MS);
  assert.equal(m.deadline-m.opensAt,10000);assert.deepEqual(h.denials,[],'valid delayed clicks never hit permission_denied');
  await h.transports[0]({op:'advancedSkill',matchId:id,turn:1});assert.equal(h.get('freeGames/'+id+'/advanced/current/1/used'),1);
 }
 const tooSlow=await setup(),slowUpdate=tooSlow.h.ctx.update;tooSlow.h.ctx.update=async(r,patch)=>{if(patch['advanced/current/1'])tooSlow.h.setClock(tooSlow.h.now()+A.GRACE_MS+1);return slowUpdate(r,patch);};
 tooSlow.h.setClock(tooSlow.start.skillWindow.endAt-1);await assert.rejects(()=>tooSlow.h.transports[0]({op:'advancedSkill',matchId:tooSlow.id,turn:1}),/permission_denied/);
 assert.equal(tooSlow.h.get('freeGames/'+tooSlow.id+'/advanced/current/1'),null,'unbounded delayed or stale writes are rejected');
 const late=await setup();late.h.setClock(late.start.skillWindow.endAt);await assert.rejects(()=>late.h.transports[0]({op:'advancedSkill',matchId:late.id,turn:1}),/3秒間/);assert.deepEqual(late.h.denials,[],'clicks at/after the UI deadline are rejected before writing');
 for(const at of [late.h.now()+1,late.h.now()-A.GRACE_MS-1]){const receipt={id:'boost',turn:1,at,used:1};assert.throws(()=>late.h.commit({['freeGames/'+late.id+'/advanced/current/1']:receipt,['freeGames/'+late.id+'/advanced/uses/1/1']:receipt},'p1'),/permission_denied/,'forged future or excessively old click times are rejected');}
 const pair=await setup(),pending=[],pairUpdate=pair.h.ctx.update;
 pair.h.ctx.update=(r,patch)=>patch['advanced/current/1']||patch['advanced/current/2']?new Promise((resolve,reject)=>pending.push(()=>Promise.resolve(pairUpdate(r,patch)).then(resolve,reject))):pairUpdate(r,patch);
 pair.h.setClock(pair.start.skillWindow.endAt-1);
 const commands=pair.h.transports.map(t=>t({op:'advancedSkill',matchId:pair.id,turn:1}));
 assert.equal(pending.length,2,'both devices send their receipt immediately');pair.h.setClock(pair.start.skillWindow.endAt+A.GRACE_MS-1);pending.forEach(send=>send());
 const results=await Promise.all(commands);
 for(const {match}of results){assert.equal(Object.keys(A.forTurn(match.advanced,1)).length,2);assert.equal(match.opensAt,pair.start.skillWindow.confirmAt+3100);}
 assert.deepEqual(pair.h.denials,[]);
 console.log('PASS: zero prerequisite reads, last-millisecond clicks delivered 0–500 ms later, simultaneous devices, duplicate protection, full input time and bounded late-write rejection under actual DB rules');
})().catch(error=>{console.error(error);process.exitCode=1;});
