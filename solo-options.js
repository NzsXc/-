// Solo settings and the transport bridge to the existing battle presentation.
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 let session=null,requestQueue=Promise.resolve(),leaving=false;
 const originalUpdate=updateSoloSettings,originalStop=stopBot,originalBack=backTechSelection;
 const active=()=>!!session&&botMatch&&rankedMatch?.kind==='solo';
 async function command(data){
  const captured=session;if(!captured)throw Error('CPU戦を開始し直してください');
  const job=requestQueue.catch(()=>{}).then(async()=>{
   if(captured!==session)throw Error('CPU戦は終了しています');
   const {requestAI}=await import('./remote-ai-client.mjs');
   return requestAI('cpu/command',{method:'POST',body:{...data,session:captured}});
  });requestQueue=job;return job;
 }
 window.SoloCPU={active,command};
 window.stopBot=function(){
  const wasSolo=!!session;session=null;requestQueue=Promise.resolve();
  if(wasSolo&&rankedActive&&rankedMatch?.kind==='solo')rankedStop();
  originalStop();
 };
 function readRules(){
  const mode=document.querySelector('input[name="soloRuleMode"]:checked')?.value||'standard';
  return RoomRules.normalize({mode,hp:Number($('soloRuleHp').value),initialGauge:Number($('soloRuleInitialGauge').value),maxGauge:Number($('soloRuleMaxGauge').value),skills:$(mode==='custom'?'soloCustomSkills':'soloRuleSkills').checked,special:$(mode==='custom'?'soloCustomSpecial':'soloRuleSpecial').checked,classic:mode==='custom'&&$('soloCustomClassic').checked,draft:mode==='custom'&&$('soloCustomDraft').checked});
 }
 window.updateSoloRuleSettings=function(changed){
  const classic=$('soloCustomClassic'),other=['soloCustomSkills','soloCustomSpecial','soloCustomDraft'].map($);
  if(changed===classic&&classic.checked)other.forEach(el=>el.checked=false);
  if(changed&&changed!==classic&&changed.checked)classic.checked=false;
  other.forEach(el=>el.disabled=soloLoading||classic.checked);classic.disabled=soloLoading||other.some(el=>el.checked);
  updateSoloSettings();
 };
 window.updateSoloSettings=function(){
  originalUpdate();
  const mode=document.querySelector('input[name="soloRuleMode"]:checked')?.value||'standard';
  $('soloAdvancedOptions').hidden=mode!=='advanced';$('soloAdvancedOptions').disabled=soloLoading||mode!=='advanced';
  $('soloCustomRules').hidden=mode!=='custom';$('soloCustomRules').disabled=soloLoading||mode!=='custom';
  document.querySelectorAll('input[name="soloRuleMode"]').forEach(el=>el.disabled=soloLoading);
  try{
   const rules=readRules(),fixed=rules.classic||rules.draft;
   $('soloRuleSummary').textContent=RoomRules.label(rules)+' · '+RoomRules.summary(rules);
   $('soloBotSkillField').hidden=!RoomRules.hasSkills(rules);$('soloBotSkill').disabled=soloLoading;
   $('botLoadoutButton').disabled=soloLoading||fixed;
   if(fixed){$('botLoadoutLabel').textContent=rules.classic?'クラシックの固定3技':'ドラフトで決定';$('botLoadoutSummary').hidden=true;}
   $('soloChoiceNote').textContent=rules.classic?'クラシックは両者とも固定の3技で対戦します。':rules.draft?'CPUと順番に6つの技を取り合います。取られた技は選べません。':'あなたの技'+(RoomRules.hasSkills(rules)?'とスキル':'')+'は、このあと選べます。';
   if(!soloLoading)$('soloStartButton').textContent=rules.draft?'ドラフトへ':rules.classic?'固定の技を確認':'技'+(RoomRules.hasSkills(rules)?'・スキル':'')+'選択へ';
  }catch(error){$('soloRuleSummary').textContent=error.message;}
 };
 window.startSoloMatch=async function(){
  if(soloLoading)return;const generation=soloSession,status=$('soloStatus'),button=$('soloStartButton');
  let rules;
  try{rules=readRules();}catch(error){status.textContent=error.message;return;}
  soloLoading=true;button.disabled=true;updateSoloSettings();status.textContent='CPU戦を準備しています…';
  try{
   await loadBotKnowledge();if(generation!==soloSession)return;
   const {requestAI}=await import('./remote-ai-client.mjs');
   const response=await requestAI('cpu/open',{method:'POST',body:{rules,difficulty:botSettings.difficulty,botLoadout:botSettings.loadout,botTechniques:botSettings.techniques.slice(),botSkill:$('soloBotSkill').value,name:window.loggedInPlayerData?.name||'あなた'}});
   if(generation!==soloSession)return;
   stopBot();rankedStop();resetOnlineMatchState();
   session=response.match.id;botMatch=true;botTurn=0;rankedActive=true;rankedMatch=null;rankedCancelled=false;rankedSeenReveal=0;selectingPlayer=1;gameMode='ranked';
   selectedTechniques={1:[0,1,2],2:response.match.loadouts[2].slice()};
   const epoch=++rankedEpoch;rankedApply(response.match);updateTechniqueDisplay();rankedPoll(epoch);
  }catch(error){if(generation===soloSession)status.textContent=error.message;}
  finally{soloLoading=false;button.disabled=false;updateSoloSettings();}
 };
 window.backTechSelection=async function(){
  if(!active()||rankedMatch.phase!=='select'){originalBack();return;}
  if(leaving)return;leaving=true;
  try{await command({op:'resign',matchId:rankedMatch.id});}catch{}finally{leaving=false;stopBot();openSoloSettings();}
 };
 updateSoloSettings();
})();
