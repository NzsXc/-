let titleViewData=null,titleDraft=['','',''],titleSlot=0,titleViewEpoch=0,titleSaving=false,titleWallet=null,titleFrames=null,titleCardStyles=null;
const originalPlayerIntroStart=window.PlayerIntro.start;
window.PlayerIntro.start=function(options){originalPlayerIntroStart(options);const layer=document.getElementById('playerIntroLayer');if(layer){[1,2].forEach(p=>{const card=layer.querySelector('.intro-p'+p);if(card)TitleCatalog.fillCard(card,options.players?.[p]?.titles);});window.dispatchEvent(new Event('resize'));}};
async function openTitles(){
 const epoch=++titleViewEpoch;showScreen('titlesScreen');titleViewData=null;titleWallet=null;titleFrames=null;titleCardStyles=null;document.getElementById('titleCollection').hidden=true;document.getElementById('nameColorPanel').hidden=true;renderTitles();
 const status=document.getElementById('titlesStatus');if(!window.titleService?.uid()){status.textContent='称号と名前色の保存にはログインが必要です。';return;}status.textContent='プレイヤーデータを読み込んでいます…';
 try{const [data,wallet,name,frames,cardStyles]=await Promise.all([window.titleService.readOwn(),window.economyService.readOwn().catch(()=>null),window.economyService.playerName(),window.battleFrameService.readOwn().catch(error=>({frame:'',warnings:['フレーム情報を取得できません：'+error.message]})),window.economyService.readOwnCardStyles().catch(()=>({error:true}))]);if(epoch!==titleViewEpoch)return;titleViewData=data;titleWallet=wallet;titleFrames={...frames,uses:data.uses};titleCardStyles=cardStyles;titleDraft=[0,1,2].map(i=>TitleCatalog.byId[data.loadout?.[i]]?data.loadout[i]:'');document.getElementById('titlePlayerName').textContent=name;renderTitles();const warnings=[...(data.warnings||[]),...(frames.warnings||[])];status.textContent=warnings.length?warnings.join(' / '):'プレイヤー名・称号をタップして変更できます。';}
 catch(e){if(epoch===titleViewEpoch)status.textContent='読み込めません：'+e.message;}
}
function closeTitles(){if(titleSaving)return;titleViewEpoch++;showScreen('modeScreen');}
function renderTitles(){
 const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text!=null)e.textContent=text;return e;},slots=$('titleSlots');slots.replaceChildren();
 const name=$('titlePlayerName');if(!name.textContent)name.textContent='プレイヤー';name.disabled=!titleViewData||titleSaving;window.NameStyles?.apply(name,titleWallet?{color:titleWallet.color,gloss:titleWallet.gloss}:{});
 name.onclick=()=>{$('nameColorPanel').hidden=false;$('titleCollection').hidden=true;};
 for(let i=0;i<3;i++){const button=node('button','title-slot'+(i===titleSlot?' selected':''));button.disabled=!titleViewData||titleSaving;button.setAttribute('aria-pressed',String(i===titleSlot));button.setAttribute('aria-label','称号'+(i+1)+'を変更');button.append(node('span','','称号 '+(i+1)),TitleCatalog.badge(titleViewData?titleDraft[i]:''));button.onclick=()=>{titleSlot=i;$('titleCollection').hidden=false;$('nameColorPanel').hidden=true;renderTitles();};slots.append(button);}
 $('titleSave').disabled=!titleViewData||titleSaving;$('titleClear').disabled=!titleViewData||titleSaving;$('titleBack').disabled=titleSaving;
 $('coinBalance').textContent=titleWallet?'所持コイン '+titleWallet.balance.toLocaleString('ja-JP'):'コイン情報を取得できません。Firebaseルールと通信を確認してください。';
 const list=$('titleCollection'),owned=TitleCatalog.items.filter(t=>titleViewData&&TitleCatalog.unlocked(t,titleViewData));list.replaceChildren();
 const collectionHeader=node('div','titleIndexHeader');collectionHeader.append(node('h2','','称号コレクション'),node('span','',owned.length+' / '+TitleCatalog.items.length+' 所持'));list.append(collectionHeader);
 list.append(node('p','titleIndexHint','称号 '+(titleSlot+1)+' に装備する称号を選択'));
 for(const won of [true,false]){
  const items=TitleCatalog.items.filter(t=>(!!titleViewData&&TitleCatalog.unlocked(t,titleViewData))===won);
  list.append(node('h3','titleCollectionHeading',(won?'所持済み':'未獲得')+' · '+items.length));const grid=node('div','title-grid');
  for(const item of items){
   const selected=titleDraft[titleSlot]===item.id,equipped=titleDraft.includes(item.id),button=node('button','title-entry');button.type='button';button.dataset.titleId=item.id;button.dataset.equipped=String(equipped);button.disabled=!won||titleSaving;button.setAttribute('aria-pressed',String(selected));
   const category=item.kind==='tournament'?'TOURNAMENT / SEASON '+(item.season||1):item.kind==='rating'?'RATING / '+item.threshold:(item.kind==='skill-prestige'?'MASTERY / ':'SKILL / ')+item.name.toUpperCase();
   const top=node('span','titleIndexMeta');top.append(node('span','titleIndexCode',category),node('span','titleIndexOwnership',won?'所持':'未獲得'));
   const bottom=node('span','titleIndexFooter'),progress=won?(equipped?'装備中':'所持済み'):item.skill?Math.min(item.threshold,Number(titleViewData?.uses?.[item.skill]?.count||0))+' / '+item.threshold+' 回':'未獲得';
   bottom.append(node('span','title-progress',progress),node('span','titleIndexAction',!won?'未獲得':selected?'選択中':'この称号を装備'));
   button.append(top,TitleCatalog.badge(item.id),node('span','title-description',item.description),bottom);
   button.onclick=()=>{titleDraft=titleDraft.map(id=>id===item.id?'':id);titleDraft[titleSlot]=item.id;renderTitles();const chosen=list.querySelector('.title-entry[data-title-id="'+item.id+'"]');chosen?.focus({preventScroll:true});$('titlesStatus').textContent='称号 '+(titleSlot+1)+'：'+item.name+'（保存するで確定）';};grid.append(button);
  }
  list.append(grid);
 }
 renderBattleFramePicker(titleFrames,titleSaving,saveBattleFrame);
 renderPlayerCardStyleShop(titleCardStyles,titleWallet,titleSaving,id=>changePlayerCardStyle(id,true),id=>changePlayerCardStyle(id,false));
 const panel=$('nameColorPanel');panel.replaceChildren(node('h2','titleCollectionHeading','名前色'));if(!titleWallet)return;
 const swatches=node('div','nameSwatches');for(const [color,hex]of Object.entries(window.NameStyles.colors)){const button=node('button','nameSwatch');button.type='button';button.style.setProperty('--swatch',hex);button.setAttribute('aria-label',color);button.setAttribute('aria-pressed',String(titleWallet.color===color));button.disabled=titleSaving||color!=='white'&&!titleWallet.colorUnlocked;button.onclick=()=>saveNameColor(color,titleWallet.gloss);swatches.append(button);}panel.append(swatches);
 const controls=node('div','nameUnlocks'),unlock=node('button','','100コイン払って名前色を解放');unlock.type='button';unlock.disabled=titleSaving||titleWallet.colorUnlocked||titleWallet.balance<100;unlock.textContent=titleWallet.colorUnlocked?'名前色：解放済み':unlock.textContent;unlock.onclick=()=>purchaseNameStyle('color');
 const gloss=node('button','',titleWallet.glossUnlocked?'光沢色：解放済み':'200コイン払って光沢色を解放');gloss.type='button';gloss.disabled=titleSaving||!titleWallet.colorUnlocked||titleWallet.glossUnlocked||titleWallet.balance<200;gloss.onclick=()=>purchaseNameStyle('gloss');controls.append(unlock);if(titleWallet.colorUnlocked)controls.append(gloss);panel.append(controls);
 const label=node('label','glossChoice'),check=node('input','');check.type='checkbox';check.checked=titleWallet.gloss;check.disabled=titleSaving||!titleWallet.glossUnlocked;check.onchange=()=>saveNameColor(titleWallet.color,check.checked);label.hidden=!titleWallet.colorUnlocked;label.append(check,document.createTextNode(' 光沢あり'));panel.append(label);
}
async function updateNameStyle(fn){if(titleSaving)return;titleSaving=true;const epoch=titleViewEpoch;renderTitles();try{const value=await fn();if(epoch===titleViewEpoch){titleWallet=value;document.getElementById('titlesStatus').textContent='名前色を保存しました。';}}catch(e){if(epoch===titleViewEpoch)document.getElementById('titlesStatus').textContent='保存できません：'+e.message;}finally{titleSaving=false;if(epoch===titleViewEpoch)renderTitles();}}
function purchaseNameStyle(kind){return updateNameStyle(()=>window.economyService.unlock(kind));}
function saveNameColor(color,gloss){return updateNameStyle(()=>window.economyService.saveStyle(color,gloss));}
function clearTitleSlot(){titleDraft[titleSlot]='';renderTitles();}
async function saveTitles(){if(titleSaving||!titleViewData)return;titleSaving=true;renderTitles();try{await window.titleService.saveLoadout(titleDraft);document.getElementById('titlesStatus').textContent='称号を保存しました。';}catch(e){document.getElementById('titlesStatus').textContent='保存できません：'+e.message;}finally{titleSaving=false;renderTitles();}}

async function saveBattleFrame(id){if(titleSaving||!titleFrames)return;titleSaving=true;const epoch=titleViewEpoch;renderTitles();try{const data=await window.battleFrameService.saveFrame(id);if(epoch===titleViewEpoch){titleFrames=data;document.getElementById('titlesStatus').textContent='フレームを保存しました。';}}catch(e){if(epoch===titleViewEpoch)document.getElementById('titlesStatus').textContent='保存できません：'+e.message;}finally{titleSaving=false;if(epoch===titleViewEpoch)renderTitles();}}

async function changePlayerCardStyle(id,purchase=false){
 if(titleSaving||!titleViewData)return;
 const epoch=titleViewEpoch,who=window.economyService.uid();titleSaving=true;
 document.getElementById('titlesStatus').textContent=purchase?'背景を購入しています…':'背景を保存しています…';renderTitles();
 try{
  const value=purchase?await window.economyService.buyCardStyle(id):await window.economyService.saveCardStyle(id);
  if(epoch!==titleViewEpoch||who!==window.economyService.uid())return;
  if(purchase){titleWallet=value.wallet;titleCardStyles=value.styles;}else titleCardStyles=value;
  document.getElementById('titlesStatus').textContent=purchase?(titleCardStyles.selected===id?'背景を購入して装備しました。':'購入済みです。背景を選択できます。'):'背景を保存しました。';
 }catch(error){if(epoch===titleViewEpoch)document.getElementById('titlesStatus').textContent='保存できません：'+error.message;}
 finally{titleSaving=false;if(epoch===titleViewEpoch)renderTitles();}
}
