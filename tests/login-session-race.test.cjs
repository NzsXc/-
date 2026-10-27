const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('  let playerLoginLoadEpoch=0;'),end=html.indexOf('  window.openPlayerLogin=',start);
assert(start>=0&&end>start);const source=html.slice(start,end);
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const snapshot=name=>({exists:()=>true,val:()=>({name})});
function fixture(stage='read'){
 const pending=deferred(),events=[],timers=[],auth={currentUser:{uid:'old',isAnonymous:false}};
 const ctx=vm.createContext({auth,db:{},console,Event:class{constructor(type){this.type=type;}},ref:(_,p)=>p,loggedInPlayerData:null,rankedActive:false,
  get:p=>stage==='read'&&p==='users/old'?pending.promise:Promise.resolve(snapshot(p.endsWith('/old')?'Old':'New')),
  updatePlayerLoginButton(){},startRanked:()=>events.push('resume'),setTimeout:fn=>timers.push(fn),
  window:{dispatchEvent:e=>events.push(e.type),rankedTransport:()=>stage==='profile'?pending.promise:Promise.resolve({rating:1150,active:'match'}),titleService:{enableUnlimited:()=>stage==='titles'?pending.promise:Promise.resolve(),claimRatings:async()=>{}},battleHistory:{archiveFinished:async()=>{}}}
 });
 vm.runInContext(source,ctx);
 const flush=async()=>{for(let i=0;i<4;i++)await new Promise(setImmediate);};
 const leave=()=>{auth.currentUser=null;vm.runInContext('playerLoginLoadEpoch++;loggedInPlayerData=null;window.loggedInPlayerData=null;',ctx);};
 return{ctx,auth,pending,events,timers,flush,leave,load:()=>ctx.loadLoggedInPlayer(auth.currentUser),player:()=>ctx.window.loggedInPlayerData};
}
(async()=>{
 for(const stage of ['read','profile','titles']){
  const f=fixture(stage),job=f.load();await f.flush();f.leave();f.pending.resolve(stage==='read'?snapshot('Old'):stage==='profile'?{rating:1150,active:'match'}:undefined);
  assert.equal(await job,false);assert.equal(f.player(),null);assert.deepEqual(f.events,[]);assert.deepEqual(f.timers,[]);
 }
 const changed=fixture(),old=changed.load();changed.auth.currentUser={uid:'new'};assert.equal(await changed.load(),true);changed.pending.resolve(snapshot('Old'));assert.equal(await old,false);assert.equal(changed.player().uid,'new');assert.equal(changed.player().name,'New');assert.deepEqual(changed.events,['player-login-ready']);
 const pendingCurrent=fixture(),currentJob=pendingCurrent.load();assert.equal(await pendingCurrent.ctx.loadLoggedInPlayer({uid:'stale'}),false);pendingCurrent.pending.resolve(snapshot('Old'));assert.equal(await currentJob,true,'a stale sign-in callback cannot invalidate the current login');
 const normal=fixture('none');assert.equal(await normal.load(),true);assert.equal(normal.player().uid,'old');assert.equal(normal.player().rankRate,1150);assert.deepEqual(normal.events,['player-login-ready']);normal.leave();normal.timers.forEach(fn=>fn());assert(!normal.events.includes('resume'),'a queued resume must not start after logout');
 console.log('PASS login session races: logout during player/profile/title reads, account switch, stale response suppression, normal login and cancelled delayed resume');
})().catch(e=>{console.error(e);process.exitCode=1;});
