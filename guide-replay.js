/* Runs only inside the guide's disposable frame. It never loads authentication or transport. */
(()=>{
 'use strict';
 const hostOrigin=new URL(document.baseURI).origin;
 const $=id=>document.getElementById(id),board=$('battleScreen'),areas=[1,2].map(p=>$('player'+p+'Area'));
 let input=null,plan=null,epoch=0,shown=null,specialShown=null,skillUse=null;
 const status=(text,busy=false)=>parent.postMessage({type:'guide-replay-status',text,busy},hostOrigin);
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const snapshot=s=>({hp:{1:s.hp1,2:s.hp2},gauge:{1:s.gauge1,2:s.gauge2}});
 const layer=document.createElement('div');layer.id='battleEffectLayer';board.append(layer);
 for(const p of [1,2]){
  $('player'+p+'Area').querySelector('.playerNameText').textContent='CP '+p;
  const s=document.createElement('div');s.className='guideReplaySpecial';s.id='guideReplaySpecial'+p;$('player'+p+'Area').append(s);
  const skill=document.createElement('div');skill.className='guideReplaySkill';skill.id='guideReplaySkill'+p;$('player'+p+'Area').append(skill);
 }
 function paint(state=shown,special=specialShown){
  shown=state;specialShown=special;
  const current=BattleResources.current();
  for(const p of [1,2]){
   const hp=current?.hp[p]??state['hp'+p],gauge=current?.gauge[p]??state['gauge'+p];
   $('hp'+p+'Text').textContent=hp+'/12';$('hp'+p+'Fill').style.width=hp/12*100+'%';$('gauge'+p+'Text').textContent=gauge+'/10';$('gauge'+p+'Fill').style.width=gauge*10+'%';
   $('guideReplaySpecial'+p).textContent=input.item.special?'Sゲージ '+(current?.special?.[p]??special.gauge[p])+'/30':'';
   const tags=[];for(const [key,label]of [['frozen','凍結'],['poison','毒'],['enhance','攻撃力＋1'],['specialSeal','S封印'],['ruin','ルイン'],['weaken','攻撃力−1']])if(state[key+p]>0)tags.push(label+' '+state[key+p]+'T');if(state['seal'+p])tags.push('封印');
   $('player'+p+'Statuses').textContent=tags.join(' / ');
  }
 }
 window.updateBattleUI=()=>paint();
 window.AdvancedSkills={usedForTurn:()=>skillUse?[{...AdvancedRules.byId[skillUse],player:1}]:[]};
 function buttons(turn){
  for(const p of [1,2]){
   const chosen=turn.actions[p-1],ids=[0,1,2];
   for(const action of [chosen,...input.catalog.filter(a=>a?.skill)])if(action&&action.actionId>=3&&!ids.includes(action.actionId)&&ids.length<6)ids.push(action.actionId);
   $('actions'+p).replaceChildren(...ids.map(id=>{
    const a=input.catalog[id],b=document.createElement('button');b.type='button';b.className='action'+(a.special?' specialTechniqueAction':'');b.dataset.action=id;b.setAttribute('aria-disabled','true');
    const name=document.createElement('div');name.className='actionName';name.textContent=a.name;b.append(name);BattleActionArt.paint(b,BattleEffects.kindOf(a));
    b.classList.toggle('guideReplayChosen',id===turn.moves[p]);return b;
   }));
   $('guideReplaySkill'+p).textContent=p===1&&turn.skill?'スキル：'+AdvancedRules.byId[turn.skill].name:'';
  }
  $('countdown').textContent='T'+turn.before.turn;
  $('resultMessage').textContent=turn.actions.map(a=>a.name).join(' / ');
 }
 function cancel(){epoch++;AdvancedCutin.reset();BattleEffects.cancel();BattleResources.cancel();}
 function prepare(){
  cancel();plan=GuideReplayCore.build(input.item,input.catalog,input.scene);const first=plan.turns[0];if(!first)throw Error('実演場面がありません');buttons(first);paint(first.before,first.specialBefore);
 }
 async function cutin(turn,token){
  skillUse=turn.skill;
  const advanced={current:{1:{id:turn.skill,turn:turn.before.turn,used:1}},selected:{1:turn.skill}};
  const start=performance.now(),match={id:'guide-'+token,you:1,players:{1:{name:'CP 1'},2:{name:'CP 2'}},advanced,roomRules:turn.rules,state:{...snapshot(turn.before),turn:turn.before.turn},skillResult:snapshot(turn.preview),skillWindow:{confirmAt:start},serverNow:start};
  while(epoch===token&&performance.now()-start<AdvancedRules.CUTIN_MS+AdvancedRules.EFFECT_MS){AdvancedCutin.sync(match,performance.now());await wait(30);}
  if(epoch!==token)return;AdvancedCutin.reset();BattleResources.cancel();paint(turn.preview,turn.specialBefore);
 }
 async function play(){
  prepare();const token=epoch;status('実演を再生しています…',true);
  for(const turn of plan.turns){
   if(epoch!==token)return;buttons(turn);paint(turn.before,turn.specialBefore);await wait(450);if(epoch!==token)return;
   if(turn.skill){await cutin(turn,token);if(epoch!==token)return;}
   const actions=turn.actions,damage=[turn.after.damage1,turn.after.damage2],options={actions,rawActions:actions,damage,foresightShield:true,sealed:[turn.after.sealed1,turn.after.sealed2],momentum:[turn.before.momentum1,turn.before.momentum2]};
   const effect=BattleEffects.createPlan(actions,options),view=BattleResources.begin({before:{...snapshot(turn.preview),special:turn.specialBefore.gauge},after:{...snapshot(turn.after),special:turn.specialAfter.gauge},outcome:turn.after,actions:effect.players.map(p=>p.action),rawActions:actions,damage,impacts:effect.events,maxGauge:10});
   await new Promise(resolve=>{
    const finish=()=>{view.finish();if(epoch===token)paint(turn.after,turn.specialAfter);resolve();};
    if(!BattleEffects.play({...options,layer,elements:areas,onFrame:ms=>{if(epoch===token){view.tick(ms);paint(turn.preview,turn.specialBefore);}},onComplete:finish,onCancel:()=>{view.cancel();resolve();}}))finish();
   });
   if(epoch!==token)return;await wait(700);
  }
  if(epoch!==token)return;
  const first=plan.initial,last=plan.final;
  status([1,2].map(p=>'CP'+p+' HP '+first['hp'+p]+'→'+last['hp'+p]+' / ゲージ '+first['gauge'+p]+'→'+last['gauge'+p]).join(' ｜ '));
 }
 window.addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==hostOrigin||event.data?.type!=='guide-replay-command')return;
  input=event.data;
  try{if(input.command==='play')play().catch(error=>{cancel();status('実演を再生できませんでした。');console.error(error);});else prepare();}
  catch(error){cancel();status('実演を準備できませんでした。');console.error(error);}
 });
 window.addEventListener('pagehide',cancel);
 parent.postMessage({type:'guide-replay-ready'},hostOrigin);
})();
