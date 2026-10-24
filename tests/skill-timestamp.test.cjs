const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {harness}=require('./rules-harness.cjs');
const rulesFile=process.env.SKILL_RULES_FILE;
const rules=rulesFile?JSON.parse(fs.readFileSync(path.resolve(rulesFile),'utf8').replace(/^\uFEFF/,'')).rules:undefined;
async function setup(mode='advanced'){
 const h=harness(rules);
 for(const p of [1,2])h.put('freeAccounts/p'+p,{name:'P'+p,rating:1000,guest:false,games:0,active:'',lastSettled:''});
 const roomRules={mode,hp:10,initialGauge:8,maxGauge:10,...(mode==='custom'?{skills:true,special:false}:{} )};
 h.commit({'friendRooms/timestamps':{host:'p2',name:'P2',createdAt:h.now(),heartbeat:h.now(),game:'',roomRules}},'p2');
 const id=(await h.transports[0]({op:'friendJoin',roomId:'timestamps'})).match.id;
 await h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:'boost'});
 const start=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:'heal'})).match;
 await h.transports[0]({op:'status',matchId:id});return {h,id,start};
}
(async()=>{
 // Model independent server and client clocks. Date.now() must never be used as
 // the authoritative receipt time, even with an estimated serverTimeOffset.
 const modes=rules&&!rules.freeGames.$game.advanced.customOptionsV1?['advanced']:['advanced','custom'];
 for(const mode of modes)for(const skew of [-750,-250,50,250,750])for(const side of [1,2]){
  const {h,id,start}=await setup(mode),update=h.ctx.update;
  h.setClock(start.skillWindow.startAt+1500);
  h.ctx.Date={now:()=>h.now()+skew};
  h.ctx.update=async(r,patch)=>{if(patch['advanced/current/'+side])h.setClock(h.now()+20);return update(r,patch);};
  await h.transports[side-1]({op:'advancedSkill',matchId:id,turn:1});
  const receipt=h.get('freeGames/'+id+'/advanced/current/'+side);
  assert.equal(receipt.at,h.now(),'receipt time is assigned by RTDB at commit');
  assert.deepEqual(h.denials,[],'valid clicks tolerate clock-estimate errors');
 }
 const delayed=await setup(),delayedUpdate=delayed.h.ctx.update;
 delayed.h.setClock(delayed.start.skillWindow.startAt+1000);
 delayed.h.ctx.update=async(r,patch)=>{if(patch['advanced/current/1'])delayed.h.setClock(delayed.h.now()+1000);return delayedUpdate(r,patch);};
 await delayed.h.transports[0]({op:'advancedSkill',matchId:delayed.id,turn:1});
 assert.deepEqual(delayed.h.denials,[],'a slow write arriving during the window is still valid');
 // Both sides still share the same confirmation/presentation boundary.
 for(const delay of [0,100,499,500]){
  const {h,id,start}=await setup(),update=h.ctx.update,clicked=start.skillWindow.endAt-1;
  h.setClock(clicked);
  h.ctx.update=async(r,patch)=>{if(patch['advanced/current/1'])h.setClock(h.now()+delay);return update(r,patch);};
  const result=await h.transports[0]({op:'advancedSkill',matchId:id,turn:1});
  assert.equal(h.get('freeGames/'+id+'/advanced/current/1/at'),clicked+delay);
  assert.equal(result.match.opensAt,start.skillWindow.confirmAt+3100);
  assert.equal(result.match.deadline-result.match.opensAt,10000);
 }
 const {h,id,start}=await setup();
 for(const time of [start.skillWindow.startAt-1,start.skillWindow.confirmAt,start.skillWindow.confirmAt+1000]){
  h.setClock(time);const receipt={id:'boost',turn:1,at:time,used:1};
  assert.throws(()=>h.commit({['freeGames/'+id+'/advanced/current/1']:receipt,['freeGames/'+id+'/advanced/uses/1/1']:receipt},'p1'),/permission_denied/);
 }
 // A backdated legacy timestamp cannot bypass the common confirmation deadline.
 h.setClock(start.skillWindow.confirmAt);
 const receipt={id:'boost',turn:1,at:start.skillWindow.endAt,used:1};
 assert.throws(()=>h.commit({['freeGames/'+id+'/advanced/current/1']:receipt,['freeGames/'+id+'/advanced/uses/1/1']:receipt},'p1'),/permission_denied/);
 console.log('PASS: independent client clocks, both players, '+modes.join('/')+', bounded server receipt timing and shared presentation');
})().catch(error=>{console.error(error);process.exitCode=1;});
