const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {opening}=require('./build-battle-rules.cjs');
function upgradeLateSkill(input){
 const out=structuredClone(input),game=out.rules.freeGames.$game;
 assert(!game.advanced.lateSkill,'Apply the late-skill upgrade once');
 const g="root.child('freeGames/'+$game)",state=g+".child('state')",start=opening(state),end=`(${start}+3000)`,at="newData.child('at').val()";
 let count=0;
 function timing(node){for(const [key,value]of Object.entries(node)){
  if(typeof value==='string'){count+=value.split('?0:3000)+').length-1;node[key]=value.replaceAll('?0:3000)+','?0:3500)+');}
  else if(value&&typeof value==='object')timing(value);
 }}timing(game);assert.equal(count,22);
 const oldWindow=`now>=${end}-3000&&now<${end}`;
 const window=`newData.child('at').isNumber()&&${at}>=${start}&&${at}<${end}&&${at}<=now&&now<=${at}+500`;
 for(const p of [1,2]){
  const current=game.advanced.current[p],slot=game.advanced.uses[p].$slot;
  for(const node of [current,slot]){
   assert(node['.write'].includes(oldWindow));node['.write']=node['.write'].replace(oldWindow,window);
   assert(node['.validate'].includes(`${at}===now`));node['.validate']=node['.validate'].replace(`${at}===now`,`${at}<=now&&now<=${at}+500`);
  }
 }
 game.advanced.lateSkill={'.read':'auth!=null','.validate':false};
 assert(Buffer.byteLength(JSON.stringify(out,null,1)+'\n')<256*1024,'Rules exceed RTDB source limit');
 return out;
}
module.exports={upgradeLateSkill};
if(require.main===module){const file=path.join(__dirname,'..','firebase-database.rules.json');fs.writeFileSync(file,JSON.stringify(upgradeLateSkill(JSON.parse(fs.readFileSync(file,'utf8'))),null,1)+'\n');}
