const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {opening}=require('./build-battle-rules.cjs');
function assignment(rule,key,transform){
 const mark=`newData.child('${key}').val()===`,start=rule.indexOf(mark);assert(start>=0,key);
 const from=start+mark.length;let depth=0,quote=null,end=rule.length;
 for(let i=from;i<rule.length;i++){
  const c=rule[i];if(quote){if(c===quote&&rule[i-1]!=='\\')quote=null;continue;}
  if(c==='\''||c==='"'){quote=c;continue;}if(c==='(')depth++;if(c===')')depth--;
  if(depth===0&&rule.slice(i,i+2)==='&&'){end=i;break;}
 }
 return rule.slice(0,from)+transform(rule.slice(from,end))+rule.slice(end);
}
function upgradeAdvanced(input){
 const out=structuredClone(input),game=out.rules.freeGames.$game,history=out.rules.battleHistory.$game;
 assert(!game.advanced,'Apply the Advanced upgrade once');
 const g="root.child('freeGames').child($game)",s=g+".child('state')",adv=`${g}.child('roomRules/mode').val()==='advanced'`;
 const baseOpening=opening(s),opens=`(${baseOpening}+2000)`;
 let timings=0;
 function timing(node){for(const k of Object.keys(node)){
  if(typeof node[k]==='string'){timings+=node[k].split(baseOpening).length-1;node[k]=node[k].replaceAll(baseOpening,`(${baseOpening}+(${adv}?2000:0))`);}
  else if(node[k]&&typeof node[k]==='object')timing(node[k]);
 }}timing(game);assert(timings>10);
 game.state['.validate']=game.state['.validate'].replaceAll(opening('data'),`(${opening('data')}+(${adv}?2000:0))`);
 const selected=p=>`${g}.child('advanced/selected/${p}').val()`,current=p=>`${g}.child('advanced/current/${p}')`;
 const active=(p,id)=>`(${current(p)}.child('turn').val()===${s}.child('turn').val()&&${current(p)}.child('id').val()==='${id}')`;
 const state=(p,k)=>`${g}.child('state/${k}${p}').val()`;
 const cap=(value,max)=>`((${value})>${max}?${max}:(${value}))`;
 function effective(rule){for(const p of [1,2]){
  const gauge=state(p,'gauge'),hp=state(p,'hp');
  const replacements={gauge:`(${active(p,'boost')}?${cap(gauge+'+2',10)}:${active(p,'cleanse')}?${cap(gauge+'+4',10)}:${gauge})`,hp:`(${active(p,'heal')}?${cap(hp+'+1',10)}:${hp})`,seal:`(${active(p,'cleanse')}?false:${state(p,'seal')})`,ruin:`(${active(p,'cleanse')}?0:${state(p,'ruin')})`,last:`(${active(p,'chain')}?'':${state(p,'last')})`};
  for(const [key,value]of Object.entries(replacements))rule=rule.replaceAll(state(p,key),value);
 }return rule;}
 let advancedTransition=effective(game.transition['.validate']);
 for(const p of [1,2])advancedTransition=assignment(advancedTransition,'damage'+p,expr=>`(${active(p,'invincible')}?(newData.child('skill${p}').val()==='tech7'?2:0):(${expr}))`);
 const compact=value=>value.replaceAll(g,"root.child('freeGames/'+$game)");
 game.transition['.validate']=`(${adv}?(${compact(advancedTransition)}):(${game.transition['.validate']}))`;
 for(const p of [1,2]){
  game.moves.$turn[p]['.validate']=`(${adv}?(${compact(effective(game.moves.$turn[p]['.validate']))}):(${game.moves.$turn[p]['.validate']}))`;
  game.ready[p]['.validate']+=`&&(!(${adv})||newData.parent().parent().child('advanced/selected/${p}').isString())`;
 }
 const custom="newData.child('mode').val()==='custom'",advanced="(newData.child('mode').val()==='advanced'&&newData.child('hp').val()===10&&newData.child('initialGauge').val()===8&&newData.child('maxGauge').val()===10)";
 for(const config of [game.roomRules,out.rules.friendRooms.$room.roomRules,history.roomRules]){assert(config['.validate'].includes(custom));config['.validate']=config['.validate'].replace(custom,`(${custom}||${advanced})`);}
 const participant=p=>`auth!=null&&auth.uid===${g}.child('players/${p}').val()`;
 const alive=`${s}.exists()&&${s}.child('hp1').val()>0&&${s}.child('hp2').val()>0&&${s}.child('turn').val()<=300&&!${g}.child('settled').exists()&&!${g}.child('resigned').exists()`;
 const within=`now>=${opens}-2000&&now<${opens}`;
 const capacity=p=>`(${selected(p)}==='chain'?5:${selected(p)}==='boost'?3:${selected(p)}==='cleanse'?1:(${selected(p)}==='heal'||${selected(p)}==='invincible')?2:0)`;
 const same=(a,b,fields)=>fields.map(k=>`${a}.child('${k}').val()===${b}.child('${k}').val()`).join('&&');
 const fields=keys=>Object.fromEntries(keys.map(k=>[k,{'.validate':true}]));
 game.advanced={'.read':`auth!=null&&(${adv})&&${g}.child('ready/1').val()===true&&${g}.child('ready/2').val()===true`,
  protocol:{'.read':'auth!=null','.validate':false},selected:{$other:{'.validate':false}},current:{'.read':`auth!=null&&(${adv})`,$other:{'.validate':false}},uses:{'.read':`auth!=null&&(${adv})`,$other:{'.validate':false}},$other:{'.validate':false}};
 for(const p of [1,2]){
  const next="newData.parent().parent().child('uses').child('"+p+"').child(''+newData.child('used').val())";
  const beforeUsed=`(${current(p)}.exists()?${current(p)}.child('used').val():0)`,previousTurn=`(!data.exists()||data.child('turn').val()<${s}.child('turn').val())`;
  game.advanced.selected[p]={'.read':`${participant(p)}||(${game.advanced['.read']})`,
   '.write':`${participant(p)}&&(${adv})&&!data.exists()&&newData.exists()&&!${s}.exists()&&!${g}.child('settled').exists()&&now<${g}.child('createdAt').val()+90000&&newData.parent().parent().parent().child('ready/${p}').val()===true`,
   '.validate':"newData.isString()&&(newData.val()==='boost'||newData.val()==='heal'||newData.val()==='chain'||newData.val()==='cleanse'||newData.val()==='invincible')"};
  game.advanced.current[p]={'.write':`${participant(p)}&&(${adv})&&${alive}&&${within}&&${previousTurn}&&newData.exists()`,
   '.validate':`newData.hasChildren(['id','turn','at','used'])&&newData.child('id').val()===${selected(p)}&&newData.child('turn').val()===${s}.child('turn').val()&&newData.child('at').val()===now&&newData.child('used').isNumber()&&newData.child('used').val()===${beforeUsed}+1&&newData.child('used').val()<=${capacity(p)}&&${same('newData',next,['id','turn','at'])}`,
   ...fields(['id','turn','at','used']),$other:{'.validate':false}};
  game.advanced.uses[p]={};
  const nextCurrent=`newData.parent().parent().parent().child('current/${p}')`;
  game.advanced.uses[p].$slot={'.write':`${participant(p)}&&(${adv})&&${alive}&&${within}&&!data.exists()&&newData.exists()&&$slot===''+(${beforeUsed}+1)&&${beforeUsed}+1<=${capacity(p)}&&(!${current(p)}.exists()||${current(p)}.child('turn').val()<${s}.child('turn').val())`,
   '.validate':`newData.hasChildren(['id','turn','at','used'])&&newData.child('id').val()===${selected(p)}&&newData.child('turn').val()===${s}.child('turn').val()&&newData.child('at').val()===now&&newData.child('used').val()===${beforeUsed}+1&&${same('newData',nextCurrent,['id','turn','at','used'])}`,
   ...fields(['id','turn','at','used']),$other:{'.validate':false}};
 }
 const live=g+".child('advanced')";
 history['.validate']+=`&&(newData.child('advanced').exists()===${live}.exists())`;
 history.advanced={'.validate':`(${adv})&&${['selected','current','uses'].map(k=>`newData.child('${k}').exists()===${live}.child('${k}').exists()`).join('&&')}`,selected:{$other:{'.validate':false}},current:{$other:{'.validate':false}},uses:{$other:{'.validate':false}},$other:{'.validate':false}};
 for(const p of [1,2]){
  for(const k of ['selected','current','uses'])history.advanced['.validate']+=`&&newData.child('${k}/${p}').exists()===${live}.child('${k}/${p}').exists()`;
  history.advanced.selected[p]={'.validate':`newData.val()===${live}.child('selected/${p}').val()`};
  history.advanced.current[p]={'.validate':`newData.hasChildren(['id','turn','at','used'])&&${same('newData',`${live}.child('current/${p}')`,['id','turn','at','used'])}`,...fields(['id','turn','at','used']),$other:{'.validate':false}};
  history.advanced.uses[p]={'.validate':Array.from({length:5},(_,i)=>`newData.child('${i+1}').exists()===${live}.child('uses/${p}/${i+1}').exists()`).join('&&')};
  history.advanced.uses[p].$slot={'.validate':`newData.hasChildren(['id','turn','at','used'])&&newData.child('used').isNumber()&&newData.child('used').val()>=1&&newData.child('used').val()<=5&&$slot===''+newData.child('used').val()&&${same('newData',`${live}.child('uses/${p}').child($slot)`,['id','turn','at','used'])}`,...fields(['id','turn','at','used']),$other:{'.validate':false}};
 }
 function compactTree(node){for(const key of Object.keys(node)){if(typeof node[key]==='string')node[key]=compact(node[key]);else if(node[key]&&typeof node[key]==='object')compactTree(node[key]);}}
 compactTree(game.advanced);compactTree(history.advanced);
 return out;
}
module.exports={upgradeAdvanced};
if(require.main===module){const p=path.join(__dirname,'..','firebase-database.rules.json');fs.writeFileSync(p,JSON.stringify(upgradeAdvanced(JSON.parse(fs.readFileSync(p,'utf8'))),null,2)+'\n');}
