// Snapshot exhaustion at the next turn boundary; spending the final use must
// never shorten the currently open window or cancel its pending presentation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function upgradeSkillFlow(input){
 const out=structuredClone(input),game=out.rules.freeGames.$game;
 assert(!game.state.skillsExhausted,'Apply the skill-flow upgrade once');
 const g="root.child('freeGames/'+$game)",state=g+".child('state')";
 let timings=0;
 function timing(node,location=''){
  for(const [key,value]of Object.entries(node)){
   const at=location+'/'+key;
   if(typeof value==='string'){
    const current=at==='/state/.validate'?'data':state;
    timings+=value.split('?3000+').length-1;
    node[key]=value.replaceAll('?3000+',`?(${current}.child('skillsExhausted').val()===true?0:3000)+`);
   }else if(value&&typeof value==='object')timing(value,at);
  }
 }
 timing(game);assert.equal(timings,22,'Upgrade each Advanced opening/deadline check');
 const spent=p=>{
  const selected=`${g}.child('advanced/selected/${p}').val()`;
  const capacity=`(${selected}==='chain'?5:${selected}==='boost'?3:${selected}==='cleanse'?1:2)`;
  const used=`${g}.child('advanced/current/${p}/used')`;
  return `${used}.isNumber()&&${used}.val()>=${capacity}`;
 };
 game.state.skillsExhausted={'.validate':`newData.isBoolean()&&newData.val()===(${g}.child('roomRules/mode').val()==='advanced'&&${spent(1)}&&${spent(2)})`};
 game.advanced.skillFlow={'.read':'auth!=null','.validate':false};
 out.rules.battleHistory.$game.finalState.skillsExhausted={'.validate':`newData.isBoolean()&&newData.val()===${g}.child('state/skillsExhausted').val()`};
 // Equivalent path notation leaves room under RTDB's 256 KiB source limit.
 function compact(node){for(const [key,value]of Object.entries(node)){
  if(typeof value==='string')node[key]=value.replaceAll("root.child('freeGames').child($game)",g);
  else if(value&&typeof value==='object')compact(value);
 }}compact(out);
 assert(Buffer.byteLength(JSON.stringify(out,null,1)+'\n')<256*1024,'Rules source exceeds the RTDB deployment limit');
 return out;
}
module.exports={upgradeSkillFlow};
if(require.main===module){const file=path.join(__dirname,'..','firebase-database.rules.json');fs.writeFileSync(file,JSON.stringify(upgradeSkillFlow(JSON.parse(fs.readFileSync(file,'utf8'))),null,1)+'\n');}
