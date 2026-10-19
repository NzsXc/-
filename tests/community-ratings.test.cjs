const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const core = require('../community-rating-core.js');
const {harness, Snapshot} = require('./rules-harness.cjs');
const root = path.resolve(__dirname, '..');
const rules = JSON.parse(fs.readFileSync(path.join(root, 'firebase-database.rules.json'), 'utf8')).rules;
assert.deepEqual(core.categories.techniques, Array.from({length:12}, (_, i) => 'tech' + (i+1)));
assert.deepEqual(core.categories.skills, require('../advanced/rules.js').SKILLS.map(s => s.id));
assert.deepEqual([4,3.5,3.499,3,2.999,2.5,2.499,1,null].map(core.rank), ['S','S','A','A','B','B','C','C','unrated']);
assert.equal(core.summarize('techniques', {a:{tech1:4},b:{tech1:3}}).tech1.label, '(3.50)');
assert.equal(core.summarize('techniques').tech1.average, null);
const many = Object.fromEntries(Array.from({length:9}, (_, i) => ['u'+i,{tech1:i<5?4:3}]));
assert.equal(core.summarize('techniques',many).tech1.label, '(3.56)');
const h = harness();
for (const uid of ['p1','p2']) h.put('users/'+uid, {name:uid});
for (const category of Object.keys(core.categories)) {
  const id = core.categories[category][0], p = 'communityRatings/'+category+'/p1';
  h.commit({[p]:{[id]:4}}, 'p1');
  h.commit({[p]:{[id]:2}}, 'p1');
  h.commit({['communityRatings/'+category+'/p2']:{[id]:4}}, 'p2');
  const result = core.summarize(category, h.get('communityRatings/'+category))[id];
  assert.equal(result.count, 2); assert.equal(result.average,3); assert.equal(result.rank,'A');
  for (const bad of [0,5,1.5,'4',true]) assert.throws(() => h.commit({[p]:{[id]:bad}},'p1'), /permission_denied/);
  for (const value of [{charge:4},{attack:3},{block:2},{[id]:4,unknown:1},7,null,{}]) assert.throws(() => h.commit({[p]:value},'p1'), /permission_denied/);
  assert.throws(() => h.commit({[p]:{[id]:1}},'p2'), /permission_denied/);
  assert.throws(() => h.commit({['communityRatings/'+category+'/stranger']:{[id]:1}},'stranger'), /permission_denied/);
  assert.throws(() => h.commit({['communityRatings/'+category]:{p1:{[id]:1}}},'p1'), /permission_denied/);
  const expression = rules.communityRatings[category].$uid['.write'];
  for (const auth of [null, {uid:'p1',token:{firebase:{sign_in_provider:'anonymous'}}}]) {
    assert.equal(vm.runInNewContext(expression, {auth,$uid:'p1',root:new Snapshot(h.copy()),newData:new Snapshot(h.copy(),p)}), false);
  }
}
const before = JSON.parse(require('node:child_process').execFileSync('git',['show','HEAD:firebase-database.rules.json'],{cwd:root,encoding:'utf8'})).rules;
for (const key of Object.keys(before)) assert.deepEqual(rules[key],before[key], 'existing rule preserved: '+key);

async function transportTests() {
  let user={uid:'p1',isAnonymous:false}, authCallback, callbacks=[], saves=[], connected=true;
  const auth={get currentUser(){return user;},authStateReady:async()=>{}};
  const storage={techniques:{p1:{tech1:4},p2:{tech1:3}},skills:{p1:{boost:2}}};
  let rejected=false;
  const context = vm.createContext({window:{CommunityRatingCore:core},Promise,setTimeout,clearTimeout,
    ref:(_,p)=>p,
    onAuthStateChanged:(_,fn)=>{authCallback=fn;queueMicrotask(()=>fn(user));return()=>{};},
    signInAnonymously:async()=>{user={uid:'guest',isAnonymous:true};authCallback(user);},
    onValue:(p,fn,error)=>{
      const entry={p,fn,error};callbacks.push(entry);
      fn({val:()=>p==='.info/connected'?connected:structuredClone(storage[p.split('/')[1]])});
      return()=>{callbacks=callbacks.filter(value=>value!==entry);};
    },
    set:async(p,value)=>{
      if(rejected)throw Object.assign(Error('permission denied'),{code:'PERMISSION_DENIED'});
      saves.push({p,value});const [,category,uid]=p.split('/');storage[category][uid]=structuredClone(value);
      for(const item of callbacks)if(item.p==='communityRatings/'+category)item.fn({val:()=>structuredClone(storage[category])});
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root,'community-ratings.js'),'utf8').replace(/^import[^\n]*\n/gm,'').replace('export function','function'),context);
  const service=vm.runInContext('createCommunityRatings({}, auth)',vm.createContext({...context,auth}));
  let state;const unwatch=service.watch(value=>{state=value;});
  const tick=()=>new Promise(resolve=>setImmediate(resolve));await tick();
  assert.equal(state.canVote,true);assert.equal(state.connected,true);assert.equal(state.loaded.techniques,true);
  await service.save('techniques',{tech1:1});await service.save('techniques',{tech1:2});
  assert.equal(saves.length,2);assert.equal(saves[0].p,saves[1].p);
  assert.equal(core.summarize('techniques',state.ballots.techniques).tech1.count,2);
  assert.equal(core.summarize('techniques',state.ballots.techniques).tech1.average,2.5);
  await assert.rejects(service.save('techniques',{tech1:7}));
  rejected=true;await assert.rejects(service.save('skills',{boost:4}),/permission denied/);rejected=false;
  connected=false;callbacks.find(x=>x.p==='.info/connected').fn({val:()=>false});
  await assert.rejects(service.save('skills',{boost:3}),/通信/);connected=true;
  user={uid:'p2',isAnonymous:false};authCallback(user);await tick();assert.equal(state.uid,'p2');assert.equal(state.ballots.techniques.p1.tech1,2);
  callbacks.find(x=>x.p==='communityRatings/skills').error(Error('denied'));assert.match(state.errors.skills,/読み込めません/);
  await service.retry();assert.equal(callbacks.length,3);
  user={uid:'guest',isAnonymous:true};authCallback(user);await tick();assert.equal(state.canVote,false);
  await assert.rejects(service.save('skills',{boost:3}),/ログイン/);
  user=null;authCallback(user);await tick();assert.equal(state.uid,'guest');
  unwatch();assert.equal(callbacks.length,0);
}
transportTests().then(()=>console.log('PASS: thresholds, two decimals, one vote per account, editable ballots, access/score validation, unchanged existing rules, transport subscription/save/auth/error/retry lifecycle')).catch(error=>{console.error(error);process.exitCode=1;});
