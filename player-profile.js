import {ACTION_NAMES,historySide} from './battle-history-core.js?v=history-1';

export function techniquesFromUsage(uses){
 const techniques=[];
 for(let skill=1;skill<=12;skill++){
  const entry=uses?.[skill];if(entry==null)continue;
  const count=entry.count;if(!Number.isSafeInteger(count)||count<0)throw Error('技使用回数の記録が不正です');
  if(count)techniques.push({action:skill+2,name:ACTION_NAMES[skill+2],count});
 }
 return techniques.sort((a,b)=>b.count-a.count||a.action-b.action).slice(0,3);
}

export function summarizePlayerHistories(histories,uid,currentRating){
 const counts=Array(12).fill(0);let peakRating=Math.max(1000,Number(currentRating)||1000),matches=0;
 const seen=new Set();
 for(const h of histories){
  const side=historySide(h,uid);if(!side||seen.has(h.id))continue;seen.add(h.id);matches++;
  for(const value of [h.settled?.['before'+side],h.settled?.['after'+side]])if(Number.isFinite(value))peakRating=Math.max(peakRating,value);
  for(let turn=1;turn<=h.turnCount;turn++){
   const action=h.moves?.[turn]?.[side];
   if(!Number.isInteger(action)||action<0||action>14)throw Error('使用回数を集計できない対戦データがあります');
   if(action>=3)counts[action-3]++;
  }
 }
 const techniques=counts.map((count,index)=>({action:index+3,name:ACTION_NAMES[index+3],count})).filter(t=>t.count>0).sort((a,b)=>b.count-a.count||a.action-b.action).slice(0,3);
 return {peakRating,techniques,matches};
}

const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!=null)el.textContent=String(text);return el;};
export function createPlayerProfile({history,loadTitles,showScreen,playSound=()=>{}}){
 let request=0;
 const byId=id=>document.getElementById(id);
 function renderTechniques(techniques,state='ready'){
  byId('playerCardTechniques').replaceChildren(...Array.from({length:3},(_,index)=>{
   const technique=techniques[index],card=node('div','playerCardTechnique'+(technique?'':' empty'));
   card.append(node('span','playerCardTechniqueRank',String(index+1).padStart(2,'0')));
   card.append(node('span','playerCardTechniqueName',technique?.name||(state==='loading'?'読み込み中':state==='error'?'取得できません':'使用記録なし')));
   const value=node('strong','playerCardTechniqueCount',technique?technique.count.toLocaleString('ja-JP'):state==='loading'||state==='error'?'—':'0');
   value.append(node('span','playerCardTechniqueUnit','回'));card.append(value);return card;
  }));
 }
 async function open(player){
  if(!player?.uid)return;
  const current=++request;byId('playerCardName').textContent=player.name;
  byId('playerCardRate').textContent=String(Math.max(1000,Number(player.rating)||1000));
  const winCount=value=>value!=null&&Number.isFinite(Number(value))?Math.max(0,Math.trunc(Number(value))):null;
  const onlineWins=winCount(player.onlineWins),friendWins=winCount(player.friendWins);
  const displayWins=value=>value===null?'—':value.toLocaleString('ja-JP');
  byId('playerCardTotalWins').textContent=displayWins(onlineWins===null||friendWins===null?null:onlineWins+friendWins);
  byId('playerCardRankedWins').textContent=displayWins(onlineWins);
  byId('playerCardFriendWins').textContent=displayWins(friendWins);
  byId('playerCardPeakRate').textContent='—';renderTechniques([],'loading');
  const status=byId('playerCardStatus');status.textContent='技使用回数と最高レートを取得しています…';
  byId('playerCardHistoryButton').onclick=()=>history.open(player);
  byId('playerCardTitles').replaceChildren(...Array.from({length:3},()=>node('span','playerCardTitlePlaceholder','称号を読み込み中')));
  showScreen('playerCardScreen');playSound();
  await Promise.all([
   (async()=>{
    try{
     const stats=await history.profileStats(player.uid,player.rating);if(current!==request)return;
     renderTechniques(stats.techniques);byId('playerCardPeakRate').textContent=stats.peakRating.toLocaleString('ja-JP');
     status.textContent='技は既存の使用記録を引き継ぎ、上限解除後から加算（旧上限到達時の記録は30回）。最高レートは保存済み履歴から集計。';
    }catch(error){
     if(current!==request)return;renderTechniques([],'error');status.textContent='対戦履歴の集計を取得できませんでした。';console.warn('プロフィールの集計を取得できませんでした',error);
    }
   })(),
   (async()=>{
    try{
     const ids=await loadTitles(player.uid);if(current!==request)return;
     byId('playerCardTitles').replaceChildren(...[0,1,2].map(i=>window.TitleCatalog?.badge?.(ids?.[i])||node('span','playerCardEmptyTitle','—')));
    }catch(error){
     if(current!==request)return;byId('playerCardTitles').replaceChildren(node('span','playerCardEmptyTitle','称号を取得できませんでした'));console.warn('称号を取得できませんでした',error);
    }
   })()
  ]);
 }
 return {open};
}
