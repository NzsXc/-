const fs=require('node:fs'),assert=require('node:assert/strict');
function upgradeSpecialGauge(input){
 const out=structuredClone(input),g=out.rules.freeGames.$game,h=out.rules.battleHistory.$game;
 assert(!g.advanced.specialGaugeV1,'Apply the special gauge upgrade once');
 const game="root.child('freeGames/'+$game)",parent='newData.parent()';
 g.advanced.specialGaugeV1={'.read':'auth!=null','.validate':false};
 g.special.version={'.validate':'newData.val()===1'};
 h.special.version={'.validate':`newData.val()===1&&newData.val()===${game}.child('special/version').val()`};
 for(const p of [1,2]){
  const valid='newData.isNumber()&&newData.val()>=0&&newData.val()<=30&&newData.val()%1===0';
  g.special.gauge[p]['.validate']=valid;
  h.special.gauge[p]['.validate']=valid;
 }
 g.special['.validate']+=`&&(!data.exists()?newData.child('gauge/1').val()===0&&newData.child('gauge/2').val()===0:newData.child('version').val()===data.child('version').val())`;
 g.special['.write']=`(${g.special['.write']})||(auth!=null&&data.child('version').val()===1&&(${game}.child('players/1').val()===auth.uid||${game}.child('players/2').val()===auth.uid)&&!${game}.child('settled').exists()&&!${game}.child('resigned').exists()&&${parent}.child('state/turn').val()===${game}.child('state/turn').val()+1)`;
 // Validate alongside state to require atomic gauge changes even if a client omits special.
 const amounts=[1,2].map(p=>{
  const sum=`(${game}.child('special/gauge/${p}').val()+1+${parent}.child('transition/damage${p}').val()+(${parent}.child('transition/type${p}').val()==='charge'?1:0))`;
  return `${parent}.child('special/gauge/${p}').val()===(${sum}>30?30:${sum})`;
 }).join('&&');
 g.state['.validate']+=`&&(!data.exists()||${game}.child('special/version').val()!==1||(${amounts}))`;
 h.special['.validate']+=`&&newData.child('version').val()===${game}.child('special/version').val()`;
 assert(Buffer.byteLength(JSON.stringify(out,null,1)+'\n')<256*1024,'Rule file is too large');
 return out;
}
if(require.main===module){const file=process.argv[2];fs.writeFileSync(file,JSON.stringify(upgradeSpecialGauge(JSON.parse(fs.readFileSync(file,'utf8'))),null,1)+'\n');}
module.exports={upgradeSpecialGauge};
