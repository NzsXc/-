const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test');
function fixture(status=async id=>({match:{id}})){
 const data={'freeAccounts/host':{name:'Host',active:''}},subscriptions=new Map(),timers=new Map(),intervals=new Map(),requests=[],entered=[],errors=[];
 let next=0;
 const transport=async d=>{if(d.op==='profile')return {};assert.equal(d.op,'status');requests.push(d.matchId);return status(d.matchId,requests.length);};
 const context=vm.createContext({console,window:{RoomRules:require('../room-rules.js'),AdvancedRules:require('../advanced/rules.js')},Date,
  ref:(_db,p)=>p,get:async p=>({val:()=>data[p]??null}),set:async(p,value)=>{data[p]=value;},push:()=>({key:'room'}),
  onValue:(p,callback)=>{subscriptions.set(p,callback);if(p==='.info/serverTimeOffset')callback({val:()=>0});return ()=>{if(subscriptions.get(p)===callback)subscriptions.delete(p);};},
  onDisconnect:()=>({remove:async()=>{},cancel:async()=>{}}),serverTimestamp:Date.now,
  setInterval:(fn,ms)=>{const id=++next;intervals.set(id,{fn,ms});return id;},clearInterval:id=>intervals.delete(id),
  setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
  update:async()=>{},remove:async p=>{delete data[p];},signInAnonymously:()=>assert.fail('already signed in')
 });
 const source=fs.readFileSync(path.join(__dirname,'..','protected-rooms.js'),'utf8').replace(/^import[^\n]*\n/gm,'').replace('export function','function');
 vm.runInContext(source,context);
 const api=vm.runInContext('createProtectedRooms',context)({}, {currentUser:{uid:'host'},authStateReady:async()=>{}},transport);
 const flush=async()=>{for(let i=0;i<5;i++)await new Promise(setImmediate);};
 return {api,data,timers,intervals,requests,entered,errors,flush,
  watch:()=>api.watchHost('room',m=>entered.push(m),e=>errors.push(e)),
  emit:async(game='match')=>{if(data['friendRooms/room'])data['friendRooms/room'].game=game;subscriptions.get('friendRooms/room')?.({val:()=>data['friendRooms/room']??null});await flush();},
  tick:async()=>{assert.equal(timers.size,1);const [id,timer]=timers.entries().next().value;timers.delete(id);await timer.fn();await flush();return timer.ms;}
 };
}
test('a failed status retries without another room event and enters exactly once',async()=>{
 const f=fixture(async(id,attempt)=>{if(attempt===1)throw Error('temporary failure');return {match:{id}};});
 await f.api.create();f.watch();await f.emit();
 assert.equal(f.entered.length,0);assert.equal(f.errors.length,1);assert.equal(f.intervals.size,0);assert.equal(f.requests.length,1);
 assert.equal(f.timers.size,1,'failed entry schedules a retry without another room event');
 await f.emit();assert.equal(f.requests.length,1,'repeated snapshots do not bypass the pending retry');
 assert.equal(await f.tick(),1000);assert.equal(f.entered.length,1);assert.equal(f.entered[0].id,'match');assert.equal(f.timers.size,0);
 await f.emit();assert.equal(f.requests.length,2);assert.equal(f.entered.length,1);
});
test('repeated failures back off to five seconds and unsubscribe cancels retries',async()=>{
 const f=fixture(async()=>{throw Error('offline');});await f.api.create();const stop=f.watch();await f.emit();
 for(const delay of [1000,2000,4000,5000,5000])assert.equal(await f.tick(),delay);
 assert.equal(f.requests.length,6);stop();assert.equal(f.timers.size,0);await f.emit();assert.equal(f.requests.length,6);
});
for(const reject of [false,true])test('unsubscribe suppresses an in-flight '+(reject?'failure':'success'),async()=>{
 let finish;const f=fixture(()=>new Promise((resolve,fail)=>{finish=reject?fail:resolve;}));
 await f.api.create();const stop=f.watch();await f.emit();assert.equal(f.requests.length,1);stop();
 finish(reject?Error('late failure'):{match:{id:'match'}});await f.flush();
 assert.equal(f.entered.length,0);assert.equal(f.errors.length,0);assert.equal(f.timers.size,0);
});
test('leaving while a retry is pending cancels it and restores the already joined match',async()=>{
 const f=fixture(async(id,attempt)=>{if(attempt===1)throw Error('offline');return {match:{id}};});
 await f.api.create();f.watch();await f.emit();const response=await f.api.leave();
 assert.equal(response.match.id,'match');assert.equal(f.timers.size,0);assert.equal(f.entered.length,0);
 await f.emit();assert.equal(f.requests.length,2);
});
test('a new watch ignores the previous in-flight response',async()=>{
 let finish;const f=fixture((id,attempt)=>attempt===1?new Promise(resolve=>{finish=resolve;}):Promise.resolve({match:{id}}));
 await f.api.create();f.watch();await f.emit();f.watch();await f.emit();
 assert.equal(f.entered.length,1);finish({match:{id:'stale'}});await f.flush();
 assert.equal(f.entered.length,1);assert.equal(f.entered[0].id,'match');assert.equal(f.timers.size,0);
});
test('room removal after a failed read retains the joined game ID for retry',async()=>{
 const f=fixture(async(id,attempt)=>{if(attempt===1)throw Error('offline');return {match:{id}};});
 await f.api.create();f.watch();await f.emit();delete f.data['friendRooms/room'];await f.emit();await f.tick();
 assert.equal(f.entered.length,1);assert.equal(f.entered[0].id,'match');
});
test('a successful first request needs no retry',async()=>{
 const f=fixture();await f.api.create();f.watch();await f.emit();
 assert.equal(f.requests.length,1);assert.equal(f.entered.length,1);assert.equal(f.errors.length,0);assert.equal(f.timers.size,0);
});
