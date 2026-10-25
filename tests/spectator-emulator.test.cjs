// Read the real spectator adapter through authenticated requests to official RTDB.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const jar=process.env.FIREBASE_DATABASE_EMULATOR_JAR;
if(!jar){console.log('SKIP: set FIREBASE_DATABASE_EMULATOR_JAR for spectator integration');process.exit(0);}
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),ns='demo-spectator-special',base='http://127.0.0.1:19003';
function token(provider){const n=Math.floor(Date.now()/1000),enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');return enc({alg:'none',typ:'JWT'})+'.'+enc({iss:'https://securetoken.google.com/'+ns,aud:ns,sub:'viewer',user_id:'viewer',iat:n,exp:n+3600,firebase:{sign_in_provider:provider}})+'.';}
async function request(p,method='GET',value,provider='owner',expected=200){
 const r=await fetch(base+'/'+p+'.json?ns='+ns+(provider==='owner'?'':'&auth='+token(provider)),{method,headers:{'Content-Type':'application/json',...(provider==='owner'?{Authorization:'Bearer owner'}:{})},...(value===undefined?{}:{body:JSON.stringify(value)}),signal:AbortSignal.timeout(15000)});
 const body=await r.text();assert.equal(r.status,expected,method+' '+p+': '+body);return JSON.parse(body);
}
async function observe(provider,reads){
 const window={AdvancedRules:require('../advanced/rules.js'),SpecialRules:require('../advanced/special-rules.js'),BattleAI:require('../bot-engine.js'),RoomRules:require('../room-rules.js')};
 const transport=async data=>assert.equal(data.op,'profile');transport.supportsRoomRules=async()=>true;
 const context=vm.createContext({window,console,Date,Promise,setTimeout,clearTimeout,auth:{currentUser:{uid:'viewer'},authStateReady:async()=>{}},db:{},transport,
  ref:(_db,path)=>({path}),get:async r=>{reads.push(r.path);const v=await request(r.path,'GET',undefined,provider);return {val:()=>v};},onValue:(_r,callback)=>{callback({val:()=>0});return ()=>{};},
  set(){assert.fail('viewer write');},update(){assert.fail('viewer write');},remove(){assert.fail('viewer write');},signInAnonymously(){assert.fail('already authenticated');}});
 vm.runInContext(read('advanced/spectator.js').replace('export function','function')+'\n'+read('protected-rooms.js').replace(/^import[^\n]*\n/gm,'').replace('export function','function'),context);
 const api=vm.runInContext('createProtectedRooms(db,auth,transport)',context);
 return new Promise((resolve,reject)=>{const stop=api.watchRoom('random:match',value=>{stop();resolve(value);},error=>{stop();reject(error);});});
}
(async()=>{
 const child=spawn('java',['-jar',jar,'--host','127.0.0.1','--port','19003'],{stdio:'ignore'});
 try{
  let ready=false;for(let i=0;i<60;i++){try{await fetch(base+'/.settings/rules.json?ns='+ns,{headers:{Authorization:'Bearer owner'},signal:AbortSignal.timeout(300)});ready=true;break;}catch{}await new Promise(r=>setTimeout(r,150));}assert(ready,'RTDB startup');
  await request('.settings/rules','PUT',JSON.parse(read('firebase-database.rules.json')));
  const now=Date.now(),state={turn:2,startedAt:now,previousDeadline:now+300,hp1:10,hp2:9,gauge1:3,gauge2:8,frozen1:0,frozen2:1,poison1:2,poison2:0,specialSeal2:2};
  const roomRules={mode:'custom',hp:20,initialGauge:14,maxGauge:20,skills:true,special:true};
  await request('','PUT',{freeAccounts:{p1:{name:'A'},p2:{name:'B'}},freeGames:{match:{kind:'random',players:{1:'p1',2:'p2'},ready:{1:true,2:true},loadouts:{1:[0,14,18],2:[4,15,17]},roomRules,state,foresightShield:true,special:{version:3,max:30,gauge:{1:20,2:10}},advanced:{selected:{1:'boost',2:'stance'}},transition:{turn:2,action1:39,action2:-1,damage1:0,damage2:1,inputHp1:10,inputHp2:10,inputGauge1:8,inputGauge2:8,hp1:10,hp2:9,gauge1:3,gauge2:8}}}});
  for(const provider of ['password','anonymous']){
   const reads=[],v=await observe(provider,reads);assert.equal(v.battle.actions[1].data.name,'Sヴェノム');assert(v.battle.actions[1].data.special);assert.equal(v.battle.actions[2].data.name,'凍結');assert.equal(v.battle.poison[1],2);assert.equal(v.battle.frozen[2],1);assert.equal(v.battle.specialSeal[2],2);assert.equal(v.battle.skillMatch.advanced.selected[2],'stance');assert.equal(v.battle.resources.before.hp[2],10);
   assert(!reads.some(p=>/^freeGames(?:\/[^/]+)?$/.test(p)||/\/(moves|advance)(?:\/|$)/.test(p)));
   for(const p of ['freeGames/match','freeGames/match/moves/2/1','freeGames/match/advance/2'])await request(p,'GET',undefined,provider,401);
   await request('freeGames/match/state/hp1','PUT',0,provider,401);
  }
  await request('freeGames/match/ready/2','PUT',false);
  await request('freeGames/match/loadouts','GET',undefined,'anonymous',401);await request('freeGames/match/advanced/selected/1','GET',undefined,'anonymous',401);
  console.log('PASS official RTDB + spectator adapter: S/new skills/statuses for registered and anonymous viewers; private moves, leases, unready selections and writes remain denied');
 }finally{child.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
