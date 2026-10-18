const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness,evaluate}=require('./rules-harness.cjs'),A=require('../advanced/rules.js');
const root=path.resolve(__dirname,'..'),source=p=>fs.readFileSync(path.join(root,p),'utf8'),plain=v=>JSON.parse(JSON.stringify(v));
const rules=JSON.parse(source('firebase-database.rules.json')).rules,settings={mode:'advanced',hp:10,initialGauge:8,maxGauge:10};
const calc=vm.runInNewContext(source('free-calculator.js').replaceAll('export ','')+'\ncalculate');
const base={turn:1,startedAt:0,hp1:7,hp2:8,gauge1:8,gauge2:6,seal1:true,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:2,ruin2:0,last1:'block',last2:'reflect',misses1:0,misses2:0};
const record=(id,turn=1)=>({id,turn,at:6000});
function ledger(a,b,turn=1){return {selected:{1:a,2:b},current:{1:{...record(a,turn),used:1},2:{...record(b,turn),used:1}},uses:{1:{1:record(a,turn)},2:{1:record(b,turn)}}};}
function fresh(){const h=harness();for(const p of [1,2])h.put('freeAccounts/p'+p,{name:p===1?'A':'B',rating:1000,guest:false,games:0,active:'',lastSettled:''});return h;}
async function join(a='boost',b='invincible'){
 const h=fresh();h.commit({'friendRooms/advancedRoom':{host:'p2',name:'B',createdAt:h.now(),heartbeat:h.now(),game:'',roomRules:settings}},'p2');
 const m=(await h.transports[0]({op:'friendJoin',roomId:'advancedRoom'})).match,id=m.id;
 await assert.rejects(()=>h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2]}),/スキルを1つ/);
 await h.transports[0]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:a});
 const start=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:b})).match;
 return {h,id,start};
}
(async()=>{
 assert(Buffer.byteLength(source('firebase-database.rules.json'))<256*1024,'rules source must stay within the deployment size budget');
 assert.deepEqual(A.SKILLS.map(s=>s.limit),[3,2,5,1,2]);
 assert.equal(A.WINDOW_MS,3000);
 const legacy=JSON.parse(require('node:child_process').execFileSync('git',['show','7e6eef35b49cb3314fb6e3eaea75e4a84062483f:firebase-database.rules.json'],{cwd:root,encoding:'utf8'})).rules;
 assert.equal(await harness(legacy).transports[0].supportsAdvanced(),false,'3-second client rejects the old 2-second server protocol');
 const previousRules=JSON.parse(require('node:child_process').execFileSync('git',['show','4b1c8d309ba3ad998194b253f551d914832956aa:firebase-database.rules.json'],{cwd:root,encoding:'utf8'})).rules;
 assert.equal(await harness(previousRules).transports[0].supportsAdvanced(),false,'new clients require the exhausted-window protocol before creating an Advanced room');
 const shield={1:'invincible',2:'boost'},active={1:record('invincible')};
 assert.equal(A.resolve(base,{1:0,2:5},shield,active,calc,settings).damage1,0,'opponent attack and ruin are blocked');
 assert.equal(A.resolve(base,{1:9,2:1},shield,active,calc,settings).damage1,2,'Rampage self-damage remains');
 assert.equal(A.resolve(base,{1:14,2:9},shield,active,calc,settings).damage1,2,'mirrored self-damage remains');
 const preview=A.preview(base,{1:'chain'},{1:record('chain')},settings);assert.equal(preview.last1,'');assert.equal(preview.seal1,true,'chain does not remove Anti Guard');assert.equal(base.last1,'block');
 const cleanse=A.preview(base,{1:'cleanse'},{1:record('cleanse')},settings);assert.equal(cleanse.gauge1,10);assert.equal(cleanse.seal1,false);assert.equal(cleanse.ruin1,0);
 // Exact DB calculation, including simultaneous skills, mirror, healing and self-damage.
 let cases=0;
 for(const a of A.SKILLS)for(const b of A.SKILLS)for(const x of [0,1,2,4,5,6,9,13,14])for(const y of [0,1,2,4,5,6,9,13,14]){
  const advanced=ledger(a.id,b.id),moves={1:x,2:y},result=A.resolve(base,moves,advanced.selected,A.forTurn(advanced,1),calc,settings);
  const before={freeGames:{match:{kind:'friend',rulesVersion:2,roomRules:settings,state:base,advanced,moves:{1:moves}}}},after=structuredClone(before);
  after.freeGames.match.transition=plain(result);after.freeGames.match.state={...base,...plain(result)};
  assert(evaluate(rules.freeGames.$game.transition['.validate'],before,after,'freeGames/match/transition','p1',9000,{$game:'match'}),JSON.stringify({a:a.id,b:b.id,x,y,result}));cases++;
 }
 // A chain release is limited to this turn; it never bypasses a seal.
 const moveHarness=harness();moveHarness.put('freeGames/match/roomRules',settings);moveHarness.put('freeGames/match/advanced',ledger('chain','heal'));
 moveHarness.put('freeGames/match/state',{...base,seal1:false});moveHarness.setClock(11700);
 moveHarness.commit({'freeGames/match/moves/1/1':2},'p1');
 const sealed=harness();sealed.put('freeGames/match/roomRules',settings);sealed.put('freeGames/match/advanced',ledger('chain','heal'));sealed.put('freeGames/match/state',base);sealed.setClock(11700);
 assert.throws(()=>sealed.commit({'freeGames/match/moves/1/1':2},'p1'),/permission_denied/);
 const {h,id,start}=await join();assert.equal(start.opensAt-start.skillWindow.startAt,3000);assert.equal(start.deadline-start.opensAt,10000);
 h.setClock(start.skillWindow.startAt-1);await assert.rejects(()=>h.transports[0]({op:'advancedSkill',matchId:id,turn:1}),/3秒間/);
 h.setClock(start.skillWindow.startAt);const boost=(await h.transports[0]({op:'advancedSkill',matchId:id,turn:1})).match;
 assert.equal(boost.opensAt,start.opensAt+3100,'a receipt reserves the shared 1900ms cut-in + 1200ms effect');
 assert.equal(boost.skillWindow.endAt,start.skillWindow.endAt,'using a skill must not extend the activation window');
 assert.equal(boost.deadline-boost.opensAt,10000);
 assert.equal(boost.state.gauge[1],8,'pressing a skill does not immediately change resources');assert.equal(boost.skillResult.gauge[1],10,'pending resources are available for the end of the presentation');assert.equal(h.get('freeGames/'+id+'/state/gauge1'),8,'base state is immutable until the turn resolves');
 await h.transports[0]({op:'advancedSkill',matchId:id,turn:1});assert.equal(h.get('freeGames/'+id+'/advanced/current/1/used'),1,'retry cannot spend twice');
 const forged={id:'boost',turn:1,used:2,at:h.now()};
 assert.throws(()=>h.commit({['freeGames/'+id+'/advanced/current/1']:forged,['freeGames/'+id+'/advanced/uses/1/2']:forged},'p1'),/permission_denied/,'DB rejects a second activation in the same turn');
 await assert.rejects(()=>h.transports[0]({op:'action',matchId:id,turn:1,action:1}),/紹介/);
 h.setClock(start.opensAt-1);await h.transports[1]({op:'advancedSkill',matchId:id,turn:1});
 assert.throws(()=>h.commit({['freeGames/'+id+'/advanced/current/1']:{id:'heal',turn:1,used:2,at:h.now()}},'p2'),/permission_denied/);
 h.setClock(start.opensAt);await assert.rejects(()=>h.transports[0]({op:'action',matchId:id,turn:1,action:1}),/紹介/);
 assert.throws(()=>h.commit({['freeGames/'+id+'/moves/1/1']:1},'p1'),/permission_denied/,'server also blocks input during the cut-in');
 h.setClock(boost.opensAt-1);await assert.rejects(()=>h.transports[0]({op:'action',matchId:id,turn:1,action:1}),/紹介/);
 assert.equal((await h.transports[0]({op:'status',matchId:id})).match.state.gauge[1],8,'resources stay unchanged through the last effect millisecond');
 h.setClock(boost.opensAt);assert.equal((await h.transports[0]({op:'status',matchId:id})).match.state.gauge[1],10,'resources commit exactly after the effect');
 h.setClock(boost.opensAt);await h.transports[0]({op:'action',matchId:id,turn:1,action:1});const next=(await h.transports[1]({op:'action',matchId:id,turn:1,action:0})).match;
 assert.equal(next.state.turn,2);assert.equal(next.state.hp[2],10);assert.equal(next.state.gauge[1],9);assert.equal(next.skillWindow.endAt-next.skillWindow.startAt,3000);
 assert.equal(h.get('freeGames/'+id+'/state/previousDeadline'),boost.deadline);
 assert.equal(next.opensAt,next.skillWindow.endAt,'previous-turn receipts do not delay an unused turn');
 await assert.rejects(()=>h.transports[0]({op:'advancedSkill',matchId:id,turn:1}),/切り替わりました/);
 // Every skill has a strict match-wide cap; owner, timestamp and atomic receipt/current proofs are checked.
 for(const skill of A.SKILLS){
  const f=await join(skill.id,'heal');
  for(let turn=1;turn<=skill.limit;turn++){
   const raw={...f.h.get('freeGames/'+f.id+'/state'),turn,startedAt:0};delete raw.previousDeadline;f.h.put('freeGames/'+f.id+'/state',raw);
   const m=(await f.h.transports[0]({op:'status',matchId:f.id})).match;f.h.setClock(m.opensAt-1000);
   await f.h.transports[0]({op:'advancedSkill',matchId:f.id,turn});
  }
  const raw={...f.h.get('freeGames/'+f.id+'/state'),turn:skill.limit+1,startedAt:0};delete raw.previousDeadline;f.h.put('freeGames/'+f.id+'/state',raw);
  const m=(await f.h.transports[0]({op:'status',matchId:f.id})).match;f.h.setClock(m.opensAt-1000);
  await assert.rejects(()=>f.h.transports[0]({op:'advancedSkill',matchId:f.id,turn:raw.turn}),/残り回数/);
  const over={id:skill.id,turn:raw.turn,used:skill.limit+1,at:f.h.now()};
  assert.throws(()=>f.h.commit({['freeGames/'+f.id+'/advanced/current/1']:over,['freeGames/'+f.id+'/advanced/uses/1/'+over.used]:over},'p1'),/permission_denied/,'DB also enforces the match-wide cap');
  assert.equal(f.h.get('freeGames/'+f.id+'/advanced/current/1/used'),skill.limit);
 }
 const late=await join();late.h.setClock(late.start.opensAt);await assert.rejects(()=>late.h.transports[0]({op:'advancedSkill',matchId:late.id,turn:1}),/3秒間/);
 const expired={id:'boost',turn:1,used:1,at:late.h.now()};
 assert.throws(()=>late.h.commit({['freeGames/'+late.id+'/advanced/current/1']:expired,['freeGames/'+late.id+'/advanced/uses/1/1']:expired},'p1'),/permission_denied/,'DB rejects activation at the exact deadline');
 const std=harness();await assert.rejects(()=>std.transports[0]({op:'advancedSkill',matchId:'match',turn:1}),/このモード/);
 const unused=await join();unused.h.setClock(unused.start.opensAt);const accepted=(await unused.h.transports[0]({op:'action',matchId:unused.id,turn:1,action:1})).match;
 assert.equal(accepted.ownAction,1,'no skill means immediate action selection at the end of 3 seconds');
 assert.equal(A.presentationMs(ledger('boost','heal'),2),0);assert.equal(A.presentationMs(ledger('boost','heal'),1),3100);
 // The final uses still get their full window/presentation. Only later turns skip it.
 const spent=await join('cleanse','cleanse');spent.h.setClock(spent.start.skillWindow.startAt);
 await spent.h.transports[0]({op:'advancedSkill',matchId:spent.id,turn:1});
 const both=(await spent.h.transports[1]({op:'advancedSkill',matchId:spent.id,turn:1})).match;
 assert.equal(both.skillWindow.endAt-both.skillWindow.startAt,3000,'final uses never cancel the current window');
 assert.equal(both.opensAt-both.skillWindow.endAt,3100,'final uses retain their presentation');
 spent.h.setClock(both.opensAt);await spent.h.transports[0]({op:'action',matchId:spent.id,turn:1,action:1});
 const exhausted=(await spent.h.transports[1]({op:'action',matchId:spent.id,turn:1,action:1})).match;
 assert.equal(exhausted.state.skillsExhausted,true);assert.equal(exhausted.skillWindow.startAt,exhausted.skillWindow.endAt,'both exhausted: zero-second window');
 assert.equal(exhausted.opensAt,exhausted.skillWindow.startAt,'no hidden three-second wait remains');
 assert.equal(exhausted.deadline-exhausted.opensAt,10000,'the full action input time is preserved');
 spent.h.setClock(exhausted.opensAt-1);await assert.rejects(()=>spent.h.transports[0]({op:'action',matchId:spent.id,turn:2,action:1}),/紹介/);
 spent.h.setClock(exhausted.opensAt);assert.equal((await spent.h.transports[0]({op:'action',matchId:spent.id,turn:2,action:1})).match.ownAction,1,'rules accept input immediately at the skipped window');
 const one=await join('cleanse','boost');one.h.setClock(one.start.skillWindow.startAt);const oneUse=(await one.h.transports[0]({op:'advancedSkill',matchId:one.id,turn:1})).match;
 one.h.setClock(oneUse.opensAt);await one.h.transports[0]({op:'action',matchId:one.id,turn:1,action:1});const remaining=(await one.h.transports[1]({op:'action',matchId:one.id,turn:1,action:0})).match;
 assert.equal(remaining.state.skillsExhausted,false);assert.equal(remaining.skillWindow.endAt-remaining.skillWindow.startAt,3000,'one player still has uses: keep the window');
 const flag=rules.freeGames.$game.state.skillsExhausted['.validate'],forgedFlag=one.h.copy();forgedFlag.freeGames[one.id].state.skillsExhausted=true;
 assert.equal(one.h.evaluate(flag,one.h.copy(),forgedFlag,'freeGames/'+one.id+'/state/skillsExhausted','p1',{$game:one.id}),false,'rules reject a forged exhaustion flag');
 for(const skill of A.SKILLS){
  const f=await join(skill.id,'heal'),path='freeGames/'+f.id;
  for(const [key,value]of Object.entries({hp1:7,gauge1:4,seal1:true,ruin1:2,last1:'block'}))f.h.put(path+'/state/'+key,value);
  f.h.setClock(f.start.skillWindow.startAt);const pending=(await f.h.transports[0]({op:'advancedSkill',matchId:f.id,turn:1})).match;
  assert.equal(pending.state.hp[1],7);assert.equal(pending.state.gauge[1],4);assert.equal(pending.state.seal[1],true);assert.equal(pending.state.last[1],'block');
  f.h.setClock(pending.opensAt-1);assert.deepEqual(plain((await f.h.transports[0]({op:'status',matchId:f.id})).match.state),plain(pending.state),skill.id+' waits through the whole effect');
  f.h.setClock(pending.opensAt);assert.deepEqual(plain((await f.h.transports[0]({op:'status',matchId:f.id})).match.state),plain(pending.skillResult),skill.id+' commits once at the effect deadline');
 }
 // A finished Advanced game retains immutable skill receipts and replays using only its own engine.
 await h.transports[0]({op:'resign',matchId:id});
 const context=vm.createContext({window:{AdvancedRules:A},calculateV1:calc,calculateV2:calc,stateFields:Object.keys(base)});
 vm.runInContext(source('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),context);
 const build=vm.runInContext('buildHistory',context),replay=vm.runInContext('replayHistory',context),game=h.get('freeGames/'+id);
 const saved=plain(build(id,game,{1:h.get('freeAccounts/p1'),2:h.get('freeAccounts/p2')}));
 assert.equal(replay(saved)[0].damage[2],0);
 h.commit({['battleHistory/'+id]:saved,['playerHistory/p1/'+id]:saved.endedAt,['playerHistory/p2/'+id]:saved.endedAt},'p1');
 const after=h.copy();delete after.battleHistory[id].advanced.uses[1][1];
 assert(!h.evaluate(rules.battleHistory.$game.advanced.uses[1]['.validate'],h.copy(),after,'battleHistory/'+id+'/advanced/uses/1','p1',{$game:id}));
 console.log('PASS: '+cases+' Advanced skill/action pairings match actual rules; all five effects/caps, self-damage, chain/seal isolation, exact 3-second boundaries, retries, 10-second turns, Standard rejection and verified history/replay');
})().catch(error=>{console.error(error);process.exitCode=1;});
