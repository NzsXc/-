/* Runs the real economy service against the official Realtime Database emulator. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=process.env.FIREBASE_DATABASE_EMULATOR_URL||'http://127.0.0.1:19000',ns='demo-economy-service';
function token(uid,provider='password'){const now=Math.floor(Date.now()/1000),enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');return enc({alg:'none',typ:'JWT'})+'.'+enc({iss:'https://securetoken.google.com/'+ns,aud:ns,sub:uid,user_id:uid,iat:now,exp:now+3600,auth_time:now,firebase:{sign_in_provider:provider,identities:{}}})+'.';}
async function request(path,method='GET',value,uid='owner',provider='password'){
 const r=await fetch(base+'/'+path+'.json?ns='+ns+(uid==='owner'?'':'&auth='+token(uid,provider)),{method,headers:{'Content-Type':'application/json',...(uid==='owner'?{Authorization:'Bearer owner'}:{})},...(value===undefined?{}:{body:JSON.stringify(value)})});
 const data=await r.json();if(!r.ok){const e=Error(data.error||String(r.status));e.code=r.status===401?'PERMISSION_DENIED':'HTTP_'+r.status;throw e;}return data;
}
let writes=0;
function service(uid){
 const ctx=vm.createContext({console,Date,Promise,Map,Event:class{},window:{rankedTransport:async()=>{},dispatchEvent(){}},ref:(db,p='')=>({uid:db.uid,p}),get:async r=>{const data=await request(r.p,'GET',undefined,r.uid);return {val:()=>data};},update:async(r,value)=>{writes++;return request(r.p,'PATCH',value,r.uid);},onValue(){},serverTimestamp:()=>({'.sv':'timestamp'})});
 vm.runInContext(fs.readFileSync('economy-service.js','utf8').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),ctx);
 return vm.runInContext(`createEconomyService({uid:'${uid}'},{currentUser:{uid:'${uid}',isAnonymous:false},authStateReady:async()=>{}})`,ctx);
}
(async()=>{
 const rules=JSON.parse(fs.readFileSync('firebase-database.rules.json','utf8'));
 await request('.settings/rules','PUT',rules);
 const account=name=>({name,guest:false,rating:1000,games:0,active:'',lastSettled:''}),d=Math.floor((Date.now()+32400000)/86400000);
 await request('','PUT',{users:{p1:{name:'A'},p2:{name:'B'},p3:{name:'C'}},freeAccounts:{p1:account('A'),p2:account('B'),p3:account('C')},coinEvents:{[d-1]:{p3:{at:Date.now()-86400000,name:'C'}}}});
 const a=service('p1'),b=service('p2');let result=await a.start();assert.equal(result.own,50);assert.equal(result.balance,60);await a.acknowledge(result.receipts,'p1');
 result=await b.start();assert.equal(result.own,50);assert.equal(result.balance,70);await b.acknowledge(result.receipts,'p2');result=await a.start();assert.equal(result.own,0);assert.equal(result.gifts.length,1);assert.equal(result.balance,70);
 await Promise.all([a.start(),service('p1').start()]);assert.equal(await request('coinWallets/p1/balance','GET',undefined,'p1'),70);
 await assert.rejects(()=>request('coinWallets/p1/balance','PUT',9999,'p1'),/Permission denied/);
 // Reproduce an installed pre-coin ruleset: reads work but coin writes are refused.
 const old=structuredClone(rules);for(const key of ['coinWallets','coinEvents','coinClaims','coinAcknowledgements'])old.rules[key]={'.read':true,'.write':false};
 await request('.settings/rules','PUT',old);writes=0;
 await assert.rejects(()=>service('p3').start(),e=>e.code==='PERMISSION_DENIED');assert.equal(writes,1,'a permanent rules rejection is sent only once');
 await request('.settings/rules','PUT',rules);result=await service('p3').start();assert.equal(result.own,50);assert.equal(result.balance,70,'publishing the full rules restores receipt of pending coins');

 const legacy=account('Legacy');delete legacy.guest;
 await request('users/legacy','PUT',{name:'Legacy'});
 await request('freeAccounts/legacy','PUT',legacy);
 const oldService=service('legacy'),earned=await oldService.start();
 assert.equal(earned.own,50);assert.equal(earned.balance,90);
 await oldService.acknowledge(earned.receipts);
 assert.equal((await oldService.start()).own,0);
 assert.equal(await request('freeAccounts/legacy/guest'),null,'do not rewrite the old account');
 await request('users/blocked','PUT',{name:'Guest'});
 await request('freeAccounts/blocked','PUT',{...account('Guest'),guest:true});
 await assert.rejects(()=>service('blocked').start(),e=>e.code==='PERMISSION_DENIED');
 const unclaimed={...legacy,name:'Unauthenticated'};
 await request('freeAccounts/anonymous','PUT',unclaimed);
 await request('users/anonymous','PUT',{name:unclaimed.name});
 const forged={
  ['coinWallets/anonymous']:{balance:50,claimDay:d,claimFrom:'anonymous',colorUnlocked:false,glossUnlocked:false,color:'white',gloss:false},
  ['coinClaims/anonymous/'+d+'/anonymous']:true,
  ['coinEvents/'+d+'/anonymous']:{at:{'.sv':'timestamp'},name:unclaimed.name}
 };
 await assert.rejects(()=>request('','PATCH',forged,'anonymous','anonymous'),e=>e.code==='PERMISSION_DENIED');
 await request('freeAccounts/unregistered','PUT',unclaimed);
 await assert.rejects(()=>service('unregistered').start(),e=>e.code==='PERMISSION_DENIED');
 console.log('PASS legacy accounts, pending gifts, acknowledgements, replay prevention, guest/anonymous/unregistered rejection');
 console.log('PASS official emulator + real economy service: daily/pending gifts, duplicate claims, tampering, old-rule permission rejection (one attempt) and recovery after rule publication');
})().catch(e=>{console.error(e);process.exitCode=1;});
