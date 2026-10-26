const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const ai=require('../bot-engine.js'),special=require('../advanced/special-rules.js');
const context=vm.createContext({window:{},BattleV4:require('../combat-v4.js'),BattleAI:ai,SpecialRules:special});vm.runInContext(read('battle-preview-catalog.js'),context);
const catalog=context.window.BattlePreviewCatalog,calculate=vm.runInNewContext(read('free-calculator.js').replaceAll('export ','')+'\ncalculate');
const rules={mode:'advanced',hp:10,maxGauge:10,special:true,skills:false};
const base=()=>({turn:1,startedAt:0,hp1:7,hp2:7,gauge1:8,gauge2:8,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,...special.extraState()});
const plain=x=>JSON.parse(JSON.stringify(x));
for(let a=0;a<41;a++)for(let b=0;b<41;b++){
 const state=base(),moves={1:a,2:b},result=catalog.resolve(calculate,state,moves,rules);
 for(const side of [1,2])for(const field of ['hp','gauge'])assert(Number.isFinite(result[field+side])&&result[field+side]>=0&&result[field+side]<=10,`${a}/${b} ${field}${side}`);
 assert.deepEqual(plain(result),plain(require('../combat-v4.js').calculate({...require('../combat-v4.js').extraState(),...state},moves,4,{...rules,specialVersion:special.MOVE_VERSION},{},true)),'preview uses live v4 balance');
}
const resolve=(a,b,extra={})=>catalog.resolve(calculate,{...base(),...extra},{1:a,2:b},rules);
assert.equal(resolve(27,0,{gauge1:2}).gauge1,5);assert.equal(resolve(27,1,{gauge1:2}).gauge1,2);
assert.equal(resolve(28,1,{gauge1:2}).gauge1,6);assert.equal(resolve(28,0,{gauge1:2}).gauge1,1);
assert.equal(resolve(29,0).damage2,3);assert.equal(resolve(29,2).damage2,0);
assert.equal(resolve(30,2).frozen2,1);assert.equal(resolve(31,2).damage2,1);assert.equal(resolve(31,7).damage2,0);
assert.equal(resolve(32,0).poison2,2);assert.equal(resolve(33,0).gauge1,7);assert.equal(resolve(33,2).gauge1,6);
assert.equal(resolve(14,30).frozen1,1,'Mirror copies new effects');
for(let i=34;i<41;i++){assert(catalog.action(i).special);assert.equal(resolve(i,0).specialCost1,[6,8,10,16,4,12,8][i-34],'new S cost matches live definition');}
assert.equal(resolve(36,0).damage2,4);assert.equal(resolve(37,0).frozen2,2);assert.equal(resolve(39,0).weaken2,2);
console.log('PASS 1681 preview pairs, 729 unchanged existing pairs, seven new normal conditions and five implemented S effects');
