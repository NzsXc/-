import {calculate} from './free-calculator.js';

const $=id=>document.getElementById(id),pool=window.BattleAI.techniques;
const basic=window.BattleAI.ACTIONS.slice(0,3),names=['チャージ','アタック','ブロック'];
const rules={mode:'advanced',hp:10,maxGauge:10,skills:false,special:true};
const cards=[$('previewSelf'),$('previewEnemy')];
let selected=0,busy=false;
const initial=()=>({turn:1,startedAt:0,hp1:7,hp2:7,gauge1:10,gauge2:10,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,...SpecialRules.extraState()});
function paintResources(state,special=30){
  cards.forEach((card,i)=>{
    const side=i+1,hp=state['hp'+side],gauge=state['gauge'+side];
    card.querySelector('.hpValue').textContent=hp+' / 10';card.querySelector('.hpBar i').style.width=hp*10+'%';
    card.querySelector('.gaugeValue').textContent=gauge+' / 10';card.querySelector('.gaugeBar i').style.width=gauge*10+'%';
  });
  $('previewSelf').querySelector('.sValue').textContent=special+' / 30';
  $('previewSelf').querySelector('.sBar i').style.width=special/30*100+'%';
}
function action(id){return id<3?{...basic[id],name:names[id]}:SpecialRules.actionData(id,pool,basic);}
function paintEnemy(){
  const enemy=action(Number($('opponentAction').value)),button=$('previewEnemy').querySelector('.action');
  BattleActionArt.paint(button,BattleEffects.kindOf(enemy));button.querySelector('.actionName').textContent=enemy.name;
}
function select(index){
  selected=index;
  const move=action(index+15),definition=SpecialRules.definition(index+15);
  for(const button of $('moveLibrary').children)button.setAttribute('aria-pressed',String(Number(button.dataset.index)===index));
  $('moveTitle').textContent=move.name;$('fireSpecial').querySelector('.actionName').textContent=move.name;
  $('moveCost').textContent='通常 '+move.cost+' / S '+definition.cost;
  $('moveDescription').textContent=pool[index].description+'。S追加効果：'+definition.description;
  BattleActionArt.paint($('fireSpecial'),BattleEffects.kindOf(move));
  paintResources(initial());$('previewStatus').textContent='カードをタップするとS技が発動します。';
}
function setBusy(value){
  busy=value;$('fireSpecial').disabled=value;$('replaySpecial').disabled=value;$('opponentAction').disabled=value;
  for(const button of $('moveLibrary').children)button.disabled=value;
  $('previewSelf').querySelector('.cardFoot').textContent='SPECIAL TECHNIQUE / '+(value?'CASTING':'READY');
}
function fire(){
  if(busy)return;
  const own=action(selected+15),enemy=action(Number($('opponentAction').value)),before=initial();
  const result=calculate(before,{1:selected+15,2:Number($('opponentAction').value)},3,rules);
  const special=SpecialRules.advance({...SpecialRules.initial(3),gauge:{1:30,2:30}},result);
  paintResources(before);setBusy(true);$('moveAnnouncement').textContent=own.name+' / 発動';$('previewStatus').textContent=own.name+'を発動中…';
  const finish=()=>{
    paintResources(result,special.gauge[1]);setBusy(false);$('moveAnnouncement').textContent='';
    $('previewStatus').textContent='相手に'+result.damage2+'ダメージ / 自分に'+result.damage1+'ダメージ。もう一度試せます。';
  };
  try{
    if(!BattleEffects.play({layer:$('previewEffects'),elements:cards,actions:[own,enemy],rawActions:[own,enemy],damage:[result.damage1,result.damage2],sealed:[result.sealed1,result.sealed2],onComplete:finish}))finish();
  }catch(error){BattleEffects.cancel();setBusy(false);$('moveAnnouncement').textContent='';$('previewStatus').textContent='演出を再生できませんでした。もう一度お試しください。';console.error(error);}
}
pool.forEach((move,i)=>{
  const button=document.createElement('button');button.type='button';button.className='moveChoice';button.dataset.index=i;
  button.setAttribute('aria-pressed','false');
  const img=document.createElement('img');img.src='assets/actions/'+BattleEffects.kindOf(move)+'.png';img.alt='';
  const label=document.createElement('span');label.textContent='S'+move.name;
  const cost=document.createElement('small');cost.textContent=SpecialRules.definition(i+15).cost;
  button.append(img,label,cost);button.addEventListener('click',()=>select(i));$('moveLibrary').append(button);
});
for(let id=0;id<27;id++){
  const option=document.createElement('option');option.value=id;option.textContent=action(id).name;$('opponentAction').append(option);
}
$('opponentAction').addEventListener('change',()=>{paintEnemy();paintResources(initial());$('previewStatus').textContent='相手の行動を変更しました。カードからS技を試せます。';});
$('fireSpecial').addEventListener('click',fire);$('replaySpecial').addEventListener('click',fire);
window.addEventListener('pagehide',()=>{BattleEffects.cancel();setBusy(false);$('moveAnnouncement').textContent='';});
select(0);paintEnemy();
