// Upgrade the HP10 / S Breach cost rules, preserving saved version 2 battles.
const fs=require('node:fs'),assert=require('node:assert/strict');
function upgradeSpecialBalance(input){
 const doc=structuredClone(input),r=doc.rules,g=r.freeGames.$game,room=r.friendRooms.$room.roomRules;
 assert(!g.advanced.specialMovesV2,'Apply once');
 const old="newData.child('hp').val()===(newData.child('special').val()===true?12:10)||(data.exists()&&newData.child('special').val()===true&&(newData.child('hp').val()===10||newData.child('hp').val()===15))";
 const next="newData.child('hp').val()===10||(data.exists()&&newData.child('special').val()===true&&(newData.child('hp').val()===12||newData.child('hp').val()===15))";
 assert(room['.validate'].includes(old));room['.validate']=room['.validate'].replace(old,next);
 for(const key of ['specialHp10','specialMovesV2'])g.advanced[key]={'.read':'auth!=null','.validate':false};
 for(const p of [1,2]){
  const node=g.moves.$turn[p],cost="(root.child('freeGames/'+$game+'/special/version').val()===3?12:8)";
  assert(node['.validate'].includes('newData.val()===15?8:'));node['.validate']=node['.validate'].replaceAll('newData.val()===15?8:','newData.val()===15?'+cost+':');
  const oldCost=`newData.child('action${p}').val()===15?8:`;assert(g.transition['.validate'].includes(oldCost));g.transition['.validate']=g.transition['.validate'].replaceAll(oldCost,oldCost.replace('?8:','?'+cost+':'));
 }
 for(const node of [g.special,r.battleHistory.$game.special])node.version['.validate']=node.version['.validate'].replace('newData.val()===2','(newData.val()===2||newData.val()===3)');
 g.special['.write']=g.special['.write'].replace("data.child('version').val()===2","(data.child('version').val()===2||data.child('version').val()===3)");
 g.special['.validate']=g.special['.validate'].replace("newData.child('version').val()!==2","newData.child('version').val()<2");
 g.rulesVersion['.validate']=g.rulesVersion['.validate'].replace("newData.parent().child('special/version').val()===2","(newData.parent().child('special/version').val()===2||newData.parent().child('special/version').val()===3)");
 assert(Buffer.byteLength(JSON.stringify(doc)+'\n')<256*1024);return doc;
}
if(require.main===module){const file=process.argv[2]||'firebase-database.rules.json';fs.writeFileSync(file,JSON.stringify(upgradeSpecialBalance(JSON.parse(fs.readFileSync(file,'utf8'))))+'\n');}
module.exports={upgradeSpecialBalance};
