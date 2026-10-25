const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {harness,Snapshot}=require('./rules-harness.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const window={addEventListener(){},dispatchEvent(){}};
const context=vm.createContext({window,console,Event:class{},document:{createElement:()=>({className:'',dataset:{},children:[],setAttribute(){},append(...children){this.children.push(...children);}})}});
vm.runInContext(read('battle-frames.js'),context);
vm.runInContext(read('titles-catalog.js'),context);
const C=window.BattleFrameCatalog;
const uses=(n,k=5)=>Object.fromEntries(Array.from({length:k},(_,i)=>[i+1,{count:n}]));
for(const [id,threshold]of [['silver',30],['blue-flame',50]]){
 for(const [counts,expected]of [[uses(threshold-1),false],[uses(threshold,4),false],[uses(threshold),true],[{...uses(threshold,4),20:{count:999}},false]])assert.equal(C.unlocked(id,{uses:counts}),expected);
}
for(const [n,expected]of [[776,false],[777,true]])assert.equal(C.unlocked('diamond',{uses:{1:{count:n}}}),expected);
assert(!C.unlocked('gold',{onlineWins:60,friendWins:39}));assert(C.unlocked('gold',{onlineWins:60,friendWins:40}));
assert(C.unlocked('',{}));assert(!C.unlocked('unknown',{}));assert.equal(C.normalize('__proto__'),'');
assert.equal(C.progress({uses:{1:{count:'777'},2:{count:-1},3:{count:Infinity}}}).total,0);
assert.match(window.TitleCatalog.badge('skill_name_13').className,/badge-focus /);
assert.doesNotMatch(window.TitleCatalog.badge('skill_name_13').className,/badge-gold /);
assert.match(window.TitleCatalog.badge('skill_prestige_13').className,/badge-gold .*tier-prestige/);
const h=harness();
for(const id of ['silver','blue-flame','gold','diamond'])assert.throws(()=>h.commit({'battleFrameLoadouts/p1':id},'p1'),/permission_denied/);
h.commit({'battleFrameLoadouts/p1':''},'p1');
h.put('titleProgress/p1/uses',uses(30));h.commit({'battleFrameLoadouts/p1':'silver'},'p1');
assert.throws(()=>h.commit({'battleFrameLoadouts/p1':'blue-flame'},'p1'),/permission_denied/);
h.put('titleProgress/p1/uses',uses(50));h.commit({'battleFrameLoadouts/p1':'blue-flame'},'p1');
h.put('freeAccounts/p1/onlineWins',60);h.put('freeAccounts/p1/friendWins',40);h.commit({'battleFrameLoadouts/p1':'gold'},'p1');
h.put('titleProgress/p1/uses/6/count',527);h.commit({'battleFrameLoadouts/p1':'diamond'},'p1');
for(const value of ['unknown',{},null,5])assert.throws(()=>h.commit({'battleFrameLoadouts/p1':value},'p1'),/permission_denied/);
assert.throws(()=>h.commit({'battleFrameLoadouts/p1':'diamond'},'p2'),/permission_denied/);
assert.throws(()=>h.commit({'battleFrameLoadouts/p2':'diamond'},'p2'),/permission_denied/,'cannot borrow another player progress');
assert.throws(()=>h.commit({'battleFrameLoadouts/p2':'diamond','titleProgress/p2/uses/1/count':777},'p2'),/permission_denied/);
const rule=JSON.parse(read('firebase-database.rules.json')).rules.battleFrameLoadouts.$uid['.write'];
assert.equal(vm.runInNewContext(rule,{auth:{uid:'p1',token:{firebase:{sign_in_provider:'anonymous'}}},$uid:'p1',newData:new Snapshot({v:'silver'},'v')}),false);
// Exercise the real async service through the existing RTDB rules harness.
context.ref=vm.runInContext('ref',h.ctx);context.get=vm.runInContext('get',h.ctx);context.set=vm.runInContext('set',h.ctx);
vm.runInContext(read('battle-frame-service.js').replace(/^import[^\n]*\n/gm,'').replace('export function','function'),context);
const auth={currentUser:{uid:'p1',isAnonymous:false}},service=vm.runInContext('createBattleFrameService',context)({uid:'p1'},auth);
(async()=>{
 const data=await service.readOwn();assert.equal(data.frame,'diamond');
 await service.saveFrame('silver');assert.equal(h.get('battleFrameLoadouts/p1'),'silver');
 assert.equal(await service.forPlayer('p1'),'silver');assert.equal((await service.readOwn()).frame,'silver');
 await assert.rejects(()=>service.saveFrame('unknown'),/不明/);
 auth.currentUser={uid:'p2',isAnonymous:false};await assert.rejects(()=>service.saveFrame('gold'),/解放条件/);
 auth.currentUser={uid:'p1',isAnonymous:true};await assert.rejects(()=>service.readOwn(),/ログイン/);
 console.log('PASS: all unlock boundaries, Focus30, persistence, real rules, forged counts, cross-user and guest rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
