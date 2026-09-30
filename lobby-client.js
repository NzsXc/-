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
 for(const [id,room]of rows){const b=document.createElement('button');b.className='spectatorRow friendRoomButton';b.textContent=room.name+' の部屋　1/2 · 参加';b.onclick=()=>joinFriendRoom(id);list.append(b);}
 if(!rows.length){const e=document.createElement('div');e.className='spectatorEmpty';e.textContent='参加できる部屋はありません。';list.append(e);}
}
async function createFriendRoom(){
 if(protectedLobbyBusy)return;protectedLobbyBusy=true;document.getElementById('friendCreateButton').disabled=true;document.getElementById('friendLobbyBack').disabled=true;renderProtectedRooms();
 try{const id=await window.protectedRooms.create();protectedStatus('1/2 · 友達の参加を待っています…');document.getElementById('friendCreateButton').hidden=true;protectedHostStop=window.protectedRooms.watchHost(id,enterProtectedMatch,e=>protectedStatus(e.message));}
 catch(e){protectedLobbyBusy=false;protectedStatus('部屋を作れません：'+e.message);document.getElementById('friendCreateButton').disabled=false;renderProtectedRooms();}
 finally{document.getElementById('friendLobbyBack').disabled=false;}
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
