/* Authenticated writes against the official RTDB emulator, including full rule compilation. */
const {spawn}=require('node:child_process'),fs=require('fs'),assert=require('node:assert/strict'),V=require('../combat-v4.js'),S=require('../advanced/special-rules.js');
const jar=process.env.FIREBASE_DATABASE_EMULATOR_JAR;if(!jar){console.log('SKIP: set FIREBASE_DATABASE_EMULATOR_JAR');process.exit(0);}
const port=19012,ns='demo-custom-modes',base='http://127.0.0.1:'+port,child=spawn('java',['-jar',jar,'--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
const token=uid=>{const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),now=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({iss:'https://securetoken.google.com/'+ns,aud:ns,sub:uid,user_id:uid,iat:now,exp:now+3600,auth_time:now,firebase:{sign_in_provider:'password'}})+'.';};
async function request(path,method='GET',value,uid='owner',expected=200){const res=await fetch(base+'/'+path+'.json?ns='+ns+(uid==='owner'?'':'&auth='+token(uid)),{method,headers:{'Content-Type':'application/json',...(uid==='owner'?{Authorization:'Bearer owner'}:{})},...(value===undefined?{}:{body:JSON.stringify(value)}),signal:AbortSignal.timeout(20000)});const data=await res.text();assert.equal(res.status,expected,method+' '+path+': '+data);return JSON.parse(data);}
const stamp={'.sv':'timestamp'},config=flags=>({mode:'custom',hp:20,initialGauge:10,maxGauge:10,...flags});
async function createGame(id,options){
 await request('friendRooms/'+id,'PUT',{host:'p2',name:'P2',createdAt:stamp,heartbeat:stamp,game:'',roomRules:options},'p2');
 await request('','PATCH',{['freeGames/'+id+'/players']:{1:'p1',2:'p2'},['freeGames/'+id+'/createdAt']:stamp,['freeGames/'+id+'/rulesVersion']:4,['freeGames/'+id+'/foresightShield']:true,['freeGames/'+id+'/kind']:'friend',['freeGames/'+id+'/room']:id,['freeGames/'+id+'/roomRules']:options,...(options.draft?{['freeGames/'+id+'/draft']:{first:2,startedAt:stamp}}:{}),['freeAccounts/p1/active']:id,['freeAccounts/p2/active']:id,['friendRooms/'+id+'/game']:id},'p1');
}
(async()=>{try{
 for(let i=0;i<60;i++){try{await fetch(base+'/.settings/rules.json?ns='+ns,{headers:{Authorization:'Bearer owner'},signal:AbortSignal.timeout(300)});break;}catch{}await new Promise(r=>setTimeout(r,150));}
 const rules=JSON.parse(fs.readFileSync('firebase-database.rules.json','utf8'));assert(Buffer.byteLength(JSON.stringify(rules)+'\n')<256*1024);await request('.settings/rules','PUT',rules);console.log('PASS full rules accepted by official Firebase compiler');
 const account=name=>({name,guest:false,rating:1000,games:0,active:'',lastSettled:'',createdAt:Date.now()-1000});await request('','PUT',{users:{p1:{name:'P1'},p2:{name:'P2'}},freeAccounts:{p1:account('P1'),p2:account('P2')}});
 await createGame('classic',config({classic:true}));
 await request('freeGames/classic','PATCH',{'loadouts/1':[0,1,3],'ready/1':true},'p1',401);
 for(const p of [1,2])await request('freeGames/classic','PATCH',{['loadouts/'+p]:[0,1,2],['ready/'+p]:true},'p'+p);
 const seed={turn:1,startedAt:Date.now()-6000,hp1:20,hp2:20,gauge1:10,gauge2:10,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'reflect',last2:'',misses1:0,misses2:0,...V.extraState(),...S.extraState()};await request('freeGames/classic/state','PUT',seed);
 await request('freeGames/classic/moves/1/1','PUT',4,'p1');await request('freeGames/classic/moves/1/2','PUT',1,'p2');const c=V.calculate(seed,{1:4,2:1},4,config({classic:true}),{},true),fields=['turn','hp1','hp2','gauge1','gauge2','seal1','seal2','enhance1','enhance2','momentum1','momentum2','ruin1','ruin2','last1','last2','misses1','misses2',...V.fields,...S.fields],state={...Object.fromEntries(fields.map(k=>[k,c[k]])),startedAt:stamp,previousDeadline:seed.startedAt+15600};
 await request('freeGames/classic/advance/1','PUT',{owner:'p1',at:stamp},'p1');
 await request('freeGames/classic','PATCH',{transition:c,state},'p1');assert.equal((await request('freeGames/classic/state')).hp2,19);console.log('PASS Classic room creation, fixed loadouts, consecutive Counter legality and verified transition');
 await request('freeAccounts/p1/active','PUT','');await request('freeAccounts/p2/active','PUT','');await createGame('draft',config({draft:true}));
 const pick=(step,tech,uid,automatic=false,status=200)=>request('freeGames/draft/draft/picks/'+step,'PUT',{tech,at:stamp,automatic},uid,status);
 await pick(0,0,'p1',false,401);await pick(0,0,'p2');await pick(2,2,'p1',false,401);await pick(1,0,'p1',false,401);
 await request('freeGames/draft/draft/picks/0/at','PUT',Date.now()-16000);await pick(1,1,'p2',true);
 for(const [step,uid]of [[2,'p1'],[3,'p2'],[4,'p2'],[5,'p1']])await pick(step,step,uid);
 await request('freeGames/draft','PATCH',{'loadouts/1':[0,1,2],'ready/1':true},'p1',401);
 await request('freeGames/draft','PATCH',{'loadouts/1':[1,2,5],'ready/1':true},'p1');await request('freeGames/draft','PATCH',{'loadouts/2':[0,3,4],'ready/2':true},'p2');await request('freeGames/draft/draft/picks/0/tech','PUT',9,'p2',401);console.log('PASS Draft owner/sequence enforcement, timeout by either player, uniqueness and exact final loadouts');
 await request('freeGames/classic/settled','PUT',{at:Date.now(),winner:2});
 const wallet=(balance,id)=>({balance,claimDay:-1,claimFrom:id,colorUnlocked:false,glossUnlocked:false,color:'white',gloss:false});
 for(const uid of ['p1','p2'])await request('','PATCH',{['coinWallets/'+uid]:wallet(10,'classic'),['coinBattleClaims/'+uid+'/classic']:true},uid);
 await request('','PATCH',{'coinWallets/p1':wallet(20,'classic'),'coinBattleClaims/p1/classic':true},'p1',401);
 await request('','PATCH',{'coinWallets/p1':wallet(20,'fake'),'coinBattleClaims/p1/fake':true},'p1',401);await request('coinBattleAcknowledgements/p1/classic','PUT',true,'p1');await request('coinBattleAcknowledgements/p1/fake','PUT',true,'p1',401);console.log('PASS logged-in match rewards, replay/forgery rejection and acknowledgement through official emulator');
 }catch(error){console.error(log.slice(-2000));throw error;}finally{child.kill('SIGTERM');}})().catch(e=>{console.error(e);process.exitCode=1;});
