const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {harness}=require('./rules-harness.cjs'),A=require('../advanced/rules.js');
const root=path.resolve(__dirname,'..'),rules=JSON.parse(fs.readFileSync(path.join(root,'firebase-database.rules.json'),'utf8'));
// Firebase rejects numeric comparisons with null. JavaScript's null >= 1 would
// silently return false, so enforce null rejection at these two numeric reads.
// Treat evaluation errors as denied, just as the real Rules Playground does.
function strictNullRules(document){
 const out=structuredClone(document),flag=out.rules.freeGames.$game.state.skillsExhausted;
 const expression=flag['.validate'].replace(/(\.child\('advanced\/current\/[12]\/used'\))\.val\(\)/g,'$1.val().valueOf()');
 flag['.validate']=`(()=>{try{return (${expression});}catch(error){return false;}})()`;
 return out.rules;
}
async function join(document,a='cleanse',b='boost'){
 const h=harness(strictNullRules(document));
 for(const p of [1,2])h.put('freeAccounts/p'+p,{name:'P'+p,rating:1000,guest:false,games:0,active:'',lastSettled:''});
 const settings={mode:'advanced',hp:10,initialGauge:8,maxGauge:10};
 h.commit({'friendRooms/unused':{host:'p2',name:'P2',createdAt:h.now(),heartbeat:h.now(),game:'',roomRules:settings}},'p2');
 const id=(await h.transports[0]({op:'friendJoin',roomId:'unused'})).match.id;
 await h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:a});
 const match=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:b})).match;
 return {h,id,match};
}
async function advance(f,match){
 f.h.setClock(match.opensAt);
 await f.h.transports[0]({op:'action',matchId:f.id,turn:match.state.turn,action:1});
 return (await f.h.transports[1]({op:'action',matchId:f.id,turn:match.state.turn,action:1})).match;
}
(async()=>{
 const original=JSON.parse(cp.execFileSync('git',['show','da36ac480f5da3b93e0e5faa933c1e1459b5998f:firebase-database.rules.json'],{cwd:root,encoding:'utf8'}));
 // Isolate the historical null-comparison defect from the newer protocol gate.
 original.rules.freeGames.$game.advanced.attackStance=rules.rules.freeGames.$game.advanced.attackStance;
 const broken=await join(original);await assert.rejects(()=>advance(broken,broken.match),/permission_denied/);
 assert.equal(broken.h.get('freeGames/'+broken.id+'/state/turn'),1,'the original rule reproduces a stalled first turn');
 for(const a of A.SKILLS)for(const b of A.SKILLS){
  const f=await join(rules,a.id,b.id);let match=f.match;
  for(let turn=1;turn<=3;turn++){
   match=await advance(f,match);assert.equal(match.state.turn,turn+1);assert.equal(match.state.skillsExhausted,false);
   assert.equal(match.skillWindow.endAt-match.skillWindow.startAt,3000);
  }
  assert.deepEqual(f.h.denials,[],'unused skills must never block a transition');
 }
 // Player 1 has spent their final use, but player 2 still has no receipt at all.
 const one=await join(rules);one.h.setClock(one.match.skillWindow.startAt);
 const used=(await one.h.transports[0]({op:'advancedSkill',matchId:one.id,turn:1})).match;
 assert.equal((await advance(one,used)).state.skillsExhausted,false);assert.deepEqual(one.h.denials,[]);
 const both=await join(rules,'cleanse','cleanse');both.h.setClock(both.match.skillWindow.startAt);
 await both.h.transports[0]({op:'advancedSkill',matchId:both.id,turn:1});
 const bothUsed=(await both.h.transports[1]({op:'advancedSkill',matchId:both.id,turn:1})).match;
 const spent=await advance(both,bothUsed);assert.equal(spent.state.skillsExhausted,true);assert.equal(spent.skillWindow.startAt,spent.skillWindow.endAt);
 const fresh=await join(rules),before=fresh.h.copy(),after=fresh.h.copy();after.freeGames[fresh.id].state.skillsExhausted=true;
 assert.equal(fresh.h.evaluate(strictNullRules(rules).freeGames.$game.state.skillsExhausted['.validate'],before,after,'freeGames/'+fresh.id+'/state/skillsExhausted','p1',{$game:fresh.id}),false,'missing receipts cannot forge exhaustion');
 assert(Buffer.byteLength(JSON.stringify(rules,null,1)+'\n')<256*1024);
 console.log('PASS: original first-turn denial reproduced with strict null semantics; 36 skill pairs across 3 unused turns, one-sided final use, both exhausted and forged flag rejection');
})().catch(error=>{console.error(error);process.exitCode=1;});

