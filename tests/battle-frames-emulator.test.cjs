// Uses the official RTDB engine: missing values do not have JavaScript's null coercion.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const jar=process.env.FIREBASE_DATABASE_EMULATOR_JAR;
if(!jar){console.log('SKIP: set FIREBASE_DATABASE_EMULATOR_JAR for the official frame rules regression');process.exit(0);}
const namespace='demo-battle-frame-rules',port=19002,base='http://127.0.0.1:'+port,root=path.join(__dirname,'..');
function token(uid,provider='password'){
 const now=Math.floor(Date.now()/1000),enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 return enc({alg:'none',typ:'JWT'})+'.'+enc({iss:'https://securetoken.google.com/'+namespace,aud:namespace,sub:uid,user_id:uid,iat:now,exp:now+3600,firebase:{sign_in_provider:provider}})+'.';
}
async function request(p,method='GET',value,uid='owner',expected=200,provider='password'){
 const response=await fetch(base+'/'+p+'.json?ns='+namespace+(uid&&uid!=='owner'?'&auth='+token(uid,provider):''),{method,headers:{'Content-Type':'application/json',...(uid==='owner'?{Authorization:'Bearer owner'}:{})},...(value===undefined?{}:{body:JSON.stringify(value)}),signal:AbortSignal.timeout(15000)});
 const body=await response.text();assert.equal(response.status,expected,method+' '+p+': '+body);return JSON.parse(body);
}
const counts=(n,ids=[1,2,3,4,5])=>Object.fromEntries(ids.map(id=>[id,{count:n}]));
const seed=(uses={},account={})=>request('','PUT',{titleProgress:{p1:{uses}},freeAccounts:{p1:account}});
const equip=(id,expected=200,uid='p1',provider='password')=>request('battleFrameLoadouts/p1','PUT',id,uid,expected,provider);
(async()=>{
 const child=spawn('java',['-jar',jar,'--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
 try{
  let ready=false;for(let i=0;i<60;i++){try{await fetch(base+'/.settings/rules.json?ns='+namespace,{headers:{Authorization:'Bearer owner'},signal:AbortSignal.timeout(300)});ready=true;break;}catch{}await new Promise(r=>setTimeout(r,150));}
  assert(ready,'emulator startup: '+log);
  await request('.settings/rules','PUT',JSON.parse(fs.readFileSync(path.join(root,'firebase-database.rules.json'),'utf8')));
  await seed();await equip('');for(const id of ['silver','blue-flame','gold','diamond'])await equip(id,401);
  // Exactly five recorded techniques must suffice; all other nodes are absent.
  for(const ids of [[1,2,3,4,5],[1,5,13,18,19],[15,16,17,18,19]]){
   await seed(counts(30,ids));await equip('silver');await equip('blue-flame',401);
   await seed(counts(50,ids));await equip('blue-flame');await equip('silver');
   assert.equal(await request('battleFrameLoadouts/p1','GET',undefined,'p1'),'silver');
  }
  for(const [id,n]of [['silver',30],['blue-flame',50]]){
   await seed({...counts(n,[1,5,13,18]),19:{count:n-1}});await equip(id,401);
   await seed({...counts(n,[1,5,13,18]),19:{count:String(n)}});await equip(id,401);
   await seed({...counts(n,[1,5,13,18]),20:{count:n}});await equip(id,401);
  }
  await seed({1:{count:776}});await equip('diamond',401);await seed({1:{count:777}});await equip('diamond');
  await seed({}, {onlineWins:60,friendWins:39});await equip('gold',401);
  for(const account of [{onlineWins:60,friendWins:40},{onlineWins:100},{friendWins:100}]){await seed({},account);await equip('gold');}
  await seed(counts(50));await equip('blue-flame');
  for(const value of ['unknown',{},5,null])await equip(value,401);
  await equip('blue-flame',401,'p2');await equip('blue-flame',401,null);await equip('blue-flame',401,'p1','anonymous');
  await request('','PATCH',{'battleFrameLoadouts/p2':'blue-flame','titleProgress/p2/uses':counts(50)},'p2',401);
  console.log('PASS official RTDB: full rules compile; five sparse counts unlock silver/blue-flame; boundaries, missing/invalid counts, gold/diamond, persistence, tampering and authentication');
 }catch(error){console.error(log.slice(-2500));throw error;}finally{child.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
