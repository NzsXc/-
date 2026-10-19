const assert=require('node:assert/strict'),fs=require('node:fs');
const S=require('../advanced/special-rules.js'),{harness}=require('./rules-harness.cjs');
const A=require('../advanced/rules.js');
const read=f=>fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8');
function game(h){
 const p='freeGames/match';h.put(p+'/kind','friend');h.put(p+'/rulesVersion',2);
 h.put(p+'/roomRules',{mode:'advanced',hp:10,initialGauge:8,maxGauge:10,skills:false,special:true});h.put(p+'/special',S.initial());h.put(p+'/state/skillsExhausted',true);h.setClock(5600);return p;
}
(async()=>{
 assert.deepEqual(S.advance(S.initial(),{damage1:3,damage2:0,type1:'charge',type2:'block'}).gauge,{1:5,2:1});
 assert.deepEqual(S.advance({...S.initial(),gauge:{1:29,2:30}},{damage1:7,damage2:0,type1:'charge',type2:'block'}).gauge,{1:30,2:30});
 const legacy={max:30,gauge:{1:0,2:0}};assert.equal(S.advance(legacy,{}),legacy);
 for(const [moves,want]of [[[0,3],[4,1]],[[1,2],[1,1]],[[9,2],[3,1]],[[14,0],[2,2]]]){
  const h=harness(),p=game(h);h.put(p+'/loadouts/1',[0,6,11]);h.put(p+'/loadouts/2',[0,1,2]);
  await h.transports[0]({op:'action',matchId:'match',turn:1,action:moves[0]});
  const next=(await h.transports[1]({op:'action',matchId:'match',turn:1,action:moves[1]})).match;
  assert.deepEqual([next.special.gauge[1],next.special.gauge[2]],want,JSON.stringify(moves));
  await h.transports[0]({op:'status',matchId:'match'});await h.transports[1]({op:'status',matchId:'match'});
  assert.deepEqual(h.get(p+'/special/gauge'),{1:want[0],2:want[1]},'polling never charges twice');
  assert.throws(()=>h.commit({[p+'/special/gauge/1']:30},'p1'),/permission_denied/);
 }
 const h=harness(),p=game(h);h.put(p+'/state/ruin1',3);
 await h.transports[0]({op:'action',matchId:'match',turn:1,action:0});const n=(await h.transports[1]({op:'action',matchId:'match',turn:1,action:2})).match;
 assert.equal(n.special.gauge[1],3,'charge + ruin damage + turn');
 const v=harness(),vp=game(v),s=v.get(vp+'/state'),m={1:0,2:1},calc=require('node:vm').runInContext('calculate',v.ctx);
 const result=A.resolve(s,m,{1:'invincible'},{1:{id:'invincible'}},calc,{...v.get(vp+'/roomRules'),skills:true});
 assert.equal(S.advance(S.initial(),result).gauge[1],2,'prevented damage gives no charge');
 const cap=harness(),cp=game(cap);cap.put(cp+'/special/gauge',{1:29,2:30});
 await cap.transports[0]({op:'action',matchId:'match',turn:1,action:0});
 const capped=(await cap.transports[1]({op:'action',matchId:'match',turn:1,action:0})).match;
 assert.deepEqual([capped.special.gauge[1],capped.special.gauge[2]],[30,30]);
 const omitted=harness(),op=game(omitted),update=omitted.ctx.update;
 omitted.ctx.update=async(r,patch)=>{const copy={...patch};if(copy.state)delete copy.special;return update(r,copy);};
 await omitted.transports[0]({op:'action',matchId:'match',turn:1,action:0});
 await assert.rejects(()=>omitted.transports[1]({op:'action',matchId:'match',turn:1,action:1}),/permission_denied/);
 assert.equal(omitted.get(op+'/state/turn'),1,'state cannot advance without gauge');
 assert.deepEqual(omitted.get(op+'/special/gauge'),{1:0,2:0});
 const unsupported=JSON.parse(read('firebase-database.rules.json')).rules;delete unsupported.freeGames.$game.advanced.specialGaugeV1;
 assert.equal(await harness(unsupported).transports[0].supportsSpecialGauge(),false);
 console.log('PASS additive damage, turns, charge, mirror, self-damage, ruin, invincibility, cap, legacy, retries and unpublished protocol');
})().catch(e=>{console.error(e);process.exitCode=1;});
