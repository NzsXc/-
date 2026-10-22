const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness}=require('./rules-harness.cjs');
const root=path.resolve(__dirname,'..'),plain=value=>JSON.parse(JSON.stringify(value));
const source=fs.readFileSync(path.join(root,'advanced/spectator.js'),'utf8').replace('export function','function')+'\n'+fs.readFileSync(path.join(root,'protected-rooms.js'),'utf8').replace(/^import[^\n]*\n/gm,'').replace('export function','function');
function setup(){
 const h=harness(),reads=[],subscriptions=[],timers=new Map(),operations=[],renderErrors=[];let nextTimer=0,beforeGet=null;
 const db={uid:'viewer'},auth={currentUser:{uid:'viewer'},authStateReady:async()=>{}};
 const get=async r=>{
  reads.push(r.path);beforeGet?.(r.path);
  if(!h.allowed('.read',r.path,'viewer'))throw Error('permission_denied: '+r.path);
  const value=structuredClone(h.get(r.path));return {val:()=>value};
 };
 const ctx=vm.createContext({window:{AdvancedRules:require('../advanced/rules.js'),BattleAI:require('../bot-engine.js'),RoomRules:require('../room-rules.js')},console:{...console,error:(...args)=>renderErrors.push(args)},Date:{now:h.now},
  ref:(db,path)=>({path}),get,
  set(){assert.fail('Spectators must not write');},update(){assert.fail('Spectators must not write');},remove(){assert.fail('Spectators must not write');},
  onValue(r,callback,onError){const sub={path:r.path,callback,onError,active:true};subscriptions.push(sub);queueMicrotask(()=>{
   if(!sub.active)return;if(r.path==='.info/serverTimeOffset')callback({val:()=>0});else get(r).then(callback,onError);
  });return ()=>{sub.active=false;};},
  signInAnonymously:async()=>{auth.currentUser={uid:'viewer'};},serverTimestamp:()=>h.now(),
  setTimeout:(callback,delay)=>{const id=++nextTimer;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),setInterval(){assert.fail('No spectator heartbeat');},clearInterval(){},
  db,auth,transport:async data=>{operations.push(data.op);assert.equal(data.op,'profile');return {};},
  history:{find:async id=>{const value=(await get({path:'battleHistory/'+id})).val();return value?{...value,id}:null;}}
 });
 vm.runInContext(source,ctx);const api=vm.runInContext('createProtectedRooms(db,auth,transport,history)',ctx);
 async function flush(){for(let i=0;i<20;i++)await new Promise(setImmediate);}
 async function tick(){const item=[...timers].find(([,timer])=>timer.delay===1200);assert(item,'poll is scheduled');timers.delete(item[0]);await item[1].callback();await flush();}
 async function emit(node){for(const sub of subscriptions)if(sub.active&&sub.path===node)sub.callback({val:()=>structuredClone(h.get(node))});await flush();}
 return {h,api,reads,subscriptions,timers,operations,renderErrors,auth,flush,tick,emit,beforeGet:callback=>{beforeGet=callback;}};
}
(async()=>{
 const f=setup(),base=f.h.get('freeGames/match');
 f.h.put('freeAccounts/p3',{name:'C',active:'friendMatch'});f.h.put('freeAccounts/p4',{name:'D',active:'friendMatch'});
 f.h.put('freeGames/friendMatch',{...base,kind:'friend',players:{1:'p3',2:'p4'}});f.h.put('friendRooms/friendRoom',{game:'friendMatch'});
 const lists=[],errors=[];const stop=f.api.watchAllRooms(value=>lists.push(plain(value)),error=>errors.push(error));await f.flush();
 assert.deepEqual(Object.keys(lists.at(-1)).sort(),['friendRoom','random:match']);
 assert.equal(lists[0]['random:match'].players[1].name,'A');assert.equal(lists[0]['random:match'].players[2].name,'B');
 assert.deepEqual(lists[0]['random:match'].players[1].techniques,[0,1,2]);
 assert.deepEqual(lists[0]['random:match'].battle.lastAction,{1:null,2:null});
 assert.equal(f.reads.filter(p=>p==='freeGames/match/state').length,1,'two accounts yield one match');
 assert.equal(f.reads.filter(p=>p==='freeGames/friendMatch/state').length,1,'friend matches are not duplicated');
 assert(!f.h.allowed('.read','freeGames','viewer'));assert(!f.h.allowed('.read','freeGames/match','viewer'));
 assert(!f.h.allowed('.read','freeGames/match/moves/1/1','viewer'));assert(!f.h.allowed('.write','freeGames/match/state','viewer'));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),start=html.indexOf('  function activeBattles(rooms){'),end=html.indexOf('  window.onlineBattle =',start);
 const filter=vm.runInNewContext('const PRESENCE_GRACE_MS=60000,serverTimeOffset=0;'+html.slice(start,end)+'activeBattles',{Date:{now:f.h.now}});
 assert.equal(filter(lists[0]).length,2,'the actual UI filter accepts random and friend snapshots');
 // Active account subscriptions discover games started after opening the list.
 f.h.put('freeGames/later',{...base,players:{1:'p5',2:'p6'}});f.h.put('freeAccounts/p5',{name:'E',active:'later'});f.h.put('freeAccounts/p6',{name:'F',active:'later'});
 await f.emit('freeAccounts');await f.tick();assert(lists.at(-1)['random:later']);
 assert.equal(f.reads.filter(p=>p==='freeAccounts').length,1,'account discovery is subscribed, not redownloaded every poll');
 // Selection is not listed and hidden techniques are never fetched.
 f.h.put('freeGames/selecting',{...base,state:null,ready:{1:true}});f.h.put('freeAccounts/p7',{active:'selecting'});
 f.h.put('freeAccounts/bad',{active:'bad/path'});f.h.put('freeAccounts/missing',{active:'missing'});
 await f.emit('freeAccounts');await f.tick();assert(!lists.at(-1)['random:selecting']);assert(!f.reads.some(p=>p.includes('bad/path')));
 const values=[];const stopRoom=f.api.watchRoom('random:match',value=>values.push(plain(value)),error=>errors.push(error));await f.flush();
 f.h.put('freeGames/match/ready/2',false);f.reads.length=0;await f.tick();
 // tick may select the list timer; explicitly advance every remaining poll once.
 for(const [id,timer]of [...f.timers]){f.timers.delete(id);await timer.callback();}await f.flush();
 assert.deepEqual(values.at(-1).players[1].techniques,[]);assert(!f.reads.some(p=>p.startsWith('freeGames/match/loadouts')));
 f.h.put('freeGames/match/ready/2',true);
 f.h.put('freeGames/match/state',{...base.state,turn:2,startedAt:10000,previousDeadline:11200,hp2:9,ruin1:1,last1:'block',last2:'reflect'});
 f.h.put('freeGames/match/transition',{turn:2,action1:1,action2:0,damage1:0,damage2:1});f.h.setClock(10100);
 for(const [id,timer]of [...f.timers]){f.timers.delete(id);await timer.callback();}await f.flush();
 assert.deepEqual(values.at(-1).battle.lastAction,{1:{data:{type:'block'}},2:{data:{type:'reflect'}}});
 const effect=values.at(-1).battle;assert.equal(effect.phase,'effect');assert.equal(effect.countdownEndsAt,11200);assert.equal(effect.revealAt,11700);assert.equal(effect.effectStartAt,13000);assert.equal(effect.actions[1].data.name,'アタック');assert.equal(effect.ruinTurns[1],1);
 f.h.setClock(14200);for(const [id,timer]of [...f.timers]){f.timers.delete(id);await timer.callback();}await f.flush();assert.equal(values.at(-1).battle.phase,'battle');
 // One broken/deleted game cannot hide the remaining healthy matches.
 f.beforeGet(p=>{if(p==='freeGames/later/state')throw Error('temporary read failure');});
 for(const [id,timer]of [...f.timers]){f.timers.delete(id);await timer.callback();}await f.flush();assert(lists.at(-1)['random:match']);assert(lists.at(-1).friendRoom);assert.deepEqual(errors,[]);f.beforeGet(null);
 // Deleting a live node during the loadout read restores the archived result.
 const history={kind:'random',players:{1:{name:'A',loadout:[0,1,2]},2:{name:'B',loadout:[0,1,2]}},settled:{winner:1},finalState:{...base.state,turn:3,hp2:0}};
 f.h.put('battleHistory/match',history);let raced=false;
 f.beforeGet(p=>{if(p==='freeGames/match/loadouts/1'&&!raced){raced=true;f.h.put('freeGames/match',null);}});
 for(const [id,timer]of [...f.timers]){f.timers.delete(id);await timer.callback();}await f.flush();
 assert(raced);assert.equal(values.at(-1).battle.phase,'finished');assert.equal(values.at(-1).battle.result,'1P WIN');assert(!lists.at(-1)['random:match']);assert.deepEqual(errors,[]);
 assert(!f.reads.some(p=>/^freeGames(?:\/[^/]+)?$/.test(p)||/\/(moves|advance)(?:\/|$)/.test(p)),'no private roots/actions/leases are read');
 assert.deepEqual(f.renderErrors,[]);stop();stopRoom();assert.equal(f.timers.size,0);assert(f.subscriptions.filter(s=>s.path!=='.info/serverTimeOffset').every(s=>!s.active));
 // Rendering exceptions are logged separately and do not become network errors or stop polling.
 const r=setup(),networkErrors=[];
 const stopRender=r.api.watchRoom('random:match',()=>{throw Error('render failure');},error=>networkErrors.push(error));await r.flush();
 assert.deepEqual(networkErrors,[]);assert.equal(r.renderErrors.length,1);
 await r.tick();assert.equal(r.renderErrors.length,2);assert.deepEqual(networkErrors,[]);stopRender();assert.equal(r.timers.size,0);
 // Cancelling before authentication completes must not attach late listeners.
 const c=setup();let release;c.auth.authStateReady=()=>new Promise(resolve=>{release=resolve;});
 const cancel=c.api.watchAllRooms(()=>assert.fail('cancelled callback'),()=>assert.fail('cancelled error'));cancel();release();await c.flush();assert.equal(c.subscriptions.length,1);assert.equal(c.timers.size,0);
 console.log('PASS: random discovery, actual rules/UI filter, deduplication, dynamic lists, friend regression, hidden loadouts/moves, transition timing, archive races, error isolation and cancellation');
})().catch(error=>{console.error(error);process.exitCode=1;});

