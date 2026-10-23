import {calculate} from './free-calculator.js';

const $=id=>document.getElementById(id),catalog=BattlePreviewCatalog,techniques=catalog.techniques;
const cards=[$('previewSelf'),$('previewEnemy')],rules={mode:'advanced',hp:10,maxGauge:10,skills:false,special:true};
let selected=0,basicId=null,specialView=true,busy=false;
const currentId=()=>basicId??techniques[selected][specialView?'specialId':'normalId'];
const current=()=>catalog.action(currentId());
function initial(){
 const state={turn:1,startedAt:0,hp1:7,hp2:7,gauge1:10,gauge2:10,seal1:false,seal2:false,enhance1:0,enhance2:0,momentum1:false,momentum2:false,ruin1:0,ruin2:0,last1:'',last2:'',misses1:0,misses2:0,...SpecialRules.extraState()};
 [current(),catalog.action(Number($('opponentAction').value))].forEach((a,i)=>{if(['focus','convert'].includes(a?.kind)||a?.type==='charge')state['gauge'+(i+1)]=2;});return state;
}
function paintResources(state,special=30){
 cards.forEach((card,i)=>{
  const side=i+1,hp=state['hp'+side],gauge=state['gauge'+side];
  card.querySelector('.hpValue').textContent=hp+' / 10';card.querySelector('.hpBar i').style.width=hp*10+'%';
  card.querySelector('.gaugeValue').textContent=gauge+' / 10';card.querySelector('.gaugeBar i').style.width=gauge*10+'%';
  card.querySelector('.previewCardStatus').textContent=state['frozen'+side]?'次のターン：凍結':state['poison'+side]?'毒 '+state['poison'+side]+'T':'';
 });
 $('previewSelf').querySelector('.sValue').textContent=special+' / 30';$('previewSelf').querySelector('.sBar i').style.width=special/30*100+'%';
}
function paintEnemy(){
 const enemy=catalog.action(Number($('opponentAction').value)),button=$('previewEnemy').querySelector('.action');
 BattleActionArt.paint(button,BattleEffects.kindOf(enemy));button.querySelector('.actionName').textContent=enemy.name;button.classList.toggle('specialTechniqueAction',!!enemy.special);
}
function paintSelection(){
 const move=current(),isSpecial=!!move.special;
 for(const button of $('moveLibrary').children){const i=Number(button.dataset.index),a=techniques[i];button.setAttribute('aria-pressed',String(basicId===null&&i===selected));button.querySelector('.moveChoiceName').textContent=(specialView?'S':'')+a.name;button.querySelector('small').textContent=specialView?(i<12?SpecialRules.definition(i+15).cost:'S'):a.cost;}
 for(const button of $('previewBasics').children)button.setAttribute('aria-pressed',String(Number(button.dataset.action)===basicId));
 $('normalMode').setAttribute('aria-pressed',String(!specialView));$('specialMode').setAttribute('aria-pressed',String(specialView));
 $('moveTitle').textContent=move.name;$('fireSpecial').querySelector('.actionName').textContent=move.name;
 $('selectedVariant').textContent=isSpecial?'SELECTED SPECIAL':'SELECTED NORMAL';
 $('moveCost').textContent='通常 '+move.cost+(isSpecial?(move.visualOnly?' / S 未設定':' / S '+move.specialCost):'');
 const base=basicId===null?techniques[selected]:move;
 $('moveDescription').textContent=base.description+(isSpecial?(move.visualOnly?'。S版は演出プレビュー（追加効果・S消費は未設定）':'。S追加効果：'+SpecialRules.definition(currentId()).description):'');
 $('fireSpecial').classList.toggle('specialTechniqueAction',isSpecial);$('previewSelf').dataset.variant=isSpecial?'special':'normal';
 $('previewSelf').querySelector('.sTag').textContent=isSpecial?'SPECIAL':'NORMAL';
 $('replaySpecial').firstChild.textContent=isSpecial?'S技を発動 ':'通常技を発動 ';
 $('previewSelf').querySelector('.cardFoot').textContent=(isSpecial?'SPECIAL':'NORMAL')+' TECHNIQUE / READY';
 BattleActionArt.paint($('fireSpecial'),BattleEffects.kindOf(move));paintResources(initial());$('previewStatus').textContent='カードをタップすると'+(isSpecial?'S技':'通常技')+'が発動します。';
}
function select(index){selected=index;basicId=null;paintSelection();}
function setBusy(value){
 busy=value;for(const id of ['fireSpecial','replaySpecial','opponentAction','normalMode','specialMode','playbackRate'])$(id).disabled=value;
 for(const button of [...$('moveLibrary').children,...$('previewBasics').children])button.disabled=value;
 $('previewSelf').querySelector('.cardFoot').textContent=(current().special?'SPECIAL':'NORMAL')+' TECHNIQUE / '+(value?'CASTING':'READY');
}
function fire(){
 if(busy)return;
 const own=current(),enemy=catalog.action(Number($('opponentAction').value)),before=initial();
 const result=catalog.resolve(calculate,before,{1:currentId(),2:Number($('opponentAction').value)},rules);
 const special=SpecialRules.advance({...SpecialRules.initial(3),gauge:{1:30,2:30}},result);
 paintResources(before);setBusy(true);$('moveAnnouncement').textContent=own.name+' / 発動';$('previewStatus').textContent=own.name+'を発動中…';
 const finish=()=>{paintResources(result,special.gauge[1]);setBusy(false);$('moveAnnouncement').textContent='';$('previewStatus').textContent='相手に'+result.damage2+'ダメージ / 自分に'+result.damage1+'ダメージ。もう一度試せます。';};
 try{if(!BattleEffects.play({layer:$('previewEffects'),elements:cards,actions:[own,enemy],rawActions:[own,enemy],damage:[result.damage1,result.damage2],sealed:[result.sealed1,result.sealed2],playbackRate:Number($('playbackRate').value),onComplete:finish}))finish();}
 catch(error){BattleEffects.cancel();setBusy(false);$('moveAnnouncement').textContent='';$('previewStatus').textContent='演出を再生できませんでした。もう一度お試しください。';console.error(error);}
}
techniques.forEach((move,i)=>{
 const button=document.createElement('button');button.type='button';button.className='moveChoice';button.dataset.index=i;button.setAttribute('aria-pressed','false');
 const img=document.createElement('img');img.src=BattleActionArt.imageSource(BattleEffects.kindOf(move));img.alt='';
 const label=document.createElement('span');label.className='moveChoiceName';const cost=document.createElement('small');
 button.append(img,label,cost);button.addEventListener('click',()=>select(i));$('moveLibrary').append(button);
});
catalog.actions.forEach((move,id)=>{const option=document.createElement('option');option.value=id;option.textContent=move.name;$('opponentAction').append(option);});
for(let id=0;id<3;id++){const button=document.createElement('button');button.type='button';button.textContent=catalog.action(id).name;button.dataset.action=id;button.addEventListener('click',()=>{basicId=id;specialView=false;paintSelection();});$('previewBasics').append(button);}
for(const [id,value]of [['normalMode',false],['specialMode',true]])$(id).addEventListener('click',()=>{specialView=value;if(value)basicId=null;paintSelection();});
$('opponentAction').addEventListener('change',()=>{paintEnemy();paintResources(initial());$('previewStatus').textContent='相手の行動を変更しました。カードから技を試せます。';});
$('fireSpecial').addEventListener('click',fire);$('replaySpecial').addEventListener('click',fire);
window.addEventListener('pagehide',()=>{BattleEffects.cancel();setBusy(false);$('moveAnnouncement').textContent='';});
select(0);paintEnemy();
