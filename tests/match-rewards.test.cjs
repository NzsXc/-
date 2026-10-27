const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),{harness}=require('./rules-harness.cjs');
const h=harness();h.put('users',{p1:{name:'P1'},p2:{name:'P2'},p3:{name:'P3'}});
for(const p of ['p1','p2','p3'])h.put('freeAccounts/'+p,{name:p,guest:false,rating:1000,games:0,active:'',lastSettled:''});
function service(uid){const context=vm.createContext({Event:class{},window:{dispatchEvent(){}},Date:{now:h.now},Promise,console,ref:(db,p='')=>({uid:db.uid,p}),get:async r=>{assert(h.allowed('.read',r.p,r.uid),'read '+r.p);return{val:()=>h.get(r.p)};},onValue(){},update:async(r,patch)=>h.commit(patch,r.uid),serverTimestamp:h.now});vm.runInContext(fs.readFileSync('economy-service.js','utf8').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),context);return vm.runInContext(`createEconomyService({uid:'${uid}'},{currentUser:{uid:'${uid}',isAnonymous:false}})`,context);}
const game=(id,{guest=false,finished=true,started=true,kind='friend'}={})=>{h.put('freeGames/'+id,{players:{1:'p1',2:'p2'},kind,...(started?{state:{hp1:0,hp2:10,turn:2}}:{}),...(finished?{settled:{at:h.now(),winner:2}}:{})});h.put('freeAccounts/p2/guest',guest);};
(async()=>{
 const a=service('p1'),b=service('p2');game('reward');assert.equal(await a.claimBattle('reward'),true);assert.equal(await b.claimBattle('reward'),true);assert.equal(h.get('coinWallets/p1/balance'),10);assert.equal(h.get('coinWallets/p2/balance'),10);
 await Promise.all([a.claimBattle('reward'),service('p1').claimBattle('reward')]);assert.equal(h.get('coinWallets/p1/balance'),10);
 let pending=await a.pendingBattles();assert.equal(pending.amount,10);await a.acknowledgeBattles(pending.ids,'p2');assert.equal((await a.pendingBattles()).amount,10);await a.acknowledgeBattles(pending.ids,'p1');assert.equal((await a.pendingBattles()).amount,0);
 for(const [id,opts]of [['guest',{guest:true}],['active',{finished:false}],['selection',{started:false}]]){game(id,opts);assert.equal(await a.claimBattle(id),false);}
 game('legacy');h.put('freeAccounts/p2/guest',null);assert.equal(await a.claimBattle('legacy'),true,'registered legacy accounts remain eligible');
 game('stranger');assert.equal(await service('p3').claimBattle('stranger'),false);
 game('random',{kind:'random'});assert.equal(await a.claimBattle('random'),true);assert.equal(h.get('coinWallets/p1/balance'),30);
 h.put('battleHistory/archived',{players:{1:{uid:'p1'},2:{uid:'p2'}},finalState:{hp1:0,hp2:2},settled:{winner:2}});assert.equal(await a.claimBattle('archived'),true);
 for(const id of ['fake','active','guest']){
  if(id==='guest')h.put('freeAccounts/p2/guest',true);
  const current=h.get('coinWallets/p1');assert.throws(()=>h.commit({'coinWallets/p1':{...current,balance:current.balance+10,claimFrom:id,claimDay:-1},['coinBattleClaims/p1/'+id]:true},'p1'),/permission_denied/);
 }
 assert.throws(()=>h.commit({'coinBattleClaims/p2/fake':true},'p1'),/permission_denied/);assert.throws(()=>h.commit({'coinBattleClaims/p1/reward':null},'p1'),/permission_denied/);assert.throws(()=>h.commit({'coinBattleAcknowledgements/p1/fake':true},'p1'),/permission_denied/);
 console.log('PASS 10 coins to both logged-in players, live/archive proofs, single grant, concurrency, home acknowledgement, guest/unfinished/nonparticipant exclusion and forged receipts');
})().catch(e=>{console.error(e);process.exitCode=1;});
