// Apply the balance update to the published rules without changing Standard/Custom validation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function replaceOnce(source,before,after){assert.equal(source.split(before).length-1,1,before);return source.replace(before,after);}
function upgradeAttackStance(input){
 const out=structuredClone(input),game=out.rules.freeGames.$game,history=out.rules.battleHistory.$game.advanced;
 assert(!game.advanced.attackStance,'Apply the attack-stance upgrade once');
 const g="root.child('freeGames/'+$game)",state=g+".child('state')";
 for(const p of [1,2]){
  const selected=`${g}.child('advanced/selected/${p}').val()`;
  const oldCapacity=`(${selected}==='chain'?5:${selected}==='boost'?3:${selected}==='cleanse'?1:(${selected}==='heal'||${selected}==='invincible')?2:0)`;
  const capacity=`(${selected}==='chain'?7:(${selected}==='boost'||${selected}==='invincible'||${selected}==='stance')?3:${selected}==='cleanse'?1:${selected}==='heal'?2:0)`;
  game.advanced.current[p]['.validate']=replaceOnce(game.advanced.current[p]['.validate'],oldCapacity,capacity);
  game.advanced.uses[p].$slot['.write']=replaceOnce(game.advanced.uses[p].$slot['.write'],oldCapacity,capacity);
  game.advanced.selected[p]['.validate']=replaceOnce(game.advanced.selected[p]['.validate'],"newData.val()==='invincible'","newData.val()==='invincible'||newData.val()==='stance'");
  const oldExhausted=`(${selected}==='chain'?5:${selected}==='boost'?3:${selected}==='cleanse'?1:2)`;
  game.state.skillsExhausted['.validate']=replaceOnce(game.state.skillsExhausted['.validate'],oldExhausted,`(${selected}==='chain'?7:${selected}==='cleanse'?1:${selected}==='heal'?2:3)`);
  const enhance=`+(${g}.child('state/enhance${p}').val()>0?1:0)`;
  assert.equal(game.transition['.validate'].split(enhance).length-1,2,'Advanced and Standard power formulas');
  const active=`${g}.child('advanced/current/${p}/turn').val()===${state}.child('turn').val()&&${g}.child('advanced/current/${p}/id').val()==='stance'`;
  // Only the first occurrence belongs to the Advanced branch.
  game.transition['.validate']=game.transition['.validate'].replace(enhance,enhance+`+(${active}?1:0)`);
  for(const slot of [6,7])history.uses[p]['.validate']+=`&&newData.child('${slot}').exists()===${g}.child('advanced/uses/${p}/${slot}').exists()`;
  history.uses[p].$slot['.validate']=replaceOnce(history.uses[p].$slot['.validate'],"newData.child('used').val()<=5","newData.child('used').val()<=7");
 }
 game.advanced.attackStance={'.read':'auth!=null','.validate':false};
 assert(Buffer.byteLength(JSON.stringify(out,null,1)+'\n')<256*1024,'Rules exceed RTDB source limit');
 return out;
}
module.exports={upgradeAttackStance};
if(require.main===module){const file=path.join(__dirname,'..','firebase-database.rules.json');fs.writeFileSync(file,JSON.stringify(upgradeAttackStance(JSON.parse(fs.readFileSync(file,'utf8'))),null,1)+'\n');}
