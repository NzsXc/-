// Upgrade the existing rules without changing combat formulas or move validation.
const fs=require('node:fs'),assert=require('node:assert/strict');
function upgradeAdvancedOptions(input){
 const out=structuredClone(input),r=out.rules,g=r.freeGames.$game,h=r.battleHistory.$game;
 assert(!g.advanced.optionsV1,'Apply the Advanced options upgrade once');
 const game="root.child('freeGames/'+$game)",off=game+".child('roomRules/skills').val()===false";
 for(const [node,origin]of [[r.friendRooms.$room.roomRules,'data'],[g.roomRules,"root.child('friendRooms').child(newData.parent().child('room').val()).child('roomRules')"],[h.roomRules,game+".child('roomRules')"]]){
  for(const key of ['skills','special']){
   node[key]={'.validate':"newData.isBoolean()&&newData.parent().child('mode').val()==='advanced'"};
   node['.validate']+=`&&${origin==='data'?"(!data.exists()||":"("}newData.child('${key}').val()===${origin}.child('${key}').val())`;
  }
 }
 for(const side of [1,2]){
  const before="newData.parent().parent().child('advanced/selected/"+side+"').isString()";
  assert(g.ready[side]['.validate'].includes(before));
  g.ready[side]['.validate']=g.ready[side]['.validate'].replace(before,'('+off+'||'+before+')');
  g.advanced.selected[side]['.write']+='&&!('+off+')';
  g.advanced.current[side]['.write']+='&&!('+off+')';
  g.advanced.uses[side].$slot['.write']+='&&!('+off+')';
 }
 const exhausted=g.state.skillsExhausted['.validate'],mark=".child('roomRules/mode').val()==='advanced'&&";
 assert(exhausted.includes(mark));
 g.state.skillsExhausted['.validate']=exhausted.replace(mark,mark+'('+off+'||(')+'))';
 // The initial state as well as every following state must skip the skill window.
 g.state['.validate']+='&&(!('+game+".child('roomRules/mode').val()==='advanced'&&"+off+")||newData.child('skillsExhausted').val()===true)";
 g.advanced.optionsV1={'.read':'auth!=null','.validate':false};
 const shape={'.validate':"newData.hasChildren(['max','gauge'])&&newData.child('max').val()===30&&newData.child('gauge').hasChildren(['1','2'])",max:{'.validate':'newData.val()===30'},gauge:{1:{'.validate':'newData.isNumber()&&newData.val()===0'},2:{'.validate':'newData.isNumber()&&newData.val()===0'},$other:{'.validate':false}},$other:{'.validate':false}};
 g.special={...structuredClone(shape),'.read':"auth!=null&&"+game+".child('roomRules/special').val()===true",'.write':"auth!=null&&!"+game+".exists()&&newData.exists()&&newData.parent().child('players/1').val()===auth.uid"};
 g.special['.validate']+="&&newData.parent().child('roomRules/mode').val()==='advanced'&&newData.parent().child('roomRules/special').val()===true";
 g.roomRules['.validate']+="&&(newData.parent().child('special').exists()===(newData.child('mode').val()==='advanced'&&newData.child('special').val()===true))";
 h.special=structuredClone(shape);
 h.special['.validate']+='&&'+game+".child('special').exists()&&newData.child('max').val()==="+game+".child('special/max').val()&&newData.child('gauge/1').val()==="+game+".child('special/gauge/1').val()&&newData.child('gauge/2').val()==="+game+".child('special/gauge/2').val()";
 h['.validate']+='&&(newData.child(\'special\').exists()==='+game+".child('special').exists())";
 // Combine literal child paths to stay under Firebase's 256 KiB rule-file limit.
 function compact(node){for(const [key,value]of Object.entries(node)){
  if(typeof value==='string'){let next=value;do{const before=next;next=next.replace(/\.child\('([^']+)'\)\.child\('([^']+)'\)/g,".child('$1/$2')");if(next===before)break;}while(true);node[key]=next;}
  else if(value&&typeof value==='object')compact(value);
 }}compact(r);
 assert(Buffer.byteLength(JSON.stringify(out,null,1)+'\n')<256*1024,'Rule file is too large');
 return out;
}
if(require.main===module){const file=process.argv[2];if(!file)throw Error('Usage: node upgrade-advanced-options-rules.cjs <rules.json>');fs.writeFileSync(file,JSON.stringify(upgradeAdvancedOptions(JSON.parse(fs.readFileSync(file,'utf8'))),null,1)+'\n');}
module.exports={upgradeAdvancedOptions};
