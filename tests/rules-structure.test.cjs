const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'..','firebase-database.rules.json'),rules=JSON.parse(fs.readFileSync(file,'utf8'));
function validate(node,location='rules'){
 if(!node||typeof node!=='object')return;
 const wildcards=Object.keys(node).filter(key=>key.startsWith('$'));
 assert(wildcards.length<=1,location+': Cannot have multiple default rules ('+wildcards.join(', ')+')');
 for(const [key,value]of Object.entries(node))validate(value,location+'/'+key);
}
// The structural error is rejected by Firebase before expressions can be evaluated.
assert.throws(()=>validate({uses:{$other:{'.validate':false},$slot:{'.validate':true}}}),/Cannot have multiple default rules/);
validate(rules);
for(const category of ['freeGames','battleHistory'])for(const side of [1,2]){
 const branch=rules.rules[category].$game.advanced.uses[side];
 assert.deepEqual(Object.keys(branch).filter(k=>k.startsWith('$')),['$slot']);
 assert.equal(branch.$slot.$other['.validate'],false,'unknown receipt fields remain forbidden');
}
console.log('PASS: complete rules tree has one wildcard per node; regression detects duplicate defaults; receipt field restrictions remain');
