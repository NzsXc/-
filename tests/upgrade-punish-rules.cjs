const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function upgradePunish(input){
 const result=structuredClone(input),game=result.rules.freeGames.$game;
 const version="root.child('freeGames').child($game).child('rulesVersion').val()===2";
 let rule=game.transition['.validate'];
 for(const [self,enemy]of [[1,2],[2,1]]){
  const damage=`newData.child('skill${enemy}').val()==='tech3'&&newData.child('type${self}').val()==='charge'&&!(newData.child('blocking${self}').val()===true)&&!(newData.child('reflect${self}').val()===true)?2:0`;
  assert.equal(rule.split(damage).length-1,1);rule=rule.replace(damage,damage.replace('?2:0',`?(${version}?1:2):0`));
  const beginning=`newData.child('gauge${self}').val()===`,start=rule.indexOf(beginning),end=rule.indexOf(`&&newData.child('hp${self}')`,start);
  assert(start>=0&&end>start);
  const original=rule.slice(start+beginning.length,end);
  const drained=`(${original}-(${version}&&newData.child('skill${enemy}').val()==='tech3'?1:0))`;
  rule=rule.slice(0,start+beginning.length)+`(${drained}<0?0:${drained})`+rule.slice(end);
 }
 game.transition['.validate']=rule;
 game.rulesVersion={
  '.read':'auth!=null',
  '.write':"auth!=null&&!data.exists()&&!root.child('freeGames').child($game).exists()&&newData.parent().child('players/1').val()===auth.uid",
  '.validate':"newData.val()===2&&newData.parent().child('createdAt').val()===now"
 };
 result.rules.battleHistory.$game.rulesVersion={'.validate':"newData.val()===2&&newData.val()===root.child('freeGames').child($game).child('rulesVersion').val()"};
 // A new game's history must retain its immutable rule version.
 result.rules.battleHistory.$game['.validate']+=`&&(!(${version})||newData.child('rulesVersion').val()===2)`;
 return result;
}
module.exports={upgradePunish};
if(require.main===module){
 const target=path.join(__dirname,'..','firebase-database.rules.json'),before=fs.readFileSync(target,'utf8');
 const after=JSON.stringify(upgradePunish(JSON.parse(before)),null,2)+'\n';
 console.log(JSON.stringify({patch:'*** Begin Patch\n*** Update File: '+target.replaceAll('\\','/')+'\n@@\n'+before.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+after.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch'}));
}
