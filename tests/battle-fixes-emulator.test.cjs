/* Real RTDB compiler + application services for match eligibility and S-use proofs. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const jar=process.env.FIREBASE_DATABASE_EMULATOR_JAR;if(!jar){console.log('SKIP: FIREBASE_DATABASE_EMULATOR_JAR is required');process.exit(0);}
const port=19004,base='http://127.0.0.1:'+port,ns='demo-battle-fixes';
const plain=file=>fs.readFileSync(file,'utf8').replace(/^import[^\n]*\n/gm,'').replaceAll('export ','');
function token(uid){const now=Math.floor(Date.now()/1000),enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');return enc({alg:'none',typ:'JWT'})+'.'+enc({iss:'https://securetoken.google.com/'+ns,aud:ns,sub:uid,user_id:uid,iat:now,exp:now+3600,firebase:{sign_in_provider:'password'}})+'.';}
async function request(path,method='GET',data,uid='owner'){
 const r=await fetch(base+'/'+path+'.json?ns='+ns+(uid==='owner'?'':'&auth='+token(uid)),{method,headers:{'Content-Type':'application/json',...(uid==='owner'?{Authorization:'Bearer owner'}:{})},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(10000)});
 const body=await r.json();if(!r.ok)throw Object.assign(Error(body.error||r.status),{code:r.status===401?'PERMISSION_DENIED':'HTTP_'+r.status});return body;
}
function services(){
 const c=vm.createContext({window:{dispatchEvent(){}},Event:class{},console,Date,Promise,ref:(_,p='')=>p,get:async p=>{const value=await request(p,'GET',undefined,'p1');return{val:()=>value};},set:(p,v)=>request(p,'PUT',v,'p1'),update:(p,v)=>request(p,'PATCH',v,'p1'),onValue(){},serverTimestamp:()=>({'.sv':'timestamp'})});
 vm.runInContext(plain('economy-service.js')+'\n'+plain('title-service.js'),c);
 c.history={find:id=>request('battleHistory/'+id,'GET',undefined,'p1')};return vm.runInContext("({economy:createEconomyService({}, {currentUser:{uid:'p1',isAnonymous:false}}),titles:createTitleService({}, {currentUser:{uid:'p1',isAnonymous:false}},history)})",c);
}
(async()=>{
 const child=spawn('java',['-jar',jar,'--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 try{
  let ready=false;for(let i=0;i<80;i++){try{await fetch(base+'/.settings/rules.json?ns='+ns,{signal:AbortSignal.timeout(300)});ready=true;break;}catch{}await new Promise(r=>setTimeout(r,150));}assert(ready,logs);
  const rules=JSON.parse(fs.readFileSync('firebase-database.rules.json','utf8'));await request('.settings/rules','PUT',rules);
  const account=name=>({name,guest:false,rating:1000,games:0,active:'',lastSettled:''});
  await request('','PUT',{users:{p1:{name:'A'},p2:{name:'B'}},freeAccounts:{p1:account('A'),p2:account('B')},titleProgress:{p1:{tracking:{version:1,startedAt:0,activeGame:'',resolvedThrough:0}}}});
  const {economy,titles}=services();
  for(const hp of [1,9,10,100])for(const archive of [false,true]){
   const id='hp'+hp+(archive?'archive':'live'),root=archive?'battleHistory':'freeGames';
   const game={players:archive?{1:{uid:'p1'},2:{uid:'p2'}}:{1:'p1',2:'p2'},roomRules:{mode:'custom',hp,initialGauge:8,maxGauge:10},settled:{at:1,winner:2},[archive?'finalState':'state']:{turn:2,hp1:0,hp2:1}};
   await request(root+'/'+id,'PUT',game);assert.equal(await economy.claimBattle(id),hp>=10);
   if(hp<10){const wallet=await request('coinWallets/p1','GET',undefined,'p1')||{balance:0,claimDay:-1,claimFrom:'',colorUnlocked:false,glossUnlocked:false,color:'white',gloss:false};await assert.rejects(()=>request('','PATCH',{'coinWallets/p1':{...wallet,balance:wallet.balance+10,claimDay:-1,claimFrom:id},['coinBattleClaims/p1/'+id]:true},'p1'),e=>e.code==='PERMISSION_DENIED');}
  }
  console.log('PASS official RTDB: full rules compile; HP 1/9/10/100 live/archive reward boundaries and direct-write bypass denial');
  // All 19 techniques appear once normally and once as S moves.
  const actions=Array.from({length:38},(_,i)=>i+3),moves=Object.fromEntries(actions.map((a,i)=>[i+1,{1:a,2:0}]));
  await request('freeGames/uses','PUT',{players:{1:'p1',2:'p2'},createdAt:1,state:{turn:39},moves});
  await titles.recordMatch({id:'uses',side:1,resolvedThrough:38});await titles.recordMatch({id:'uses',side:1,resolvedThrough:38});
  let totals=await request('titleProgress/p1/uses','GET',undefined,'p1');for(let skill=1;skill<=19;skill++)assert.equal(totals[skill].count,2,'normal/S total '+skill);
  await request('battleHistory/archivedUses','PUT',{players:{1:{uid:'p1'},2:{uid:'p2'}},createdAt:2,finalState:{turn:39},moves});
  await titles.recordMatch({id:'archivedUses',side:1,resolvedThrough:38});totals=await request('titleProgress/p1/uses','GET',undefined,'p1');for(let skill=1;skill<=19;skill++)assert.equal(totals[skill].count,4);
  await request('freeGames/forged','PUT',{players:{1:'p1',2:'p2'},createdAt:3,state:{turn:2},moves:{1:{1:15,2:0}}});
  await assert.rejects(()=>request('','PATCH',{'titleReceipts/p1/forged/1':2,'titleProgress/p1/uses/2':{count:5,game:'forged',turn:1}},'p1'),e=>e.code==='PERMISSION_DENIED');
  console.log('PASS official RTDB + title service: all 19 normal/S totals, archived totals, duplicate-proof receipts and forged-technique denial');
 }catch(error){console.error(logs.slice(-1800));throw error;}finally{child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
