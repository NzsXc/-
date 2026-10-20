let protectedLobbyStop=null,protectedHostStop=null,protectedLobbyTimer=null,protectedLobbyBusy=false,protectedLobbyRooms={},protectedLobbyActive=false;
function protectedStatus(text){document.getElementById('friendLobbyStatus').textContent=text;}
function stopProtectedLobby(){protectedLobbyStop?.();protectedHostStop?.();protectedLobbyStop=null;protectedHostStop=null;clearInterval(protectedLobbyTimer);protectedLobbyTimer=null;}
async function openFriendLobby(){
 if(!window.protectedRooms){alert('接続を準備中です。少し待ってください。');return;}
 stopBot();resetOnlineMatchState();stopProtectedLobby();protectedLobbyActive=true;protectedLobbyBusy=false;
 gameMode='online';showScreen('friendLobbyScreen');document.getElementById('friendCreateButton').hidden=false;document.getElementById('friendCreateButton').disabled=false;document.getElementById('friendLobbyBack').disabled=false;
 protectedStatus('部屋を選ぶか、新しく作ってください。ゲストも参加できます。');
 try{const response=await window.protectedRooms.resume();if(!protectedLobbyActive)return;if(response.match){enterProtectedMatch(response.match);return;}}catch(e){protectedStatus('接続できません：'+e.message);return;}
 protectedLobbyStop=window.protectedRooms.watchList(rooms=>{protectedLobbyRooms=rooms;renderProtectedRooms();},e=>protectedStatus('接続できません：'+e.message));protectedLobbyTimer=setInterval(renderProtectedRooms,5000);
}
function renderProtectedRooms(){
 if(!protectedLobbyActive)return;const list=document.getElementById('friendRoomList');list.replaceChildren();if(protectedLobbyBusy)return;
 const now=window.protectedRooms.now();const rows=Object.entries(protectedLobbyRooms).filter(([,r])=>!r.game&&r.heartbeat>now-15000);
 for(const [id,room]of rows){
  const b=document.createElement('button');b.type='button';b.className='spectatorRow friendRoomButton';
  const identity=document.createElement('span');identity.className='friendRoomIdentity';
  const title=document.createElement('strong');title.textContent=room.name+' の部屋';
  const mode=document.createElement('span');mode.className='friendRoomMode';mode.textContent=window.RoomRules.label(room.roomRules);
  identity.append(title,mode);
  if(room.roomRules){const summary=document.createElement('span');summary.className='friendRoomSummary';summary.textContent=window.RoomRules.summary(room.roomRules);identity.append(summary);}
  const join=document.createElement('span');join.className='friendRoomJoin';join.textContent='1/2 · 参加';
  b.append(identity,join);b.onclick=()=>joinFriendRoom(id);list.append(b);
 }
 if(!rows.length){const e=document.createElement('div');e.className='spectatorEmpty';e.textContent='参加できる部屋はありません。';list.append(e);}
}
function createFriendRoom(){
 if(!protectedLobbyActive||protectedLobbyBusy)return;
 document.getElementById('friendRuleForm').reset();
 document.getElementById('friendRuleStatus').textContent='';
 updateFriendRuleSettings();showScreen('friendRuleScreen');
}
function validateFriendRuleGauge(){
 const initial=document.getElementById('friendRuleInitialGauge'),max=document.getElementById('friendRuleMaxGauge');
 initial.max=max.value;
 initial.setCustomValidity(Number(initial.value)>Number(max.value)?'初期ゲージは最大ゲージ以下にしてください。':'');
}
function updateFriendRuleSettings(){
 const custom=document.querySelector('input[name="friendRuleMode"]:checked')?.value==='custom';
 const fields=document.getElementById('friendCustomRules');fields.hidden=!custom;fields.disabled=!custom;
 const advanced=document.querySelector('input[name="friendRuleMode"]:checked')?.value==='advanced';
 document.getElementById('friendStandardRules').hidden=custom||advanced;document.getElementById('friendAdvancedRules').hidden=!advanced;
 const options=document.getElementById('friendAdvancedOptions');options.hidden=!advanced;options.disabled=!advanced;
 const selected=[];if(document.getElementById('friendRuleSkills').checked)selected.push('スキル1種：各ターン開始時の3秒間に発動');if(document.getElementById('friendRuleSpecial').checked)selected.push('スペシャルゲージ：初期0 / 最大30');
 const rules=window.RoomRules.normalize({mode:'advanced',skills:document.getElementById('friendRuleSkills').checked,special:document.getElementById('friendRuleSpecial').checked});
 document.getElementById('friendAdvancedRules').textContent=`HP ${rules.hp} / 初期ゲージ ${rules.initialGauge} / 最大ゲージ ${rules.maxGauge}。基礎技3種 ＋ 選択技3種。`+(selected.length?selected.join('。'):'追加システムなし');
 validateFriendRuleGauge();
}
function cancelFriendRoomSettings(){
 if(protectedLobbyBusy)return;
 showScreen('friendLobbyScreen');renderProtectedRooms();
}
async function submitFriendRoom(event){
 event?.preventDefault();if(!protectedLobbyActive||protectedLobbyBusy)return;
 const form=document.getElementById('friendRuleForm'),status=document.getElementById('friendRuleStatus');
 validateFriendRuleGauge();if(!form.reportValidity())return;
 let rules;
 try{
  const mode=document.querySelector('input[name="friendRuleMode"]:checked')?.value;
  rules=window.RoomRules.normalize({mode,skills:document.getElementById('friendRuleSkills').checked,special:document.getElementById('friendRuleSpecial').checked,hp:mode==='advanced'&&document.getElementById('friendRuleSpecial').checked?10:Number(document.getElementById('friendRuleHp').value),initialGauge:Number(document.getElementById('friendRuleInitialGauge').value),maxGauge:Number(document.getElementById('friendRuleMaxGauge').value)});
 }catch(error){status.textContent=error.message;return;}
 protectedLobbyBusy=true;status.textContent='部屋を作成しています…';
 document.getElementById('friendCreateButton').disabled=true;document.getElementById('friendLobbyBack').disabled=true;
 form.querySelectorAll('input,button').forEach(el=>{el.disabled=true;});renderProtectedRooms();
 try{
  const id=await window.protectedRooms.create(rules);
  showScreen('friendLobbyScreen');protectedStatus(window.RoomRules.label(rules)+' · 1/2 · 友達の参加を待っています…');
  document.getElementById('friendCreateButton').hidden=true;
  protectedHostStop=window.protectedRooms.watchHost(id,enterProtectedMatch,e=>protectedStatus(e.message));
 }catch(error){
  protectedLobbyBusy=false;status.textContent='部屋を作れません：'+error.message;
  document.getElementById('friendCreateButton').disabled=false;renderProtectedRooms();
 }finally{
  document.getElementById('friendLobbyBack').disabled=false;
  form.querySelectorAll('input,button').forEach(el=>{el.disabled=false;});
  form.querySelector('input[value="advanced"]').disabled=false;updateFriendRuleSettings();
 }
}
async function joinFriendRoom(id){
 if(protectedLobbyBusy)return;protectedLobbyBusy=true;document.getElementById('friendCreateButton').disabled=true;document.getElementById('friendLobbyBack').disabled=true;renderProtectedRooms();protectedStatus('参加しています…');
 try{const response=await window.protectedRooms.join(id);enterProtectedMatch(response.match);}
 catch(e){protectedLobbyBusy=false;protectedStatus('参加できません：'+e.message);document.getElementById('friendCreateButton').disabled=false;renderProtectedRooms();}
 finally{document.getElementById('friendLobbyBack').disabled=false;}
}
function enterProtectedMatch(match){
 if(!protectedLobbyActive||!match)return;protectedLobbyActive=false;stopProtectedLobby();
 stopBot();resetOnlineMatchState();rankedActive=true;rankedMatch=null;rankedCancelled=false;rankedSeenReveal=0;gameMode='ranked';onlineMatchType='friend';selectedTechniques={1:[0,1,2],2:[0,1,2]};const epoch=++rankedEpoch;rankedApply(match);rankedPoll(epoch);
}
async function closeFriendLobby(){
 if(document.getElementById('friendLobbyBack').disabled)return;document.getElementById('friendLobbyBack').disabled=true;
 try{const response=await window.protectedRooms.leave();if(response?.match){enterProtectedMatch(response.match);return;}protectedLobbyActive=false;stopProtectedLobby();protectedLobbyBusy=false;gameMode='online';showScreen('onlineScreen');}
 catch(e){protectedStatus('退出できません：'+e.message);}
 finally{document.getElementById('friendLobbyBack').disabled=false;}
}


