const assert=require('node:assert/strict');
const V=require('../combat-v4.js'),A=require('../advanced/rules.js'),S=require('../advanced/special-rules.js'),AI=require('../bot-engine.js');
global.SpecialRules=S;
const D=require('../guide-detail-data.js'),R=require('../guide-replay-core.js'),votes=require('../community-rating-core.js');
const catalog=Array(41);
['charge','attack','block'].forEach((id,i)=>catalog[i]={...AI.ACTIONS[i],id,actionId:i,category:'basics'});
AI.techniques.forEach((a,i)=>{catalog[V.normalId(i)]={...a,id:a.skill,actionId:V.normalId(i),category:'techniques'};catalog[V.specialId(i)]={...S.actionData(V.specialId(i),AI.techniques),id:'s-'+a.skill,actionId:V.specialId(i),category:'specialTechniques'};});
const items=[...catalog,...A.SKILLS.map(a=>({...a,category:'skills'}))].filter(Boolean),plans={};
assert.equal(items.length,47);
for(const item of items){
 const data=D.entry(item.id);assert.equal(data.ownerScore,null);assert(data.aiScore>=1&&data.aiScore<=10);assert(data.strength&&data.weakness&&data.aiText);assert.equal(data.scenes.length,2);
 plans[item.id]=data.scenes.map(scene=>R.build(item,catalog,scene));
 for(const plan of plans[item.id])for(const turn of plan.turns)for(const p of [1,2]){assert(turn.after['hp'+p]>=0&&turn.after['hp'+p]<=12);assert(turn.after['gauge'+p]>=0&&turn.after['gauge'+p]<=10);assert(turn.specialAfter.gauge[p]>=0&&turn.specialAfter.gauge[p]<=30);}
}
assert.equal(plans.tech1[0].final.damage2,1,'normal Breach pierces Block for one damage');
assert.equal(plans['s-tech1'][0].final.damage1,0);assert.equal(plans['s-tech1'][0].final.damage2,2,'S Breach wins a clash against Blast');
assert.equal(plans.tech13[0].final.gauge1,3);assert.equal(plans['s-tech13'][0].final.gauge1,5);assert.equal(plans.tech13[1].final.gauge1,0);
assert.equal(plans.tech14[0].final.hp1,5);assert.equal(plans['s-tech14'][0].final.hp1,6,'S Convert restores only this attack, not pre-existing missing HP');
assert.equal(plans.tech16[0].turns[1].moves[2],-1,'frozen CP cannot act');
assert.equal(plans.tech18[0].final.hp2,6,'both poison ticks are demonstrated');
assert.equal(plans.chain[0].turns[0].after.damage1,0,'skill enables the otherwise illegal consecutive Block');
assert.equal(plans.cleanse[0].turns[0].preview.seal1,false);
assert.equal(plans.invincible[0].final.damage1,0);
assert.equal(plans.stance[0].final.damage2,1,'stance changes an Attack clash');
assert.equal(votes.categories.basics,undefined,'basic actions do not acquire voting');
// Same ownership and score validation as existing player votes.
const {harness}=require('./rules-harness.cjs'),h=harness();h.put('users/p1',{name:'p1'});
for(const category of Object.keys(votes.categories))for(const id of votes.categories[category]){
 h.commit({['communityRatings/'+category+'/p1']:{[votes.categories[category][0]]:7,[id]:8}},'p1');
 for(const score of [0,11,1.5,'8'])assert.throws(()=>h.commit({['communityRatings/'+category+'/p1']:{[id]:score}},'p1'),/permission_denied/);
 assert.throws(()=>h.commit({['communityRatings/'+category+'/p1']:{[id]:8}},'p2'),/permission_denied/);
}
console.log('PASS 47 detail entries, 94 legal production-calculated scenes, delayed effects, score bounds and vote ownership');
