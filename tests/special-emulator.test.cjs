// Optional integration test against the official Realtime Database emulator jar.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),S=require('../advanced/special-rules.js');
const jar=process.env.FIREBASE_DATABASE_EMULATOR_JAR;
if(!jar){console.log('SKIP: set FIREBASE_DATABASE_EMULATOR_JAR to run authenticated S-move integration');process.exit(0);}
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),calc=vm.runInNewContext(read('free-calculator.js').replaceAll('export ','')+'\ncalculate'),stateFields=vm.runInNewContext(read('free-calculator.js').replaceAll('export ','')+'\nstateFields');
const namespace='demo-special-moves',port=19001,url='http://127.0.0.1:'+port;
const token=uid=>[Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({iss:'https://securetoken.google.com/'+namespace,aud:namespace,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,sub:uid,user_id:uid,firebase:{sign_in_provider:'password'}})).toString('base64url'),''].join('.');
(async()=>{
 const child=spawn('java',['-jar',jar,'--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
 async function request(p,method='GET',body,uid='owner',status=200){const result=await fetch(url+'/'+p+'.json?ns='+namespace+(uid==='owner'?'':'&auth='+token(uid)),{method,headers:{...(uid==='owner'?{Authorization:'Bearer owner'}:{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});const text=await result.text();assert.equal(result.status,status,method+' '+p+': '+text);return JSON.parse(text);}
 try{
  for(let i=0;i<50;i++){try{await fetch(url+'/.settings/rules.json?ns='+namespace,{headers:{Authorization:'Bearer owner'},signal:AbortSignal.timeout(500)});break;}catch{}await new Promise(r=>setTimeout(r,200));}
  await request('.settings/rules','PUT',JSON.parse(read('firebase-database.rules.json')));
  const roomRules={mode:'advanced',hp:15,initialGauge:8,maxGauge:10,skills:false,special:true};
  const s={turn:1,startedAt:Date.now()-6500,hp1:15,hp2:15,gauge1:8,gauge2:8,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,skillsExhausted:true,...S.extraState()};
  await request('freeGames/match','PUT',{players:{1:'p1',2:'p2'},createdAt:s.startedAt,kind:'friend',ready:{1:true,2:true},loadouts:{1:[0,7,9],2:[0,7,9]},rulesVersion:3,roomRules,state:s,special:{...S.initial(2),gauge:{1:30,2:30}}});
  await request('freeGames/match/moves/1/1','PUT',24,'outsider',401);
  await request('freeGames/match/moves/1/1','PUT',24,'p1');await request('freeGames/match/moves/1/2','PUT',22,'p2');
  await request('freeGames/match/advance/1','PUT',{owner:'p1',at:{'.sv':'timestamp'}},'p1');
  const transition=calc(s,{1:24,2:22},3,roomRules),state={...Object.fromEntries([...stateFields,...S.fields].map(k=>[k,k==='startedAt'?{'.sv':'timestamp'}:transition[k]])),previousDeadline:s.startedAt+15600,skillsExhausted:true};
  const special=S.advance({...S.initial(2),gauge:{1:30,2:30}},transition);
  await request('freeGames/match','PATCH',{state,transition,special},'p1');
  const saved=await request('freeGames/match/state','GET',undefined,'p2');assert.equal(saved.specialSeal1,2);assert.equal(saved.gauge1,8);assert.equal(saved.gauge2,5);
  await request('freeGames/match/special/gauge/1','PUT',30,'p1',401);
  // Re-open the next input window through an administrative clock fixture.
  await request('freeGames/match/state/startedAt','PUT',Date.now()-8000);await request('freeGames/match/state/previousDeadline','PUT',Date.now()-6000);
  await request('freeGames/match/moves/2/1','PUT',24,'p1',401);await request('freeGames/match/moves/2/1','PUT',2,'p1',401);await request('freeGames/match/moves/2/1','PUT',1,'p1');
  console.log('PASS official emulator: full rule compilation, authenticated S Siphon/S Anti Guard, atomic state/gauge, sealed moves and unauthorized writes');
 }catch(e){console.error(log.slice(-1500));throw e;}finally{child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),1500).unref();}
})().catch(e=>{console.error(e);process.exitCode=1;});
