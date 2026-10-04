let titleViewData=null,titleDraft=['','',''],titleSlot=0,titleViewEpoch=0,titleSaving=false;
const originalPlayerIntroStart=window.PlayerIntro.start;
window.PlayerIntro.start=function(options){originalPlayerIntroStart(options);const layer=document.getElementById('playerIntroLayer');if(layer){[1,2].forEach(p=>{const card=layer.querySelector('.intro-p'+p);if(card)TitleCatalog.fillCard(card,options.players?.[p]?.titles);});window.dispatchEvent(new Event('resize'));}};
async function openTitles(){
 const epoch=++titleViewEpoch;showScreen('titlesScreen');titleViewData=null;renderTitles();
 if(!window.titleService){document.getElementById('titlesStatus').textContent='接続を準備中です。少し待ってから開き直してください。';return;}
 if(!window.titleService.uid()){document.getElementById('titlesStatus').textContent='称号の獲得・保存にはログインが必要です。';return;}
 document.getElementById('titlesStatus').textContent='称号を読み込んでいます…';
 try{const data=await window.titleService.readOwn();if(epoch!==titleViewEpoch)return;titleViewData=data;titleDraft=[0,1,2].map(i=>data.loadout?.[i]||'');renderTitles();document.getElementById('titlesStatus').textContent='装備枠を選び、獲得済みの称号を押してください。';}
 catch(e){if(epoch===titleViewEpoch)document.getElementById('titlesStatus').textContent='読み込めません：'+e.message;}
}
function closeTitles(){if(titleSaving)return;titleViewEpoch++;showScreen('modeScreen');}
function renderTitles(){
 const slots=document.getElementById('titleSlots');slots.replaceChildren();
 for(let i=0;i<3;i++){const button=document.createElement('button');button.className='title-slot'+(i===titleSlot?' selected':'');button.disabled=!titleViewData||titleSaving;button.setAttribute('aria-pressed',String(i===titleSlot));const label=document.createElement('span');label.textContent='装備枠 '+(i+1);button.append(label,TitleCatalog.badge(titleViewData?titleDraft[i]:''));button.onclick=()=>{titleSlot=i;renderTitles();};slots.append(button);}
 document.getElementById('titleSave').disabled=!titleViewData||titleSaving;document.getElementById('titleClear').disabled=!titleViewData||titleSaving;document.getElementById('titleBack').disabled=titleSaving;
 const list=document.getElementById('titleCollection');list.replaceChildren();
 for(const [kind,label]of [['tournament','大会称号'],['rating','レート称号'],['tech','技の称号'],['skill-name','英名技称号']]){
  const h=document.createElement('h2');h.className='titles-group-label';h.textContent=label;list.append(h);const grid=document.createElement('div');grid.className='title-grid';
  for(const item of TitleCatalog.items.filter(t=>t.kind===kind)){
   const won=!!titleViewData&&TitleCatalog.unlocked(item,titleViewData),button=document.createElement('button');button.className='title-entry';button.disabled=!won||titleSaving;button.append(TitleCatalog.badge(item.id));const desc=document.createElement('span');desc.className='title-description';desc.textContent=item.description;button.append(desc);
   const progress=document.createElement('span');progress.className='title-progress';progress.textContent=won?(titleDraft.includes(item.id)?'装備中':'獲得済み'):(item.kind==='tech'||item.kind==='skill-name')?Math.min(item.threshold,Number(titleViewData?.uses?.[item.skill]?.count||0))+' / '+item.threshold+' 回':'未獲得';button.append(progress);
   button.onclick=()=>{titleDraft=titleDraft.map(id=>id===item.id?'':id);titleDraft[titleSlot]=item.id;renderTitles();};grid.append(button);
  }list.append(grid);
 }
}
function clearTitleSlot(){titleDraft[titleSlot]='';renderTitles();}
async function saveTitles(){
 if(titleSaving||!titleViewData)return;titleSaving=true;renderTitles();
 try{await window.titleService.saveLoadout(titleDraft);document.getElementById('titlesStatus').textContent='保存しました。次の対戦カードに表示されます。';}
 catch(e){document.getElementById('titlesStatus').textContent='保存できません：'+e.message;}
 finally{titleSaving=false;renderTitles();}
}
