const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');const {evaluate,Snapshot}=require('./rules-harness.cjs'),V4=require('../combat-v4.js'),S=require('../advanced/special-rules.js'),A=require('../advanced/rules.js'),build=require('./build-account-update-rules.cjs');
const legacy=vm.runInNewContext(fs.readFileSync('free-calculator.js','utf8').replaceAll('export ','')+';calculate',{window:{BattleV4:V4}}),form=build.upgrade.formulas;
const state=()=>({turn:1,startedAt:0,hp1:9,hp2:9,gauge1:8,gauge2:8,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,...S.extraState(),...V4.extraState()});
const compiled=Object.fromEntries(Object.entries(form).map(([k,v])=>[k,new vm.Script(`newData.child('${k}').val()===(${v})`)]));let cases=0;for(const version of [2,3,4]){const max=version===4?40:version===3?26:14;for(let x=0;x<=max;x++)for(let y=0;y<=max;y++){
 const s={...state(),enhance1:x%3,momentum2:!!(y%2),specialMomentum1:version>=3?x%2:0,ruin1:x%4,specialRuin1:version>=3?x%4:0};if(version<4)for(const k of V4.fields)delete s[k];if(version<3)for(const k of S.fields)delete s[k];
 const rules={mode:'advanced',hp:12,initialGauge:8,maxGauge:10,skills:false,special:version>=3},moves={1:x,2:y},result=JSON.parse(JSON.stringify(legacy(s,moves,version,rules,{},true)));
 const game={rulesVersion:version,roomRules:rules,foresightShield:true,state:s,moves:{1:moves}},before={freeGames:{match:game}},after=structuredClone(before);after.freeGames.match.transition=result;after.freeGames.match.state={...s,...result};
 const context=vm.createContext({auth:{uid:'p1'},root:new Snapshot(before),data:new Snapshot(before,'freeGames/match/transition'),newData:new Snapshot(after,'freeGames/match/transition'),now:10000,$game:'match'});for(const[k,v]of Object.entries(form)){if(version<4&&['inputFrozen','inputPoison','hit','gain','drained','frozen','poison'].some(prefix=>k.startsWith(prefix)))continue;if(!compiled[k].runInContext(context)){console.error('MISMATCH',version,x,y,k,result[k],vm.runInContext(v,context));process.exit(1);}}
 cases++;
 }}console.log('PASS',cases,'legacy and new action pairs agree with server formulas');
const rules={hp:10,maxGauge:10};const run=(a,b,s={})=>V4.calculate({...state(),...s},{1:a,2:b},4,rules,{},true);
assert.equal(run(3,2).damage2,1);assert.equal(run(3,0).damage2,2);assert.equal(run(3,7).damage2,0);
assert.equal(run(27,0,{gauge1:2}).gauge1,5);assert.equal(run(27,1,{gauge1:2}).gauge1,2);assert.equal(run(28,1,{gauge1:2}).gauge1,6);assert.equal(run(29,0).damage2,3);assert.equal(run(31,2,{gauge1:3}).gauge1,3);assert.equal(run(33,0).gauge2,9);
let frozen=run(30,0);assert.equal(frozen.frozen2,1);const follow=run(0,29,frozen);assert.equal(follow.action2,-1);assert.equal(follow.damage1,0);assert.equal(follow.frozen2,0);
let poison=run(32,0);assert.equal(poison.poison2,2);poison=run(0,0,poison);assert.equal(poison.damage2,1);assert.equal(poison.poison2,1);poison=run(0,0,poison);assert.equal(poison.damage2,1);assert.equal(poison.poison2,0);
console.log('PASS new effects, Breach shield/clash, freeze and two-turn poison');
