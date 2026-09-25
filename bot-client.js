
let botMatch=false,botThinking=false,botKnowledge=null,botWorker=null,botEpoch=0,botTurn=0;
let randomSearchBusy=false,randomSearchCancelled=false;
function stopBot(){botEpoch++;botWorker?.terminate();botWorker=null;botThinking=false;botMatch=false;}
async function loadBotKnowledge(){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch('bot-model.json',{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('知識JSONを読み込めません（HTTP '+response.status+'）');
  const data=await response.json();
  if(data.schema!=='psy-training-v2'||data.rules!=='psy-20260924-resolver-v1'||!BattleAI.validModel(data.champion)||!Number.isSafeInteger(data.generation)||data.generation<0)throw Error('このゲームに対応した知識JSONではありません');
  // Refuse mismatched move definitions rather than let the bot plan using different rules.
  for(let i=0;i<techniquePool.length;i++){
   for(const key of ['name','skill','type','cost','power','pierce']){
    if(techniquePool[i][key]!==BattleAI.techniques[i]?.[key])throw Error('ゲームとBotの技定義が一致しません：'+techniquePool[i].name);
   }
  }
  botKnowledge=data;
 }finally{clearTimeout(timer);}
}
function botState(){
 const state=BattleAI.initial(selectedTechniques[1],selectedTechniques[2]);
 for(const p of [1,2]){
  state.hp[p]=hp[p];state.gauge[p]=gauge[p];state.seal[p]=blockSeal[p];
  state.enhance[p]=enhanceTurns[p];state.momentum[p]=momentumBonus[p];
  state.last[p]=lastAction[p]?.data?.type||'';
 }
 state.turn=botTurn+1;return state;
}
function botActionId(id){
 if(id<3)return ['charge','attack','block'][id];
 const slot=selectedTechniques[2].indexOf(id-3);
 if(slot<0)throw Error('Botの装備技にない行動です');return 'tech'+slot;
}
function prepareBotMatch(){
 stopBot();botMatch=true;botTurn=0;gameMode='offline';selectingPlayer=1;
 const choices=[...BattleAI.combinations];
 selectedTechniques[2]=choices[Math.floor(Math.random()*choices.length)].slice();
 document.querySelectorAll('#techScreen .techArrow').forEach(el=>{el.disabled=false;el.style.pointerEvents='auto';});
 const button=document.getElementById('techConfirmButton');button.disabled=false;button.textContent='決定';
 document.getElementById('techTitle').textContent='Ai v1：技選択';
 showScreen('techScreen');updateTechniqueDisplay();
}
function confirmBotTech(){
 player1Techs=selectedTechniques[1].map(i=>techniquePool[i]);
 player2Techs=selectedTechniques[2].map(i=>techniquePool[i]);
 setupBattle();
 setPlayerNames(window.loggedInPlayerData?.name||'あなた','Ai v1');
}
async function startBotTurn(){
 const epoch=++botEpoch;botWorker?.terminate();botThinking=true;locked[1]=true;locked[2]=true;
 document.getElementById('countdown').textContent='Bot思考中…';
 document.getElementById('resultMessage').replaceChildren();
 const state=botState();
 try{
  const id=await new Promise((resolve,reject)=>{
   const worker=new Worker('bot-worker.js');botWorker=worker;
   const timer=setTimeout(()=>{worker.terminate();reject(Error('Botの思考が時間内に完了しませんでした'));},15000);
   worker.onmessage=({data})=>{clearTimeout(timer);worker.terminate();data.ok?resolve(data.action):reject(Error(data.error));};
   worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('Botの思考ファイルを読み込めません'));};
   // Only the public start-of-turn state is sent. No selectedAction is sent.
   worker.postMessage({state,model:botKnowledge.champion});
  });
  if(!botMatch||epoch!==botEpoch)return;
  if(!BattleAI.legal(state,2).includes(id))throw Error('Botの行動が不正です');
  const action=botActionId(id);
  botThinking=false;botTurn++;startTurnCore();
  selectedAction[2]={id:action,data:getActionData(2,action)};locked[2]=true;
  document.getElementById('player2Area').classList.add('locked');
 }catch(error){
  if(!botMatch||epoch!==botEpoch)return;
  botThinking=false;document.getElementById('countdown').textContent='Botの読み込みエラー';
  const message=document.getElementById('resultMessage');message.textContent=error.message+' ';
  const retry=document.createElement('button');retry.textContent='再試行';retry.style.pointerEvents='auto';retry.onclick=()=>startBotTurn();message.appendChild(retry);
  document.getElementById('battleHomeButton').hidden=false;
 }
}
async function startRandomMatch(){
 if(randomSearchBusy)return;
 if(!window.onlineBattle){alert('接続を準備中です。少し待って再試行してください。');return;}
 randomSearchBusy=true;randomSearchCancelled=false;stopBot();resetOnlineMatchState();
 const status=document.getElementById('randomSearchStatus'),cancel=document.getElementById('randomSearchCancel');
 document.querySelectorAll('#onlineScreen button:not(#randomSearchCancel)').forEach(e=>e.disabled=true);
 cancel.hidden=false;cancel.disabled=false;status.textContent='対戦相手を探しています…';
 try{
  const result=await window.onlineBattle.startRandom((seconds)=>{status.textContent='対戦相手を探しています… '+seconds+' / 10秒';},()=>randomSearchCancelled);
  if(!result){status.textContent='検索をキャンセルしました';return;}
  if(result==='bot'){
   if(randomSearchCancelled){status.textContent='検索をキャンセルしました';return;}
   status.textContent='Ai v1の知識を読み込んでいます…';await loadBotKnowledge();
   if(randomSearchCancelled){status.textContent='検索をキャンセルしました';return;}
   prepareBotMatch();status.textContent='';
  }else{
   gameMode='online';onlineMatchType='random';onlineBattleStarted=false;onlineTurnNumber=0;
   selectingPlayer=window.onlineBattle.localPlayer;onlineTechConfirmed=false;
   showScreen('techScreen');
   document.querySelectorAll('#techScreen .techArrow').forEach(e=>{e.disabled=false;e.style.pointerEvents='auto';});
   const button=document.getElementById('techConfirmButton');button.disabled=false;button.textContent='決定';
   document.getElementById('techTitle').textContent='ランダム対戦：技選択';updateTechniqueDisplay();status.textContent='';
  }
 }catch(error){console.error(error);status.textContent='開始できません：'+error.message+'。接続・配信ファイル・Firebaseの権限を確認して再試行してください。';}
 finally{
  randomSearchBusy=false;cancel.hidden=true;
  document.querySelectorAll('#onlineScreen button:not(#randomSearchCancel)').forEach(e=>e.disabled=false);
 }
}
