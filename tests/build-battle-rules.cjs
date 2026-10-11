// Mechanical, narrowly scoped upgrade of the published rules supplied by the user.
// Printing a patch keeps generated artifacts under the normal apply_patch workflow.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function opening(node){
 const start=node+".child('startedAt').val()",prior=node+".child('previousDeadline').val()";
 const capped=`(${start}+3000<${prior}?${start}+3000:${prior})`;
 return `(${node}.child('previousDeadline').exists()?((${start}>${capped}?${start}:${capped})+3100):(${start}+(${node}.child('turn').val()>1?7500:5600)))`;
}
function upgrade(input){
 const output=structuredClone(input),game=output.rules.freeGames.$game;
 const gameNode="root.child('freeGames').child($game)",stateNode=gameNode+".child('state')";
 const old=gameNode+".child('state/startedAt').val()+("+gameNode+".child('state/turn').val()>1?7500:5600)";
 let replaced=0;
 function timing(value){
  for(const key of Object.keys(value)){
   if(typeof value[key]==='string'){replaced+=value[key].split(old).length-1;value[key]=value[key].replaceAll(old,opening(stateNode));}
   else if(value[key]&&typeof value[key]==='object')timing(value[key]);
  }
 }
 timing(output.rules);assert(replaced>10,'Expected the published 7500 ms clauses');
 const claim=gameNode+".child('advance').child(''+"+stateNode+".child('turn').val())";
 const owner=`(!${claim}.exists()||(${claim}.child('owner').val()===auth.uid&&${claim}.child('at').val()>now-15000))`;
 game.state['.write']=`(${game.state['.write']})&&(!data.exists()||${owner})`;
 game.transition['.write']=`(${game.transition['.write']})&&${owner}`;
 game.state['.validate']=`(${game.state['.validate']})&&(!newData.child('previousDeadline').exists()||(data.exists()&&newData.child('previousDeadline').isNumber()&&newData.child('previousDeadline').val()===${opening('data')}+10000))`;
 game.state.previousDeadline={'.validate':true};
 const participant=`auth!=null&&(auth.uid===${gameNode}.child('players/1').val()||auth.uid===${gameNode}.child('players/2').val())`;
 game.advance={
  '.read':participant,
  '$turn':{
   '.write':`${participant}&&newData.exists()&&$turn===''+${stateNode}.child('turn').val()&&!${gameNode}.child('settled').exists()&&!${gameNode}.child('resigned').exists()&&${stateNode}.child('hp1').val()>0&&${stateNode}.child('hp2').val()>0&&${stateNode}.child('turn').val()<=300&&${gameNode}.child('moves').child($turn).child('1').exists()&&${gameNode}.child('moves').child($turn).child('2').exists()&&(!data.exists()||data.child('at').val()<now-15000)`,
   '.validate':"newData.hasChildren(['owner','at'])&&newData.child('owner').val()===auth.uid&&newData.child('at').val()===now",
   owner:{'.validate':true},at:{'.validate':true},'$other':{'.validate':false}
  }
 };
 // History copies state verbatim. Keep the optional timing field verifiable,
 // without changing the battle calculator or replay result.
 output.rules.battleHistory.$game.finalState.previousDeadline={'.validate':"newData.isNumber()&&newData.val()===root.child('freeGames').child($game).child('state/previousDeadline').val()"};
 const slot=output.rules.titleLoadouts.$uid.$slot;
 const prestige=Array.from({length:12},(_,i)=>`(newData.val()==='skill_prestige_${i+1}'&&root.child('titleProgress').child($uid).child('uses/${i+1}/count').val()>=50)`).join('||');
 assert(slot['.validate'].endsWith('))'));
 slot['.validate']=slot['.validate'].slice(0,-1)+'||'+prestige+')';
 return require('./upgrade-punish-rules.cjs').upgradePunish(output);
}
module.exports={upgrade,opening};
if(require.main===module){
 const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const content=JSON.stringify(upgrade(input),null,2)+'\n';
 const target=path.join(__dirname,'..','firebase-database.rules.json').replaceAll('\\','/');
 console.log(JSON.stringify({patch:'*** Begin Patch\n*** Add File: '+target+'\n'+content.split('\n').slice(0,-1).map(line=>'+'+line).join('\n')+'\n*** End Patch'}));
}
