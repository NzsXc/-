let rankedActive=false,rankedMatch=null,rankedPolling=false,rankedSending=false,rankedCancelled=false,rankedEpoch=0,rankedSeenReveal=0,rankedQueue=Promise.resolve(),rankedLastRequest=0,rankedCommandGeneration=0;
let rankedWatchStop=null,rankedStatusFlight=null,rankedStatusDirty=false,rankedAutoRetryAt=0,rankedAutoTimer=0;
function rankedRpc(data){
 const job=rankedQueue.catch(()=>{}).then(async()=>{
  await new Promise(r=>setTimeout(r,Math.max(0,400-(Date.now()-rankedLastRequest))));
  rankedLastRequest=Date.now();
  if(!window.rankedTransport)throw Error('ランク戦の接続を準備中です');
  return window.rankedTransport(data);
 });rankedQueue=job;return job;
}
// プレイヤーの確定操作はポーリング待ちにせず送信する。
// 操作前に開始されたstatus応答は世代番号により破棄する。
function rankedCommandRpc(data){
 if(!window.rankedTransport)return Promise.reject(Error('ランク戦の接続を準備中です'));
 rankedCommandGeneration++;
 rankedLastRequest=Date.now();
 return window.rankedTransport(data);
}
function rankedMessage(text){
 const id=rankedMatch?.phase==='select'?'techTitle':rankedMatch?'resultMessage':'randomSearchStatus';
 document.getElementById(id).textContent=text;
}
function rankedButtons(searching){
 document.querySelectorAll('#onlineScreen button:not(#randomSearchCancel)').forEach(b=>b.disabled=searching);
 const cancel=document.getElementById('randomSearchCancel');cancel.hidden=!searching;cancel.disabled=false;cancel.onclick=()=>{rankedCancelled=true;cancel.disabled=true;};
}
async function startRanked(resume=false){
 if(rankedActive)return;
 if(!window.loggedInPlayerData){alert('ログインしてからランク戦を開始してください');return;}
 stopBot();resetOnlineMatchState();rankedActive=true;rankedMatch=null;rankedCancelled=false;rankedSeenReveal=0;
 const epoch=++rankedEpoch;gameMode='ranked';rankedButtons(true);rankedMessage('対戦相手を探しています…');
 try{
  let response=await rankedRpc({op:resume?'resume':'join'});
  if(resume&&!response.match){rankedStop();return;}
  while(rankedActive&&epoch===rankedEpoch&&!response.match){
   if(rankedCancelled){response=await rankedRpc({op:'cancel'});if(!response.match){rankedStop();rankedMessage('検索をキャンセルしました');return;}break;}
   rankedMessage('1/2 · 対戦相手を待っています…（'+Math.floor((response.waitedMs||0)/1000)+'秒）');
   await new Promise(r=>setTimeout(r,1000));response=await rankedRpc({op:'queue'});
  }
  if(epoch!==rankedEpoch)return;
  rankedButtons(false);document.getElementById('randomSearchStatus').textContent='';rankedApply(response.match);rankedPoll(epoch);
 }catch(error){rankedStop();rankedMessage('ランク戦を開始できません：'+error.message);}
}
async function rankedPoll(epoch){
 if(!rankedActive||epoch!==rankedEpoch||rankedMatch?.closed)return;
 rankedWatchStop?.();
 rankedWatchStop=window.rankedTransport?.watch?.(rankedMatch.id,()=>rankedRefresh(epoch),()=>{});
 rankedPolling=true;
 try{
  while(rankedActive&&epoch===rankedEpoch&&!rankedMatch?.closed){
   await new Promise(r=>setTimeout(r,1000));if(!rankedActive||epoch!==rankedEpoch)break;
   if(rankedSending)continue;
   await rankedRefresh(epoch);
  }
 }finally{rankedPolling=false;}
}
function rankedRefresh(epoch){
 if(!rankedActive||epoch!==rankedEpoch||rankedMatch?.closed)return Promise.resolve();
 if(rankedStatusFlight){rankedStatusDirty=true;return rankedStatusFlight;}
 const matchId=rankedMatch.id,commandGeneration=rankedCommandGeneration;
 const job=Promise.resolve().then(()=>window.rankedTransport({op:'status',matchId})).then(r=>{
  if(epoch===rankedEpoch&&commandGeneration===rankedCommandGeneration)rankedApply(r.match);
 }).catch(()=>{
  if(epoch===rankedEpoch&&commandGeneration===rankedCommandGeneration)rankedMessage('通信を再試行しています。制限時間はサーバー側で進みます。');
 }).finally(()=>{
  if(rankedStatusFlight!==job)return;
  rankedStatusFlight=null;
  if(rankedStatusDirty){rankedStatusDirty=false;rankedRefresh(epoch);}
 });
 rankedStatusFlight=job;return job;
}
let rankedFrame=0,rankedClockAt=0,rankedClockServer=0,rankedAnimating=false,rankedEffectTimer=0,rankedVisualToken=0,rankedVisualCountdownEnd=0;
let rankedTurnClockKey='',rankedTurnOpensAt=0,rankedTurnDeadline=0;
function rankedVisualStop(){window.BattleEffects?.cancel();PlayerIntro.reset();cancelAnimationFrame(rankedFrame);rankedFrame=0;clearTimeout(rankedEffectTimer);clearTimeout(rankedAutoTimer);rankedAutoTimer=0;rankedVisualToken++;rankedAnimating=false;rankedVisualCountdownEnd=0;rankedTurnClockKey='';rankedTurnOpensAt=0;rankedTurnDeadline=0;stopCountdownRing();stopTurnCountdownSE();clearTimeout(window._techniqueRevealCleanupTimeout);document.getElementById('battleEffectLayer')?.replaceChildren();}
function rankedClockStart(m){
 rankedClockAt=performance.now();rankedClockServer=m.serverNow;
 if(!rankedFrame){rankedTick();}
}
function rankedSyncTurnClock(m){
 if(!m?.state)return;
 const key=m.id+':'+m.state.turn;
 if(rankedTurnClockKey===key)return;
 rankedTurnClockKey=key;
 // サーバーの開始時刻は一度だけ端末の単調増加時計へ写す。
 // 以後のpoll応答では締切を再計算しないため、数字が飛んだり加速したりしない。
 const localNow=performance.now();
 rankedTurnOpensAt=localNow+Number(m.opensAt)-Number(m.serverNow);
 rankedTurnDeadline=localNow+Number(m.deadline)-Number(m.serverNow);
 rankedAutoRetryAt=0;
 rankedScheduleAuto(Math.max(0,rankedTurnDeadline-localNow));
}
function rankedScheduleAuto(delay){
 clearTimeout(rankedAutoTimer);
 rankedAutoTimer=setTimeout(()=>{rankedAutoTimer=0;rankedAutoSelect();},delay);
}
function rankedAutoSelect(){
 const m=rankedMatch,localNow=performance.now();
 if(!rankedActive||!m?.state||m.closed||m.ownAction!=null||rankedTurnClockKey!==m.id+':'+m.state.turn||localNow<rankedTurnDeadline)return;
 if(rankedAnimating||rankedSending||localNow<rankedAutoRetryAt){rankedScheduleAuto(1000);return;}
 rankedAutoRetryAt=localNow+1000;
 rankedSubmitAction(m,m.state.gauge[m.you]>=10?1:0,true);
}
function rankedTick(){
 rankedFrame=0;const m=rankedMatch;if(!rankedActive||!m)return;
 const now=rankedClockServer+performance.now()-rankedClockAt;
 const localNow=performance.now();
 const turnOpen=!!m.state&&rankedTurnClockKey===m.id+':'+m.state.turn&&localNow>=rankedTurnOpensAt;
 const inputExpired=turnOpen&&localNow>=rankedTurnDeadline;
 if(inputExpired&&!m.closed&&!rankedAnimating&&m.ownAction==null&&!rankedSending&&localNow>=rankedAutoRetryAt)rankedAutoSelect();
 const turnRemaining=turnOpen?Math.max(0,Math.ceil((rankedTurnDeadline-localNow)/1000)):10;
 const put=(id,text)=>{const el=document.getElementById(id);if(el&&el.textContent!==text)el.textContent=text;};
 if(m.state?.turn===1&&turnOpen)PlayerIntro.cancel();
 const grace=now>=m.deadline,remaining=Math.max(0,Math.ceil(((grace?m.graceDeadline:m.deadline)-now)/1000));
 if(m.closed||rankedAnimating||!m.state||!turnOpen){stopCountdownRing();stopTurnCountdownSE();
  if(!m.closed&&m.phase==='select')put('techTitle',rankedSending?'技を送信中…':grace?'復帰猶予：あと'+remaining+'秒（未確定側は期限後に敗北）':m.ready[m.you]?'技を確定しました。相手を待っています…':(m.kind==='friend'?'ルーム対戦':'ランダム対戦')+'：技選択（残り'+remaining+'秒）');
  else if(rankedAnimating){
   const left=rankedVisualCountdownEnd-performance.now();
   const text=left>0?String(Math.min(3,Math.ceil(left/1000))):left>-500?'BATTLE!':'';
   const el=document.getElementById('countdown');
   if(el&&el.textContent!==text){el.className='';void el.offsetWidth;el.className=left>0?'countPulse':text?'battleCall':'';el.textContent=text;}
  }else if(!m.closed)put('countdown','');
 }else{
  const countdownEl=document.getElementById('countdown');
  const reconnectExpired=now>=m.deadline+5000;
  const text=inputExpired?(reconnectExpired?'復帰猶予 '+remaining+'秒':'確定待ち'):String(turnRemaining);
  if(countdownEl&&countdownEl.textContent!==text){countdownEl.className='';void countdownEl.offsetWidth;countdownEl.className=inputExpired?(localNow<rankedTurnDeadline+500?'battleCall':''):'countPulse';countdownEl.textContent=text;}
  const ring=document.getElementById('countdownRing');
  if(inputExpired){stopCountdownRing();stopTurnCountdownSE();put('resultMessage',rankedSending?'自動選択を送信中…':m.ownAction!=null?(reconnectExpired?'相手の復帰を待っています':'相手の行動を待っています…'):'自動選択を再送しています…');}
  else{ring?.classList.add('active','step');setCountdownRingStep(10-turnRemaining);startTurnCountdownSE();}
 }
 if(m.state){locked[m.you]=rankedAnimating||m.closed||rankedSending||m.ownAction!==null||!turnOpen||inputExpired;document.getElementById('player'+m.you+'Area').classList.toggle('locked',locked[m.you]);}
 if(!m.closed||rankedAnimating)rankedFrame=requestAnimationFrame(rankedTick);
}
function rankedReveal(m){
 rankedSeenReveal=m.reveal.turn;rankedAnimating=true;const token=++rankedVisualToken;
 const transitionAt=Number(m.reveal.startedAt??(m.opensAt-7500));
 const revealAt=performance.now()+transitionAt-m.serverNow+3500;
 rankedVisualCountdownEnd=revealAt-500;
 const valid=()=>rankedActive&&token===rankedVisualToken;
 const action=p=>m.reveal.actions[p]<3?basicActions[['charge','attack','block'][m.reveal.actions[p]]]:techniquePool[m.reveal.actions[p]-3];
 const a1=action(1),a2=action(2);
 document.getElementById('resultMessage').textContent='';
 locked[1]=true;locked[2]=true;
 rankedClockStart(m);
 rankedSyncTurnClock(m);
 rankedEffectTimer=setTimeout(()=>{
  if(!valid())return;
  document.getElementById('countdown').textContent='';
  showTechniqueReveal(a1,a2);
  rankedEffectTimer=setTimeout(()=>{
   if(!valid())return;
   clearTimeout(window._techniqueRevealCleanupTimeout);
   const d1=m.reveal.damage?.[1]||0,d2=m.reveal.damage?.[2]||0;
   playBattleSituationSE(a1,a2,d1,d2);
   playBattleEffect(a1,a2,()=>{
    if(!valid())return;
    const latest=rankedMatch;
    rankedAnimating=false;rankedVisualCountdownEnd=0;
    // Commit this turn only after the effect's completion callback.
    rankedApply(m,true);
    if(latest!==m)rankedApply(latest);
   },d1,d2);
  },Math.max(0,revealAt+(typeof ONLINE_REVEAL_MS==='number'?ONLINE_REVEAL_MS:1300)-performance.now()));
 },Math.max(0,revealAt-performance.now()));
}
function rankedApply(m,visualCommit=false){
 if(!rankedActive||!m)return;
 if(!visualCommit&&rankedMatch?.id===m.id){
  if(rankedMatch.closed&&!m.closed)return;
  if(rankedMatch.state&&(!m.state||m.state.turn<rankedMatch.state.turn))return;
  if(m.state?.turn===rankedMatch.state?.turn&&rankedMatch.ownAction!=null&&m.ownAction==null)m={...m,ownAction:rankedMatch.ownAction};
 }
 if(!visualCommit&&rankedMatch?.id===m.id&&(m.revision<rankedMatch.revision||m.serverNow<rankedMatch.serverNow))return;
 const entering=!rankedMatch,wasPhase=rankedMatch?.phase;if(!visualCommit)rankedMatch=m;gameMode='ranked';
 // Polling may receive newer snapshots while a previous turn is on screen.
 if(rankedAnimating&&!visualCommit)return;
 if(!entering&&!visualCommit&&m.reveal&&rankedSeenReveal<m.reveal.turn){rankedReveal(m);return;}
 // Initial snapshots restore the board; only subsequent turns play effects.
 if(entering&&m.reveal)rankedSeenReveal=m.reveal.turn;
 rankedClockStart(m);
 rankedSyncTurnClock(m);
 const me=m.you;selectingPlayer=me;
 const inGrace=!m.closed&&m.serverNow>=m.deadline+(m.state?5000:0),remaining=Math.max(0,Math.ceil(((m.graceDeadline??m.deadline)-m.serverNow)/1000));
 if(m.phase==='select'){
  if(entering){showScreen('techScreen');updateTechniqueDisplay();}
  document.getElementById('techTitle').textContent=m.ready[me]?'技を確定しました。相手を待っています…':(m.kind==='friend'?'ルーム対戦':'ランダム対戦')+'：技選択（残り'+Math.max(0,Math.ceil((m.deadline-m.serverNow)/1000))+'秒）';
  if(inGrace)document.getElementById('techTitle').textContent='復帰猶予：あと'+remaining+'秒（未確定側は期限後に敗北）';
  document.querySelectorAll('#techScreen .techArrow').forEach(b=>{b.disabled=m.ready[me]||rankedSending;b.style.pointerEvents=(m.ready[me]||rankedSending)?'none':'auto';});
  const button=document.getElementById('techConfirmButton');button.disabled=m.ready[me]||rankedSending;button.textContent=m.ready[me]?'確定済み':rankedSending?'送信中…':'決定';return;
 }
 if(!m.state){
  showScreen('battleScreen');setPlayerNames(m.players[1].name,m.players[2].name);showBattleResult(m.result.winner===0?'DRAW':m.result.winner+'P WIN');rankedResult(m);return;
 }
 selectedTechniques={1:m.loadouts[1].slice(),2:m.loadouts[2].slice()};
 player1Techs=m.loadouts[1].map(i=>techniquePool[i]);player2Techs=m.loadouts[2].map(i=>techniquePool[i]);
 for(const p of [1,2]){
  hp[p]=m.state.hp[p];gauge[p]=m.state.gauge[p];blockSeal[p]=m.state.seal[p];enhanceTurns[p]=m.state.enhance[p];momentumBonus[p]=m.state.momentum[p];ruinTurns[p]=m.state.ruin?.[p]||0;
  lastAction[p]=m.state.last[p]?{data:{type:m.state.last[p]}}:null;
 }
 if(entering||wasPhase==='select'){showScreen('battleScreen');setupActionNames();}
 setPlayerNames(m.players[1].name,m.players[2].bot?botDisplayName():m.players[2].name);
 updateBattleUI();
 if(!m.closed&&m.state.turn===1){
  PlayerIntro.start({key:'ranked:'+m.id,startAt:m.opensAt-PlayerIntro.DURATION_MS,now:()=>rankedClockServer+performance.now()-rankedClockAt,players:m.players});
 }else PlayerIntro.cancel();
 const localTurnOpen=rankedTurnClockKey===m.id+':'+m.state.turn&&performance.now()>=rankedTurnOpensAt;
 locked[me]=m.ownAction!==null||rankedSending||m.closed||!localTurnOpen||performance.now()>=rankedTurnDeadline;locked[3-me]=true;
 for(const p of [1,2])document.getElementById('player'+p+'Area').classList.toggle('locked',locked[p]);
 document.getElementById('battleHomeButton').hidden=false;document.getElementById('battleHomeButton').textContent=m.closed?'ホームへ':'降参して戻る';
 if(m.closed||rankedAnimating||m.serverNow<m.opensAt)document.getElementById('countdown').textContent='';
 if(!m.closed){document.getElementById('resultMessage').textContent=inGrace?(m.ownAction!==null?'相手の復帰を待っています':'復帰しました。期限内に行動を確定してください'):m.ownAction!==null?'行動を確定しました':'';}
 
 if(m.closed&&!rankedAnimating){rankedWatchStop?.();rankedWatchStop=null;showBattleResult(m.result.winner===0?'DRAW':m.result.winner+'P WIN');rankedResult(m);}

}
function rankedResult(m){
 const r=m.rating;const reason={'resigned':'降参','reconnect-timeout':'復帰猶予切れ','idle-forfeit':'連続無入力','selection-timeout':'技選択の時間切れ','turn-limit':'ターン上限','battle':''}[m.result.reason]||'';
 const el=document.createElement('div');el.style.fontSize='16px';el.textContent=(reason?reason+' / ':'')+(r?'レート '+r.before+' → '+r.after+'（'+(r.delta>=0?'+':'')+r.delta+'）':'');
 if(!m.result.rated)el.textContent+=' レート変動なし';document.getElementById('resultMessage').appendChild(el);
 if(r&&m.result.rated&&window.loggedInPlayerData){window.loggedInPlayerData.rankRate=r.after;const button=document.getElementById('playerLoginButton');if(button)button.textContent=window.loggedInPlayerData.name+' / '+r.after;}
}
async function rankedConfirm(){
 if(rankedSending||rankedMatch?.phase!=='select')return;
 const matchId=rankedMatch.id,you=rankedMatch.you;
 rankedSending=true;
 const button=document.getElementById('techConfirmButton');
 button.disabled=true;button.textContent='送信中…';
 document.getElementById('techTitle').textContent='技を送信中…';
 document.querySelectorAll('#techScreen .techArrow').forEach(b=>{b.disabled=true;b.style.pointerEvents='none';});
 try{
  const r=await rankedCommandRpc({op:'loadout',matchId,loadout:selectedTechniques[you].slice()});
  rankedSending=false;
  if(rankedActive&&rankedMatch?.id===matchId)rankedApply(r.match);
 }catch(e){
  rankedSending=false;
  if(rankedActive&&rankedMatch?.id===matchId&&rankedMatch.phase==='select'){
   button.disabled=false;button.textContent='決定';
   document.querySelectorAll('#techScreen .techArrow').forEach(b=>{b.disabled=false;b.style.pointerEvents='auto';});
   rankedMessage('技を確定できませんでした：'+e.message);
  }
 }
}
async function rankedChoose(player,action){
 if(PlayerIntro.isActive())return;
 const m=rankedMatch;if(!m||player!==m.you||rankedSending||m.phase!=='turn'||locked[player])return;
 if(m.closed||!m.state||m.ownAction!=null||!m.loadouts?.[player])return;
 const inputNow=performance.now();
 if(rankedTurnDeadline>0&&(inputNow<rankedTurnOpensAt||inputNow>=rankedTurnDeadline))return;
 if(!isBattleActionAvailable(player,action))return;
 const id=['charge','attack','block'].includes(action)?['charge','attack','block'].indexOf(action):m.loadouts[player][Number(action.replace('tech',''))]+3;
 return rankedSubmitAction(m,id);
}
async function rankedSubmitAction(m,id,automatic=false){
 if(rankedSending)return;
 const epoch=rankedEpoch;
 rankedSending=true;locked[m.you]=true;
 try{
  const r=await rankedCommandRpc({op:'action',matchId:m.id,turn:m.state.turn,action:id});
  if(epoch!==rankedEpoch)return;
  rankedSending=false;
  if(rankedActive&&rankedMatch?.id===m.id)rankedApply(r.match);
 }catch(e){
  if(epoch!==rankedEpoch)return;
  rankedSending=false;
  rankedAutoRetryAt=performance.now()+1000;
  rankedScheduleAuto(1000);
  // A failed write must restore manual input while the deadline is still open.
  if(rankedActive&&rankedMatch?.id===m.id)rankedApply(rankedMatch);
  rankedMessage((automatic?'自動選択を送信できませんでした：':'')+e.message);
 }
}
function rankedStop(){rankedWatchStop?.();rankedWatchStop=null;rankedStatusFlight=null;rankedStatusDirty=false;rankedVisualStop();rankedEpoch++;rankedActive=false;rankedMatch=null;rankedSending=false;rankedButtons(false);}
async function rankedLeave(){
 if(rankedMatch&&!rankedMatch.closed){
  if(!confirm(rankedMatch.kind==='friend'?'降参してホームに戻りますか？':'降参してホームに戻りますか？ レートに反映されます。'))return;
  try{const r=await rankedCommandRpc({op:'resign',matchId:rankedMatch.id});rankedApply(r.match);return;}catch(e){rankedMessage(e.message);return;}
 }
 rankedStop();returnBattleHomeCore();
}
