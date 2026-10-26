/* Real Firebase compiler and transactional validation, without any production credentials. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const jar=process.env.FIREBASE_DATABASE_EMULATOR_JAR;
if(!jar){console.log('SKIP: FIREBASE_DATABASE_EMULATOR_JAR is required');process.exit(0);}
const root=path.resolve(__dirname,'..'),ns='demo-player-card-shop',port=19003,base='http://127.0.0.1:'+port;
function token(uid,provider='password'){const now=Math.floor(Date.now()/1000),enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');return enc({alg:'none',typ:'JWT'})+'.'+enc({iss:'https://securetoken.google.com/'+ns,aud:ns,sub:uid,user_id:uid,iat:now,exp:now+3600,firebase:{sign_in_provider:provider}})+'.';}
async function request(p,method='GET',value,uid='owner',provider='password'){
 const r=await fetch(base+'/'+p+'.json?ns='+ns+(uid==='owner'?'':'&auth='+token(uid,provider)),{method,headers:{'Content-Type':'application/json',...(uid==='owner'?{Authorization:'Bearer owner'}:{})},...(value===undefined?{}:{body:JSON.stringify(value)}),signal:AbortSignal.timeout(15000)});
 const body=await r.json();if(!r.ok)throw Object.assign(Error(body.error||r.status),{code:r.status===401?'PERMISSION_DENIED':'HTTP_'+r.status});return body;
}
const wallet=balance=>({balance,claimDay:-1,claimFrom:'',colorUnlocked:false,glossUnlocked:false,color:'white',gloss:false});
const source=fs.readFileSync(path.join(root,'economy-service.js'),'utf8').replace(/^import[^\n]*\n/gm,'').replaceAll('export ','');
function service(uid='p1'){return new Function('ref','get','update','onValue','serverTimestamp','window','Event','db','auth',source+';return createEconomyService(db,auth);')((_db,p='')=>({p}),async r=>({val:()=>request(r.p,'GET',undefined,uid)}),async(r,patch)=>request(r.p,'PATCH',patch,uid),()=>{},()=>({'.sv':'timestamp'}),{dispatchEvent(){}},class{}, {},{currentUser:{uid,isAnonymous:false}});}
async function seed(balance){await request('','PUT',{users:{p1:{name:'A'},p2:{name:'B'}},coinWallets:{p1:wallet(balance)}});}
(async()=>{
 const child=spawn('java',['-jar',jar,'--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 try{
  let ready=false;for(let i=0;i<80;i++){try{await fetch(base+'/.settings/rules.json?ns='+ns,{headers:{Authorization:'Bearer owner'},signal:AbortSignal.timeout(300)});ready=true;break;}catch{}await new Promise(r=>setTimeout(r,150));}assert(ready,'emulator startup: '+logs);
  await request('.settings/rules','PUT',JSON.parse(fs.readFileSync(path.join(root,'firebase-database.rules.json'),'utf8')));
  await seed(99);await assert.rejects(()=>service().buyCardStyle('obsidian'),/100/);
  await seed(100);await service().buyCardStyle('obsidian');assert.equal(await request('coinWallets/p1/balance','GET',undefined,'p1'),0);
  await service().buyCardStyle('obsidian');assert.equal(await request('coinWallets/p1/balance','GET',undefined,'p1'),0);
  await service().saveCardStyle('');await service().saveCardStyle('obsidian');assert.equal(await service().cardStyleFor('p1'),'obsidian');
  for(const [p,value,uid,provider]of [['playerCardStyles/p1/owned/abyss',true,'p1','password'],['playerCardStyles/p1/owned/obsidian',null,'p1','password'],['playerCardStyles/p1/selected','abyss','p1','password'],['playerCardStyles/p1',null,'p1','password'],['playerCardStyles/p1/selected','obsidian','p2','password'],['playerCardStyles/p1/selected','obsidian','p1','anonymous']])await assert.rejects(()=>request(p,'PUT',value,uid,provider),e=>e.code==='PERMISSION_DENIED');
  await seed(300);
  await assert.rejects(()=>request('','PATCH',{'coinWallets/p1':wallet(200),'playerCardStyles/p1':{owned:{obsidian:true,abyss:true},selected:'abyss'}},'p1'),e=>e.code==='PERMISSION_DENIED');
  await assert.rejects(()=>request('','PATCH',{'coinWallets/p1':{...wallet(200),colorUnlocked:true},'playerCardStyles/p1':{owned:{obsidian:true},selected:'obsidian'}},'p1'),e=>e.code==='PERMISSION_DENIED');
  await Promise.all([service().buyCardStyle('obsidian'),service().buyCardStyle('abyss')]);assert.equal(await request('coinWallets/p1/balance','GET',undefined,'p1'),100);
  const owned=await request('playerCardStyles/p1/owned','GET',undefined,'p1');assert.deepEqual(owned,{obsidian:true,abyss:true});
  await seed(300);await Promise.all([service().buyCardStyle('obsidian'),service().buyCardStyle('obsidian')]);assert.equal(await request('coinWallets/p1/balance','GET',undefined,'p1'),200);
  console.log('PASS official Firebase engine: full rule compilation, atomic purchases, concurrent tabs, ownership protection, anonymous denial and combined-purchase attacks');
 }catch(error){console.error(logs.slice(-2500));throw error;}finally{child.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
