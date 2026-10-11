const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness}=require('./rules-harness.cjs');
const root=path.resolve(__dirname,'..'),rules=JSON.parse(fs.readFileSync(path.join(root,'firebase-database.rules.json'),'utf8')).rules;
const status=t=>t({op:'status',matchId:'match'});
const bothMoves=b=>{b.put('freeGames/match/moves/1/1',1);b.put('freeGames/match/moves/1/2',1);};
const denied=fn=>assert.throws(fn,/permission_denied/);
(async()=>{
 // Actual simultaneous status calls, not a sequential action-then-status test.
 const race=harness();bothMoves(race);race.setClock(13000);
 await Promise.all([status(race.transports[0]),status(race.transports[1]),status(race.transports[0])]);
 const views=await Promise.all(race.transports.map(status));
 assert(views.every(r=>r.match.state.turn===2));assert.equal(race.updates.length,1);assert.equal(race.claims.length,1);assert.equal(race.denials.length,0);
 assert.equal(race.get('freeGames/match/state/previousDeadline'),15600);
 // Match this turn's opening exactly, including every former 7500 ms clause.
 const opening=views[0].match.opensAt;
 race.setClock(opening-1);denied(()=>race.commit({'freeGames/match/moves/2/1':0},'p1'));
 race.setClock(opening);race.commit({'freeGames/match/moves/2/1':0},'p1');
 denied(()=>race.commit({'freeGames/match/moves/2/2':0},'p1'));
 assert(!race.allowed('.read','freeGames/match/moves/2','p1'));
 const proposedSettlement=race.copy();proposedSettlement.freeGames.match.settled={at:opening+40000};
 race.setClock(opening+39999);assert(!race.allowed('.write','freeGames/match/settled','p1',proposedSettlement));assert(!race.allowed('.read','freeGames/match/moves/2','p1'));
 race.setClock(opening+40000);assert(race.allowed('.write','freeGames/match/settled','p1',proposedSettlement));assert(race.allowed('.read','freeGames/match/moves/2','p1'));
 // No unregistered observer, early claim, unknown child or future-turn claim.
 const secure=harness();
 assert(!secure.allowed('.read','freeGames/match/advance','outsider'));
 denied(()=>secure.commit({'freeGames/match/advance/1':{owner:'p1',at:secure.now()}},'p1'));
 bothMoves(secure);secure.setClock(13000);
 denied(()=>secure.commit({'freeGames/match/advance/1':{owner:'p2',at:secure.now()}},'p1'));
 denied(()=>secure.commit({'freeGames/match/advance/2':{owner:'p1',at:secure.now()}},'p1'));
 denied(()=>secure.commit({'freeGames/match/advance/1':{owner:'p1',at:secure.now(),extra:true}},'p1'));
 secure.commit({'freeGames/match/advance/1':{owner:'p1',at:secure.now()}},'p1');
 denied(()=>secure.commit({'freeGames/match/advance/1':{owner:'p2',at:secure.now()}},'p2'));
 // A disconnected owner does not permanently stall the game.
 const stalled=await status(secure.transports[1]);assert.equal(stalled.match.state.turn,1);assert.equal(secure.updates.length,0);
 secure.setClock(28001);const recovered=await status(secure.transports[1]);
 assert.equal(recovered.match.state.turn,2);assert.equal(secure.updates.length,1);assert.equal(secure.updates[0].uid,'p2');
 // Invalid countdown metadata and battle values cannot pass the validations.
 const bad=harness();bothMoves(bad);bad.setClock(13000);
 bad.commit({'freeGames/match/advance/1':{owner:'p1',at:bad.now()}},'p1');
 const result=vm.runInContext('calculate',bad.ctx)(bad.get('freeGames/match/state'),{1:1,2:1},'match');
 const fields=vm.runInContext('stateFields',bad.ctx),next=Object.fromEntries(fields.map(k=>[k,k==='startedAt'?bad.now():result[k]]));
 const patch={['freeGames/match/transition']:result,['freeGames/match/state']:{...next,previousDeadline:15600}};
 denied(()=>bad.commit(patch,'p2'));
 denied(()=>bad.commit({...patch,['freeGames/match/state']:{...next,previousDeadline:15599}},'p1'));
 denied(()=>bad.commit({...patch,['freeGames/match/state']:{...next,previousDeadline:15600,hp1:9}},'p1'));
 bad.commit(patch,'p1');assert.equal(bad.get('freeGames/match/state/turn'),2);
 // The same optional field survives history validation and remains read-only.
 let before=bad.copy(),after=bad.copy();after.battleHistory={match:{finalState:{previousDeadline:15600}}};
 assert(bad.evaluate(rules.battleHistory.$game.finalState.previousDeadline['.validate'],before,after,'battleHistory/match/finalState/previousDeadline','p1',{$game:'match'}));
 after.battleHistory.match.finalState.previousDeadline=1;
 assert(!bad.evaluate(rules.battleHistory.$game.finalState.previousDeadline['.validate'],before,after,'battleHistory/match/finalState/previousDeadline','p1',{$game:'match'}));
 // New title IDs enforce 50 uses and the owning account, for all 12 skills.
 for(let skill=1;skill<=12;skill++){
  const b=harness();b.put('titleProgress/p1/uses/'+skill+'/count',49);
  const value={0:'skill_prestige_'+skill,1:'',2:''};
  denied(()=>b.commit({'titleLoadouts/p1':value},'p1'));
  b.put('titleProgress/p1/uses/'+skill+'/count',50);b.commit({'titleLoadouts/p1':value},'p1');
  denied(()=>b.commit({'titleLoadouts/p1':value},'p2'));
 }
 // Rules-first/client-first rollouts: legacy state uses the published 7.5 s,
 // not 6.1 s. Removing only the new read route simulates the old rules.
 const legacyRules=structuredClone(rules);delete legacyRules.freeGames.$game.advance;
 const legacy=harness(legacyRules);bothMoves(legacy);legacy.setClock(13000);
 await Promise.all(legacy.transports.map(status));const oldViews=await Promise.all(legacy.transports.map(status));
 assert.equal(legacy.claims.length,0);assert.equal(legacy.updates.length,1);assert.equal(legacy.denials.length,0);
 assert.equal(legacy.get('freeGames/match/state/previousDeadline'),null);
 assert.equal(oldViews[0].match.opensAt,20500);
 legacy.setClock(19100);await assert.rejects(legacy.transports[0]({op:'action',matchId:'match',turn:2,action:0}),/お待ちください/);
 legacy.setClock(20500);await legacy.transports[0]({op:'action',matchId:'match',turn:2,action:0});assert.equal(legacy.denials.length,0);
 console.log('PASS: simultaneous updates, same-client overlap, opening boundary, hidden moves, unauthorized ownership, expired-lease failover, forged timing/state, history field, 12 × 49/50-use title rules, legacy rollout');
})().catch(error=>{console.error(error);process.exitCode=1;});
