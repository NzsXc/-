// Extend the deterministic validations without changing Standard or ranked rules.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const FIELDS=['mode','hp','initialGauge','maxGauge'];
function equal(a,b){return FIELDS.map(k=>`${a}.child('${k}').val()===${b}.child('${k}').val()`).join('&&');}
function configRule(){
 const n='newData',number=(k,min,max)=>`${n}.child('${k}').isNumber()&&${n}.child('${k}').val()%1===0&&${n}.child('${k}').val()>=${min}&&${n}.child('${k}').val()<=${max}`;
 return {'.validate':`${n}.hasChildren(['mode','hp','initialGauge','maxGauge'])&&${n}.child('mode').val()==='custom'&&${number('hp',1,100)}&&${number('maxGauge',1,100)}&&${number('initialGauge',0,"newData.child('maxGauge').val()")}`,
  ...Object.fromEntries(FIELDS.map(k=>[k,{'.validate':true}])), $other:{'.validate':false}};
}
function upgradeRoomRules(input){
 const output=structuredClone(input),game=output.rules.freeGames.$game,room=output.rules.friendRooms.$room,history=output.rules.battleHistory.$game;
 assert(!game.roomRules,'Apply this upgrade once to the Standard rules');
 const g="root.child('freeGames').child($game)",config=g+".child('roomRules')";
 const limit=(key,fallback)=>`(${config}.exists()?${config}.child('${key}').val():${fallback})`;
 const maxGauge=limit('maxGauge',10),maxHp=limit('hp',10),initialGauge=limit('initialGauge',8);
 for(const p of [1,2]){
  game.state['.validate']=game.state['.validate'].replace(`newData.child('hp${p}').val()===10`,`newData.child('hp${p}').val()===${maxHp}`).replace(`newData.child('gauge${p}').val()===8`,`newData.child('gauge${p}').val()===${initialGauge}`);
  // Heal is the only HP upper clamp; all other (10) clamps are gauge limits.
  const heal=`(newData.child('skill${p}').val()==='tech4'?((10)<(${g}.child('state/hp${p}').val()+1)?(10):(${g}.child('state/hp${p}').val()+1)):${g}.child('state/hp${p}').val())`;
  assert(game.transition['.validate'].includes(heal),'Expected heal clamp '+p);
  game.transition['.validate']=game.transition['.validate'].replace(heal,heal.replaceAll('(10)',`(${maxHp})`));
  const charge=`${g}.child('state/gauge${p}').val()>=10`;
  assert(game.transition['.validate'].includes(charge));
  game.transition['.validate']=game.transition['.validate'].replaceAll(charge,`${g}.child('state/gauge${p}').val()>=${maxGauge}`);
  assert(game.moves.$turn[p]['.validate'].includes(charge));
  game.moves.$turn[p]['.validate']=game.moves.$turn[p]['.validate'].replaceAll(charge,`${g}.child('state/gauge${p}').val()>=${maxGauge}`);
 }
 game.transition['.validate']=game.transition['.validate'].replaceAll('(10)',`(${maxGauge})`);
 const roomConfig="root.child('friendRooms').child(newData.parent().child('room').val()).child('roomRules')",nextConfig="newData.parent().child('roomRules')";
 game.players['.validate']+=`&&(newData.parent().child('kind').val()==='friend'?(${roomConfig}.exists()?(${nextConfig}.exists()&&${equal(nextConfig,roomConfig)}):!${nextConfig}.exists()):!${nextConfig}.exists())`;
 game.roomRules={...configRule(),'.read':'auth!=null',
  '.write':`auth!=null&&!data.exists()&&!${g}.exists()&&newData.parent().child('players/1').val()===auth.uid`};
 game.roomRules['.validate']+=`&&newData.parent().child('kind').val()==='friend'&&newData.parent().child('rulesVersion').val()===2&&${equal('newData',roomConfig)}`;
 room.roomRules=configRule();room.roomRules['.validate']+=`&&(!data.exists()?!data.parent().exists():(${equal('newData','data')}))`;
 room['.validate']+=`&&(!data.child('roomRules').exists()||newData.child('roomRules').exists())`;
 history.roomRules=configRule();history.roomRules['.validate']+=`&&${equal('newData',config)}`;
 history['.validate']+=`&&(newData.child('roomRules').exists()===${config}.exists())`;
 return output;
}
module.exports={upgradeRoomRules};
if(require.main===module){
 const p=path.join(__dirname,'..','firebase-database.rules.json');
 fs.writeFileSync(p,JSON.stringify(upgradeRoomRules(JSON.parse(fs.readFileSync(p,'utf8'))),null,2)+'\n');
}
