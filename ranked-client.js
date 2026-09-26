let rankedActive=false,rankedMatch=null,rankedPolling=false,rankedSending=false,rankedCancelled=false,rankedEpoch=0,rankedSeenReveal=0,rankedQueue=Promise.resolve(),rankedLastRequest=0;
function rankedRpc(data){
 const job=rankedQueue.catch(()=>{}).then(async()=>{
  await new Promise(r=>setTimeout(r,Math.max(0,400-(Date.now()-rankedLastRequest))));
  rankedLastRequest=Date.now();
  if(!window.rankedTransport)throw Error('ランク戦の接続を準備中です');
  return window.rankedTransport(data);
 });rankedQueue=job;return job;
}
function rankedMessage(text){
 const id=rankedMatch?.phase==='select'?'techTitle':rankedMatch?'resultMessage':'randomSearchStatus';
 document.getElementById(id).textContent=text;
}
function rankedButtons(searching){
 document.querySelectorAll('#onlineScreen button:not(#randomSearchCancel)').forEach(b=>b.disabled=searching);
 const cancel=document.getElementById('randomSearchCancel');cancel.hidden=!searching;cancel.disabled=false;cancel.onclick=()=>{rankedCancelled=true;cancel.disabled=true;};
}
async function startRanked(){
 if(rankedActive)return;
 if(!window.loggedInPlayerData){alert('ログインしてからランク戦を開始してください');return;}
 stopBot();resetOnlineMatchState();rankedActive=true;rankedMatch=null;rankedCancelled=false;rankedSeenReveal=0;
 const epoch=++rankedEpoch;gameMode='ranked';rankedButtons(true);
 try{
  let response=await rankedRpc({op:'join'});
  while(rankedActive&&epoch===rankedEpoch&&!response.match&&!response.bot){
   if(rankedCancelled){response=await rankedRpc({op:'cancel'});if(!response.match){rankedStop();rankedMessage('検索をキャンセルしました');return;}break;}
   rankedMessage('対戦相手を探しています… '+Math.min(10,Math.floor((response.waitedMs||0)/1000))+' / 10秒');
   await new Promise(r=>setTimeout(r,1000));response=await rankedRpc({op:'queue'});
  }
  if(epoch!==rankedEpoch)return;
  if(response.bot){rankedStop();await loadBotKnowledge();prepareBotMatch();document.getElementById("techTitle").textContent+="（練習・レート変動なし）";return;}
  rankedButtons(false);rankedApply(response.match);rankedPoll(epoch);
 }catch(error){rankedStop();rankedMessage('ランク戦を開始できません：'+error.message);}
}
async function rankedPoll(epoch){
 rankedPolling=true;
 try{
  while(rankedActive&&epoch===rankedEpoch&&!rankedMatch?.closed){
   await new Promise(r=>setTimeout(r,1000));if(!rankedActive||epoch!==rankedEpoch)break;
   try{const r=await rankedRpc({op:'status',matchId:rankedMatch.id});if(epoch===rankedEpoch)rankedApply(r.match);}
   catch(error){if(epoch===rankedEpoch)rankedMessage('通信を再試行しています。制限時間はサーバー側で進みます。');}
  }
 }finally{rankedPolling=false;}
}
function rankedApply(m){
 if(!rankedActive||!m)return;
 if(rankedMatch?.id===m.id&&(m.revision<rankedMatch.revision||m.serverNow<rankedMatch.serverNow))return;
 const entering=!rankedMatch,wasPhase=rankedMatch?.phase;rankedMatch=m;gameMode='ranked';
 const me=m.you;selectingPlayer=me;
 if(m.phase==='select'){
  if(entering){showScreen('techScreen');updateTechniqueDisplay();}
  document.getElementById('techTitle').textContent=m.ready[me]?'技を確定しました。相手を待っています…':'ランク戦：技選択（残り'+Math.max(0,Math.ceil((m.deadline-m.serverNow)/1000))+'秒）';
  document.querySelectorAll('#techScreen .techArrow').forEach(b=>{b.disabled=m.ready[me];b.style.pointerEvents=m.ready[me]?'none':'auto';});
  const button=document.getElementById('techConfirmButton');button.disabled=m.ready[me]||rankedSending;button.textContent=m.ready[me]?'確定済み':'決定';return;
 }
 if(!m.state){
  showScreen('battleScreen');setPlayerNames(m.players[1].name,m.players[2].name);showBattleResult(m.result.winner===0?'DRAW':m.result.winner+'P WIN');rankedResult(m);return;
 }
 selectedTechniques={1:m.loadouts[1].slice(),2:m.loadouts[2].slice()};
 player1Techs=m.loadouts[1].map(i=>techniquePool[i]);player2Techs=m.loadouts[2].map(i=>techniquePool[i]);
 for(const p of [1,2]){
  hp[p]=m.state.hp[p];gauge[p]=m.state.gauge[p];blockSeal[p]=m.state.seal[p];enhanceTurns[p]=m.state.enhance[p];momentumBonus[p]=m.state.momentum[p];
  lastAction[p]=m.state.last[p]?{data:{type:m.state.last[p]}}:null;
 }
 if(entering||wasPhase==='select'){showScreen('battleScreen');setupActionNames();}
 setPlayerNames(m.players[1].name,m.players[2].bot?'AI Bot · 第'+m.botGeneration+'世代':m.players[2].name);
 updateBattleUI();
 locked[me]=m.ownAction!==null||rankedSending||m.closed||m.serverNow<m.opensAt;locked[3-me]=true;
 for(const p of [1,2])document.getElementById('player'+p+'Area').classList.toggle('locked',locked[p]);
 document.getElementById('battleHomeButton').hidden=false;document.getElementById('battleHomeButton').textContent=m.closed?'ホームへ':'降参して戻る';
 document.getElementById('countdown').textContent=m.closed?'':m.serverNow<m.opensAt?'技公開':String(Math.max(0,Math.ceil((m.deadline-m.serverNow)/1000)));
 if(!m.closed)document.getElementById('resultMessage').textContent=m.ownAction!==null?'行動を確定しました':'';
 if(m.reveal&&rankedSeenReveal!==m.reveal.turn){
  rankedSeenReveal=m.reveal.turn;
  const a=p=>m.reveal.actions[p]<3?basicActions[['charge','attack','block'][m.reveal.actions[p]]]:techniquePool[m.reveal.actions[p]-3];
  showTechniqueReveal(a(1),a(2));
 }
 if(m.closed){showBattleResult(m.result.winner===0?'DRAW':m.result.winner+'P WIN');rankedResult(m);}
}
function rankedResult(m){
 const r=m.rating;const reason={'resigned':'降参','idle-forfeit':'連続無入力','selection-timeout':'技選択の時間切れ','turn-limit':'ターン上限','battle':''}[m.result.reason]||'';
 const el=document.createElement('div');el.style.fontSize='16px';el.textContent=(reason?reason+' / ':'')+(r?'レート '+r.before+' → '+r.after+'（'+(r.delta>=0?'+':'')+r.delta+'）':'');
 if(!m.result.rated)el.textContent+=' レート変動なし';document.getElementById('resultMessage').appendChild(el);
 if(r&&window.loggedInPlayerData){window.loggedInPlayerData.rankRate=r.after;const button=document.getElementById('playerLoginButton');if(button)button.textContent=window.loggedInPlayerData.name+' / '+r.after;}
}
async function rankedConfirm(){
 if(rankedSending||rankedMatch?.phase!=='select')return;rankedSending=true;
 document.getElementById('techConfirmButton').disabled=true;
 try{const r=await rankedRpc({op:'loadout',matchId:rankedMatch.id,loadout:selectedTechniques[rankedMatch.you].slice()});rankedSending=false;rankedApply(r.match);}
 catch(e){rankedSending=false;document.getElementById('techConfirmButton').disabled=false;rankedMessage(e.message);}
}
async function rankedChoose(player,action){
 const m=rankedMatch;if(!m||player!==m.you||rankedSending||m.phase!=='turn'||locked[player])return;
 const id=['charge','attack','block'].includes(action)?['charge','attack','block'].indexOf(action):m.loadouts[player][Number(action.replace('tech',''))]+3;
 rankedSending=true;locked[player]=true;
 try{const r=await rankedRpc({op:'action',matchId:m.id,turn:m.state.turn,action:id});rankedSending=false;rankedApply(r.match);}
 catch(e){rankedSending=false;rankedMessage(e.message);}
}
function rankedStop(){rankedEpoch++;rankedActive=false;rankedMatch=null;rankedSending=false;rankedButtons(false);}
async function rankedLeave(){
 if(rankedMatch&&!rankedMatch.closed){
  if(!confirm('降参してホームに戻りますか？ レートに反映されます。'))return;
  try{const r=await rankedRpc({op:'resign',matchId:rankedMatch.id});rankedApply(r.match);return;}catch(e){rankedMessage(e.message);return;}
 }
 rankedStop();returnBattleHomeCore();
}
