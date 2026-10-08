import {ACTION_NAMES,HISTORY_REASONS,historySide,replayHistory,slots} from './battle-history-core.js?v=history-1';

const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=String(text);return node;};
export function createHistoryScreen(history){
 const screen=element('div');screen.id='historyScreen';screen.className='screen';
 const panel=element('div','historyPanel'),heading=element('div','historyHeading'),title=element('h1',null,'対戦履歴'),back=element('button','historyButton','プロフィールへ戻る');back.type='button';
 heading.append(title,back);
 const note=element('p','historyNote','直近10戦。履歴を押すと、対戦データ・称号・技構成を表示します。'),status=element('p','historyStatus'),list=element('div','historyList');
 status.setAttribute('role','status');list.setAttribute('aria-label','直近10戦の対戦履歴');panel.append(heading,note,status,list);screen.append(panel);document.body.append(screen);
 let generation=0,owner=null;
 back.onclick=()=>{generation++;window.showScreen('playerCardScreen');document.getElementById('playerCardHistoryButton')?.focus();};
 function playerInfo(h,p){
  const player=h.players[p],box=element('section','historyPlayer'),name=element('h3',null,player.name),rate=element('span','historyRate','レート '+h.settled['before'+p]+' → '+h.settled['after'+p]);
  box.append(name,rate);
  const loadout=player.loadout?slots(player.loadout).map(i=>ACTION_NAMES[i+3]||'不明').join(' / '):'技選択前';
  box.append(element('p','historyLoadout','技構成：'+loadout));
  const titles=element('div','historyTitles');
  if(!player.snapshot)titles.append(element('span','historyNote','対戦時の称号は未記録'));
  else{
   const ids=slots(player.titles).filter(Boolean);
   if(!ids.length)titles.append(element('span','historyNote','称号なし'));
   else for(const id of ids)titles.append(window.TitleCatalog?.byId?.[id]?window.TitleCatalog.badge(id):element('span',null,id));
  }
  box.append(titles);return box;
 }
 function battleDetails(h){
  const details=element('section','historyDetails');details.append(element('h3',null,'バトルデータ'));
   try{
    const turns=replayHistory(h);
    if(!turns.length){details.append(element('p','historyNote','行動が解決する前に対戦が終了しました。'));return details;}
    const scroll=element('div','historyTableScroll'),table=element('table','historyTable'),caption=element('caption',null,'各ターンの選択と、解決後のHP・ゲージ'),head=element('thead'),row=element('tr');
    for(const text of ['ターン',h.players[1].name,h.players[2].name]){const th=element('th',null,text);th.scope='col';row.append(th);}head.append(row);
    const body=element('tbody');
    for(const turn of turns){
     const tr=element('tr'),label=element('th',null,'T'+turn.turn);label.scope='row';tr.append(label);
     for(const p of [1,2]){const cell=element('td');cell.append(element('strong',null,ACTION_NAMES[turn.actions[p]]||'不明'),element('span','historyTurnState','HP '+turn.before.hp[p]+' → '+turn.after.hp[p]+' / ゲージ '+turn.before.gauge[p]+' → '+turn.after.gauge[p]));tr.append(cell);}
     body.append(tr);
    }
    table.append(caption,head,body);scroll.append(table);details.append(scroll);
    if(['resigned','reconnect-timeout'].includes(h.reason))details.append(element('p','historyNote','T'+h.finalState.turn+'の行動が解決する前に終了しています。'));
   }catch(error){details.append(element('p','historyStatus',error.message));}
  return details;
 }
 function card(h,uid){
  const side=historySide(h,uid),outcome=h.settled.winner===0?'引き分け':h.settled.winner===side?'勝利':'敗北';
  const article=element('details','historyCard'),summary=element('summary','historySummary'),badge=element('strong','historyOutcome '+(outcome==='勝利'?'win':outcome==='敗北'?'loss':'draw'),outcome);
  const opponent=3-side;
  const shortReason=h.reason==='resigned'?'降参':['reconnect-timeout','selection-timeout','idle-forfeit'].includes(h.reason)?'切断':HISTORY_REASONS[h.reason]?'決着':'終了';
  for(const p of [side,opponent]){
   const position=p===side?'Left':'Right',rate=element('span','historySummaryRate historySummaryRate'+position,h.settled['before'+p]),name=element('span','historySummaryName historySummaryName'+position,h.players[p].name);
   rate.title='対戦時のレート';name.title=h.players[p].name;summary.append(p===side?rate:name,p===side?name:rate);
   if(p===side)summary.append(element('span','historyVs','vs'));
  }
  const reasonLabel=element('span','historyReason',shortReason);reasonLabel.title=HISTORY_REASONS[h.reason]||'終了';
  summary.append(element('span','historyTurns',h.turnCount+'ターン'),badge,reasonLabel);
  article.append(summary);
  const date=new Date(h.endedAt).toLocaleDateString('ja-JP'),mode=h.kind==='friend'?'友達対戦':'ランダム対戦',reason=HISTORY_REASONS[h.reason]||'終了';
  let rendered=false;
  article.addEventListener('toggle',()=>{
   if(!article.open||rendered)return;rendered=true;
   const content=element('div','historyExpanded');content.append(element('p','historyMeta',date+' · '+mode+' · '+h.turnCount+'ターン · '+reason));
   const players=element('div','historyPlayers');players.append(playerInfo(h,side),playerInfo(h,opponent));content.append(players,battleDetails(h));article.append(content);
  });return article;
 }
 async function open(player){
  owner=player;const current=++generation;
  title.textContent=player.name+' の対戦履歴';list.replaceChildren();status.textContent='対戦履歴を読み込んでいます…';window.showScreen('historyScreen');
  try{
   const histories=await history.list(player.uid);if(current!==generation)return;
   list.replaceChildren(...histories.map(h=>card(h,player.uid)));status.textContent=histories.length?'':'対戦履歴はまだありません。';
  }catch(error){
   if(current!==generation)return;console.warn('対戦履歴を取得できませんでした',error);
   status.textContent='対戦履歴を取得できませんでした。通信状態を確認して、もう一度お試しください。';
   const retry=element('button','historyButton','再読み込み');retry.type='button';retry.onclick=()=>open(owner);list.append(retry);
  }
 }
 return {open};
}
