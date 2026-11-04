let cpuSession=null,cpuFirst=null,cpuPending=null,cpuServerTurn=0;
let botMatch=false,botThinking=false,botKnowledge=null,botWorker=null,botEpoch=0,botTurn=0,botMatchPack=null;
function botDisplayName(){return botMatchPack?'Ai '+botMatchPack.id.slice(0,6):'Ai';}
function stopBot(){cpuSession=null;cpuFirst=null;cpuPending=null;botEpoch++;botWorker?.terminate();botWorker=null;botThinking=false;botMatch=false;}
async function loadBotKnowledge(){
 const service=await import('./remote-ai-client.mjs');
 botMatchPack=await service.requestAI('status');botMatchPack.id=botMatchPack.modelId;
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
async function confirmBotTech(){
 const epoch=botEpoch;
 const button=document.getElementById('techConfirmButton');button.disabled=true;button.textContent='CPU戦を準備中…';
 try{
  const {requestAI}=await import('./remote-ai-client.mjs');
  const response=await requestAI('cpu/start',{method:'POST',body:{loadouts:{1:selectedTechniques[1].slice(),2:selectedTechniques[2].slice()},difficulty:botSettings.difficulty}});
  if(!botMatch||epoch!==botEpoch)return;
  cpuSession=response.session;cpuFirst=response;cpuServerTurn=response.turn;cpuPending=null;
  player1Techs=selectedTechniques[1].map(i=>techniquePool[i]);player2Techs=selectedTechniques[2].map(i=>techniquePool[i]);
  setupBattle();setPlayerNames(window.loggedInPlayerData?.name||'あなた',botDisplayName());
 }catch(error){if(!botMatch||epoch!==botEpoch)return;button.disabled=false;button.textContent='再試行';document.getElementById('techTitle').textContent=error.message;}
}
async function startBotTurn(){
 const epoch=++botEpoch;botWorker?.terminate();botThinking=true;locked[1]=true;locked[2]=true;
 document.getElementById('countdown').textContent='Bot思考中…';document.getElementById('resultMessage').replaceChildren();
 const controller=new AbortController();botWorker={terminate:()=>controller.abort()};
 try{
  let response;
  if(cpuFirst){response=cpuFirst;cpuFirst=null;}
  else {
   if(!cpuSession||!cpuPending)throw Error('CPU戦の状態を確認できません');
   const {requestAI}=await import('./remote-ai-client.mjs');response=await requestAI('cpu/turn',{method:'POST',body:{session:cpuSession,...cpuPending},signal:controller.signal});
  }
  if(!botMatch||epoch!==botEpoch)return;
  cpuServerTurn=response.turn;cpuPending=null;
  const action=botActionId(response.action);
  botThinking=false;botTurn++;startTurnCore();selectedAction[2]={id:action,data:getActionData(2,action)};locked[2]=true;
  document.getElementById('player2Area').classList.add('locked');finishFrozenTurnIfReady();
 }catch(error){
  if(!botMatch||epoch!==botEpoch)return;
  botThinking=false;document.getElementById('countdown').textContent='Botの接続エラー';
  const message=document.getElementById('resultMessage');message.textContent=error.message+' ';
  const retry=document.createElement('button');retry.textContent='再試行';retry.style.pointerEvents='auto';retry.onclick=()=>startBotTurn();message.appendChild(retry);document.getElementById('battleHomeButton').hidden=false;
 }
}
window.SecureCPU={
 recordTurn(){const id=selectedAction[1]?.id;let action;
  if(id==='frozen')action=-1;else if(['charge','attack','block'].includes(id))action=['charge','attack','block'].indexOf(id);
  else if(/^tech[012]$/.test(id)){const index=selectedTechniques[1][Number(id.slice(-1))];action=index<12?index+3:index+15;}
  if(Number.isInteger(action))cpuPending={turn:cpuServerTurn,action};
 },
 async finish(){if(!cpuSession||!cpuPending)return;const submitted=cpuPending,body={session:cpuSession,...submitted};try{const {requestAI}=await import('./remote-ai-client.mjs');await requestAI('cpu/turn',{method:'POST',body});if(cpuSession===body.session&&cpuPending===submitted)cpuPending=null;}catch(error){console.warn('CPU戦の最終状態を保存できません',error);}}
};
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
  if(typeof BattleAI==='undefined')throw Error('技データを読み込めません。');
  status.textContent='CPUに接続しています…';
  await loadBotKnowledge();
  if(session!==soloSession)return;
  prepareBotMatch();
 }catch(error){status.textContent=error.message;}
 finally{soloLoading=false;button.disabled=false;updateSoloSettings();}
}

