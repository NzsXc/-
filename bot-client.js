let botMatch=false,botThinking=false,botKnowledge=null,botWorker=null,botEpoch=0,botTurn=0;
function botDisplayName(){return "Ai v"+(Number.isSafeInteger(botKnowledge?.displayVersion)&&botKnowledge.displayVersion>=1?botKnowledge.displayVersion:1);}
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
 if(botSettings.loadout==='random'){
  const choices=[...BattleAI.combinations];
  selectedTechniques[2]=choices[Math.floor(Math.random()*choices.length)].slice();
 }else selectedTechniques[2]=botSettings.techniques.slice();
 document.querySelectorAll('#techScreen .techArrow').forEach(el=>{el.disabled=false;el.style.pointerEvents='auto';});
 const button=document.getElementById('techConfirmButton');button.disabled=false;button.textContent='決定';
 document.getElementById('techTitle').textContent='あなた：技選択（BOT・'+BOT_LEVELS[botSettings.difficulty]+'）';
 showScreen('techScreen');updateTechniqueDisplay();
}
function confirmBotTech(){
 player1Techs=selectedTechniques[1].map(i=>techniquePool[i]);
 player2Techs=selectedTechniques[2].map(i=>techniquePool[i]);
 setupBattle();
 setPlayerNames(window.loggedInPlayerData?.name||'あなた',botDisplayName());
}
async function startBotTurn(){
 const epoch=++botEpoch;botWorker?.terminate();botThinking=true;locked[1]=true;locked[2]=true;
 document.getElementById('countdown').textContent='Bot思考中…';
 document.getElementById('resultMessage').replaceChildren();
 const state=botState();
 try{
  const id=await new Promise((resolve,reject)=>{
   const worker=new Worker('bot-worker.js?v=difficulty-2');botWorker=worker;
   const timer=setTimeout(()=>{worker.terminate();reject(Error('Botの思考が時間内に完了しませんでした'));},15000);
   worker.onmessage=({data})=>{clearTimeout(timer);worker.terminate();data.ok?resolve(data.action):reject(Error(data.error));};
   worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('Botの思考ファイルを読み込めません'));};
   // Only the public start-of-turn state is sent. No selectedAction is sent.
   worker.postMessage({state,model:botKnowledge?.champion||null,difficulty:botSettings.difficulty});
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
// Compatibility for old callers; all online matching remains human-only.
function startRandomMatch(){return startRanked();}

const BOT_LEVELS={easy:'弱い',normal:'普通',hard:'強い'};
const botSettings={difficulty:'normal',loadout:'random',techniques:[0,1,2]};
let soloLoading=false,soloSession=0;
function openSoloSettings(){
 stopBot();resetOnlineMatchState();gameMode='offline';soloSession++;
 const difficulty=document.getElementById('botDifficulty');difficulty.value=botSettings.difficulty;
 difficulty.onchange=()=>{botSettings.difficulty=difficulty.value;updateSoloSettings();};
 const loadout=document.getElementById('botLoadout');loadout.value=botSettings.loadout;
 loadout.onchange=()=>{botSettings.loadout=loadout.value;updateSoloSettings();};
 document.getElementById('soloStatus').textContent='';updateSoloSettings();showScreen('soloScreen');
}
function updateSoloSettings(){
 document.getElementById('botDifficultyNote').textContent={easy:'使える行動からランダムに選びます。',normal:'1手先を考えて行動します。',hard:'2手先まで読み、より慎重に行動します。'}[botSettings.difficulty];
 const area=document.getElementById('botTechniqueSettings');area.hidden=botSettings.loadout!=='custom';area.replaceChildren();
 botSettings.techniques.forEach((index,slot)=>{
  const label=document.createElement('label');label.textContent='BOTの技 '+(slot+1);
  const select=document.createElement('select');select.disabled=soloLoading;
  techniquePool.forEach((tech,i)=>{const option=document.createElement('option');option.value=i;option.textContent=tech.name;option.disabled=botSettings.techniques.some((n,s)=>s!==slot&&n===i);select.append(option);});
  select.value=index;select.onchange=()=>{botSettings.techniques[slot]=Number(select.value);updateSoloSettings();};
  label.append(select);area.append(label);
 });
}
function closeSoloSettings(){soloSession++;showScreen('modeScreen');}
async function startSoloMatch(){
 if(soloLoading)return;const session=soloSession;soloLoading=true;
 const button=document.getElementById('soloStartButton'),status=document.getElementById('soloStatus');
 button.disabled=true;document.querySelectorAll('#soloScreen select').forEach(e=>e.disabled=true);
 try{
  if(typeof BattleAI==='undefined')throw Error('bot-engine.jsを読み込めません。');
  if(!botKnowledge && botSettings.difficulty!=='easy'){
   status.textContent='BOTを準備しています…';
   try{await loadBotKnowledge();}catch(error){
    // The built-in evaluator supports all difficulty levels even without a trained model.
    console.warn('学習済みモデルを読み込めないため標準AIを使います',error);
    if(session!==soloSession)return;
    status.textContent='学習データを読み込めません。標準AIで遊べます。もう一度「技選択へ」を押してください。';
    botKnowledge={champion:null,displayVersion:1};return;
   }
  }
  if(session!==soloSession)return;
  prepareBotMatch();
 }catch(error){status.textContent=error.message;}
 finally{soloLoading=false;button.disabled=false;document.querySelectorAll('#soloScreen select').forEach(e=>e.disabled=false);updateSoloSettings();}
}
