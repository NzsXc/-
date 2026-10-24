// Keep the existing 3 s UI and 500 ms receive grace, but gate the latter
// with the server's now so serverTimestamp() receipts can arrive in that grace.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function upgradeSkillTimestamp(input){
 const out=structuredClone(input),advanced=out.rules.freeGames.$game.advanced;
 const at="newData.child('at').val()",marker=at+'<';
 for(const player of [1,2])for(const node of [advanced.current[player],advanced.uses[player].$slot]){
  const rule=node['.write'],start=rule.indexOf(marker);
  assert(start>=0,'Expected one legacy skill receipt upper bound');
  const end=rule.indexOf('&&',start),bound=rule.slice(start+marker.length,end);
  assert(bound.includes('+3000'),'Expected the 3-second skill window');
  assert.equal((rule.match(/newData\.child\('at'\)\.val\(\)<(?!=)/g)||[]).length,1,'Ambiguous receipt bound');
  node['.write']=rule.slice(0,start)+`now<(${bound}+500)`+rule.slice(end);
 }
 assert(Buffer.byteLength(JSON.stringify(out)+'\n')<256*1024,'Rules source exceeds RTDB limit');
 return out;
}
module.exports={upgradeSkillTimestamp};
if(require.main===module){
 const file=process.argv[2]||path.join(__dirname,'..','firebase-database.rules.json');
 const input=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 fs.writeFileSync(file,JSON.stringify(upgradeSkillTimestamp(input))+'\n');
}
