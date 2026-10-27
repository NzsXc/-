/* Drive both actual transports against authenticated official RTDB rules. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const R=require('../room-rules.js'),V=require('../combat-v4.js'),S=require('../advanced/special-rules.js'),A=require('../advanced/rules.js'),M=require('../match-modes.js');
const jar=process.env.FIREBASE_DATABASE_EMULATOR_JAR;
if(!jar){console.log('SKIP: set FIREBASE_DATABASE_EMULATOR_JAR');process.exit(0);}
const ns='demo-all-battle-modes',base='http://127.0.0.1:19013',read=f=>fs.readFileSync(f,'utf8'),stamp={'.sv':'timestamp'};
const token=uid=>{const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),now=Math.floor(Date.now()/1000);return enc({alg:'none',typ:'JWT'})+'.'+enc({iss:'https://securetoken.google.com/'+ns,aud:ns,sub:uid,user_id:uid,iat:now,exp:now+3600,firebase:{sign_in_provider:'password'}})+'.';};
async function request(path,method='GET',value,uid='owner',extra={}){
 const res=await fetch(base+'/'+path+'.json?ns='+ns+(uid==='owner'?'':'&auth='+token(uid)),{method,headers:{'Content-Type':'application/json',...(uid==='owner'?{Authorization:'Bearer owner'}:{}),...extra},...(value===undefined?{}:{body:JSON.stringify(value)}),signal:AbortSignal.timeout(20000)});
 const body=await res.text();if(!res.ok)throw Object.assign(Error(method+' '+path+' ['+res.status+'] '+body),{code:res.status===401?'PERMISSION_DENIED':'HTTP_'+res.status});return {value:JSON.parse(body),etag:res.headers.get('etag')};
}
const get=async(p,uid='owner')=>(await request(p,'GET',undefined,uid)).value;
let next=0;
function clients(){
 const window={RoomRules:R,BattleV4:V,SpecialRules:S,AdvancedRules:A,MatchModes:M};
 const ctx=vm.createContext({window,console,Date,Promise,setTimeout,clearTimeout,
  ref:(db,p='')=>({uid:db.uid,p}),push:()=>({key:'game'+(++next)}),serverTimestamp:()=>stamp,onValue:()=>()=>{},
  get:async r=>{const value=await get(r.p,r.uid);return{val:()=>value};},
  set:async(r,v)=>request(r.p,'PUT',v,r.uid),update:async(r,v)=>request(r.p,'PATCH',v,r.uid),
  runTransaction:async(r,fn)=>{for(let retry=0;retry<10;retry++){const current=await request(r.p,'GET',undefined,r.uid,{'X-Firebase-ETag':'true'}),value=fn(current.value);if(value===undefined)return{committed:false};try{await request(r.p,'PUT',value,r.uid,{'if-match':current.etag});return{committed:true};}catch(e){if(e.code!=='HTTP_412')throw e;}}throw Error('transaction retries exhausted');}
 });
 for(const file of ['advanced/protocol.js','free-calculator.js','free-transport.js'])vm.runInContext(read(file).replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),ctx);
 return {ctx,transport:[1,2].map(p=>vm.runInContext('createFreeTransport',ctx)({uid:'p'+p},{currentUser:{uid:'p'+p,isAnonymous:false}}))};
}
async function reset(){const account=name=>({name,guest:false,rating:1000,games:0,active:'',lastSettled:'',createdAt:Date.now()-10000});await request('','PUT',{users:{p1:{name:'P1'},p2:{name:'P2'}},freeAccounts:{p1:account('P1'),p2:account('P2')}});}
async function run(label,settings,random=false){
 await reset();const {ctx,transport:t}=clients();let m;
 if(random){assert.equal((await t[1]({op:'queue'})).waiting,1);m=(await t[0]({op:'queue'})).match;assert.equal(m.kind,'random');}
 else{await request('friendRooms/room','PUT',{host:'p2',name:'P2',createdAt:stamp,heartbeat:stamp,game:'',...(settings?{roomRules:settings}:{})},'p2');m=(await t[0]({op:'friendJoin',roomId:'room'})).match;}
 const id=m.id,path='freeGames/'+id,options=R.normalize(settings),special=R.hasSpecial(options),skills=R.hasSkills(options);
 if(options.draft){const desired={1:[0,12,13],2:[1,15,18]};for(let step=0;step<6;step++){const v=M.view(m.draft),tech=desired[v.player][v.loadouts[v.player].length];m=(await t[v.player-1]({op:'draftPick',matchId:id,step,tech})).match;}}
 const loadouts=options.draft?M.view(m.draft).loadouts:options.classic?{1:[0,1,2],2:[0,1,2]}:{1:[0,12,13],2:[1,15,18]};
 for(const p of [1,2])m=(await t[p-1]({op:'loadout',matchId:id,loadout:loadouts[p],...(skills?{advancedSkill:p===1?'boost':'heal'}:{})})).match;
 assert.equal(m.state.hp[1],options.hp);assert.equal(m.state.gauge[2],options.initialGauge);
 assert.equal(!!m.special,special);if(special)assert.equal(m.special.version,S.MOVE_VERSION);
 if(skills){await request(path+'/state/startedAt','PUT',Date.now()-6000);m=(await t[0]({op:'status',matchId:id})).match;assert(Date.now()>=m.skillWindow.startAt&&Date.now()<m.skillWindow.endAt);m=(await t[0]({op:'advancedSkill',matchId:id,turn:1})).match;assert.equal(m.advanced.current[1].used,1);}
 const turns=special?9:3;let specialUsed=false;
 for(let turn=1;turn<=turns;turn++){
  // Shift only the emulator's clock fixture; participant writes still use rules.
  await request(path+'/state','PATCH',{startedAt:Date.now()-15000,previousDeadline:Date.now()-15000});
  m=(await t[0]({op:'status',matchId:id})).match;
  const useSpecial=special&&turn===8;
  if(useSpecial){assert(m.special.gauge[1]>=6&&m.special.gauge[2]>=8);specialUsed=true;}
  const action=p=>options.classic?(turn<=2?4:1):useSpecial?(p===1?34:40):[1,2].some(q=>m.state.gauge[q]>=options.maxGauge)?1:0;
  await t[0]({op:'action',matchId:id,turn,action:action(1)});
  m=(await t[1]({op:'action',matchId:id,turn,action:action(2)})).match;
  assert.equal(m.state.turn,turn+1,label+' turn progression');
  for(const p of [1,2]){assert(m.state.hp[p]>=0&&m.state.hp[p]<=options.hp);assert(m.state.gauge[p]>=0&&m.state.gauge[p]<=options.maxGauge);}
 }
 const resumed=(await t[0]({op:'resume'})).match;assert.equal(resumed.id,id);assert.equal(resumed.state.turn,turns+1);if(special)assert(specialUsed);
 m=(await t[0]({op:'resign',matchId:id})).match;assert(m.closed);assert.equal(m.result.winner,2);
 assert.equal(await get('freeAccounts/p1/active'),'');assert.equal(await get('freeAccounts/p2/active'),'');
 if(!random){assert.equal(await get('freeAccounts/p1/rating'),1000);assert.equal(await get('freeAccounts/p2/rating'),1000);}
 else{assert.equal(await get('freeAccounts/p1/rating'),1000);assert.equal(await get('freeAccounts/p2/rating'),1030);}
 const game=await get(path),accounts={1:await get('freeAccounts/p1'),2:await get('freeAccounts/p2')};
 ctx.calculateV1=vm.runInContext('calculate',ctx);ctx.calculateV2=ctx.calculateV1;
 vm.runInContext(read('battle-history-core.js').replace(/^import[^\n]*\n/gm,'').replaceAll('export ',''),ctx);
 const history=vm.runInContext('buildHistory',ctx)(id,game,accounts);assert.equal(vm.runInContext('replayHistory',ctx)(history).length,turns);
 await request('','PATCH',{['battleHistory/'+id]:history,['playerHistory/p1/'+id]:history.endedAt,['playerHistory/p2/'+id]:history.endedAt},'p1');
 console.log('PASS official RTDB + actual transports: '+label+' → select → '+turns+' turns → reconnect → resign → ratings → verified history');
}
(async()=>{
 const child=spawn('java',['-jar',jar,'--host','127.0.0.1','--port','19013'],{stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
 try{
  let ready=false;for(let i=0;i<80;i++){try{await get('.settings/rules');ready=true;break;}catch{}await new Promise(r=>setTimeout(r,150));}assert(ready,'emulator startup');
  await request('.settings/rules','PUT',JSON.parse(read('firebase-database.rules.json')));
  await run('Standard friend',null);await run('Standard random',null,true);
  for(const skills of [false,true])for(const special of [false,true])await run('Advanced skills='+skills+' special='+special,R.normalize({mode:'advanced',skills,special}));
  const custom=extra=>R.normalize({mode:'custom',hp:20,initialGauge:10,maxGauge:10,...extra});
  await run('Classic',custom({classic:true}));
  for(const skills of [false,true])for(const special of [false,true])await run('Draft skills='+skills+' special='+special,custom({draft:true,skills,special}));
 }catch(e){console.error(log.slice(-1500));throw e;}finally{child.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;});
