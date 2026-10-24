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
  state.enhance[p]=enhanceTurns[p];state.momentum[p]=momentumBonus[p];state.ruin[p]=ruinTurns[p];
  state.last[p]=lastAction[p]?.data?.type||'';
 }
 state.frozen=[0,window.localExtraState?.frozen1||0,window.localExtraState?.frozen2||0];state.poison=[0,window.localExtraState?.poison1||0,window.localExtraState?.poison2||0];state.turn=botTurn+1;return state;
}
function botActionId(id){
 if(id===-1)return 'frozen';
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
    const worker=new Worker('bot-worker.js?v=account-update-20261024');botWorker=worker;
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
let soloLoading=false,soloSession=0,botTechniqueDraft=[];
function openSoloSettings(){
 stopBot();resetOnlineMatchState();gameMode='offline';soloSession++;
 document.getElementById('soloStatus').textContent='';updateSoloSettings();showScreen('soloScreen');
}
function setBotDifficulty(difficulty){
 if(soloLoading||!Object.hasOwn(BOT_LEVELS,difficulty))return;
 botSettings.difficulty=difficulty;updateSoloSettings();
}
function updateSoloSettings(){
 document.getElementById('botDifficultyNote').textContent={easy:'使える行動からランダムに選びます。',normal:'1手先を考えて行動します。',hard:'2手先まで読み、より慎重に行動します。'}[botSettings.difficulty];
 document.querySelectorAll('[data-bot-difficulty]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.botDifficulty===botSettings.difficulty));button.disabled=soloLoading;
 });
 document.getElementById('botLoadoutButton').disabled=soloLoading;
 document.getElementById('botLoadoutLabel').textContent=botSettings.loadout==='random'?'お任せ':'3つの技を指定';
 const summary=document.getElementById('botLoadoutSummary');summary.hidden=botSettings.loadout!=='custom';
 summary.textContent=botSettings.loadout==='custom'?botSettings.techniques.map(index=>techniquePool[index].name).join(' / '):'';
}
function openBotTechniquePicker(){
 const dialog=document.getElementById('botTechniqueDialog');
 if(soloLoading||dialog.open)return;
 botTechniqueDraft=botSettings.loadout==='custom'?botSettings.techniques.slice():[];
 const area=document.getElementById('botTechniqueSettings');area.replaceChildren();
 techniquePool.forEach((tech,index)=>{
  const label=document.createElement('label');label.className='botTechniqueChoice';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=String(index);
  checkbox.checked=botTechniqueDraft.includes(index);
  checkbox.onchange=()=>{
   if(checkbox.checked){if(botTechniqueDraft.length<3)botTechniqueDraft.push(index);else checkbox.checked=false;}
   else botTechniqueDraft=botTechniqueDraft.filter(value=>value!==index);
   updateBotTechniquePicker();
  };
  const art=document.createElement('span');art.className='botTechniqueArt';art.setAttribute('aria-hidden','true');
  const kind=window.BattleActionArt?.kindOf(tech);
  if(kind){const image=document.createElement('img');image.src=window.BattleActionArt.imageSource(kind);image.alt='';image.draggable=false;art.append(image);}
  const name=document.createElement('span');name.className='botTechniqueName';name.textContent=tech.name;
  label.append(checkbox,art,name);area.append(label);
 });
 updateBotTechniquePicker();dialog.showModal();
}
function updateBotTechniquePicker(){
 const count=botTechniqueDraft.length;
 document.getElementById('botTechniqueCount').textContent='3つの技を選択 · '+count+' / 3';
 document.getElementById('botTechniqueApply').disabled=count!==3;
 document.querySelectorAll('#botTechniqueSettings input').forEach(input=>{input.disabled=count===3&&!input.checked;});
}
function closeBotTechniquePicker(){document.getElementById('botTechniqueDialog').close();botTechniqueDraft=[];}
function confirmBotTechniques(){
 if(botTechniqueDraft.length!==3||new Set(botTechniqueDraft).size!==3||botTechniqueDraft.some(index=>!techniquePool[index]))return;
 botSettings.loadout='custom';botSettings.techniques=botTechniqueDraft.slice();
 closeBotTechniquePicker();updateSoloSettings();
}
function useRandomBotTechniques(){botSettings.loadout='random';closeBotTechniquePicker();updateSoloSettings();}
function closeSoloSettings(){soloSession++;closeBotTechniquePicker();showScreen('modeScreen');}
async function startSoloMatch(){
 if(soloLoading)return;const session=soloSession;soloLoading=true;
 const button=document.getElementById('soloStartButton'),status=document.getElementById('soloStatus');
 button.disabled=true;updateSoloSettings();
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
 finally{soloLoading=false;button.disabled=false;updateSoloSettings();}
}

