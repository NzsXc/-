let friendLobbyStop=null,friendLobbyTimer=null,friendLobbyRooms={},friendLobbyBusy=false,friendLobbyActive=false,friendTechOpened=false,friendPendingRoom=null;
function friendStatus(text){document.getElementById('friendLobbyStatus').textContent=text;}
function stopFriendList(){friendLobbyStop?.();friendLobbyStop=null;clearInterval(friendLobbyTimer);friendLobbyTimer=null;}
function openFriendLobby(){
 if(!window.onlineBattle){alert('接続を準備中です。少し待って再試行してください。');return;}
 stopBot();resetOnlineMatchState();stopFriendList();
 friendLobbyActive=true;friendTechOpened=false;friendPendingRoom=null;friendLobbyRooms={};
 gameMode='online';onlineMatchType='friend';onlineBattleStarted=false;onlineTechConfirmed=false;onlineTurnNumber=0;
 document.getElementById('friendCreateButton').hidden=false;
 document.getElementById('friendLobbyBack').textContent='戻る';
 friendStatus('部屋を選ぶか、新しく作ってください。');showScreen('friendLobbyScreen');
 document.getElementById('friendRoomList').textContent='読み込み中…';
 friendLobbyStop=window.onlineBattle.watchAllRooms(rooms=>{friendLobbyRooms=rooms;renderFriendRooms();},error=>{friendStatus('部屋一覧を読み込めません：'+error.message);});
 friendLobbyTimer=setInterval(renderFriendRooms,5000);
}
function renderFriendRooms(){
 if(!friendLobbyActive)return;
 const list=document.getElementById('friendRoomList');list.replaceChildren();
 if(window.onlineBattle.active)return;
 const now=window.onlineBattle.now();
 const entries=Object.entries(friendLobbyRooms).filter(([,r])=>r?.matchType==='friend'&&r.lobbyPhase==='waiting'&&!r.battle&&r.players?.[1]?.joined&&r.players[1].online===true&&now-Number(r.players[1].lastSeen||0)<60000&&!r.players?.[2]?.joined);
 entries.sort((a,b)=>Number(b[1].createdAt)-Number(a[1].createdAt));
 for(const [code,room] of entries){
  const button=document.createElement('button');button.className='spectatorRow friendRoomButton';button.disabled=friendLobbyBusy;
  const name=document.createElement('span');name.className='spectatorPlayer';name.textContent=room.players[1].name+' の部屋';
  const count=document.createElement('span');count.textContent='1/2 · 参加';button.append(name,count);button.onclick=()=>joinFriendRoom(code);list.append(button);
 }
 if(!entries.length){const empty=document.createElement('div');empty.className='spectatorEmpty';empty.textContent='参加できる部屋はありません。部屋を作って友達を待ちましょう。';list.append(empty);}
}
async function createFriendRoom(){await enterFriendRoom(null);}
async function joinFriendRoom(code){await enterFriendRoom(code);}
async function enterFriendRoom(code){
 if(friendLobbyBusy||!friendLobbyActive)return;
 friendLobbyBusy=true;friendTechOpened=false;
 document.getElementById('friendCreateButton').disabled=true;
 document.getElementById('friendLobbyBack').disabled=true;renderFriendRooms();
 friendStatus(code?'部屋に参加しています…':'部屋を作っています…');
 try{
  await window.onlineBattle.start(code);
  document.getElementById('friendCreateButton').hidden=true;
  document.getElementById('friendRoomList').replaceChildren();
  document.getElementById('friendLobbyBack').textContent='退出して戻る';
  friendStatus('1/2 · 友達の参加を待っています…');
 }catch(error){friendStatus(error.message);renderFriendRooms();}
 finally{
  friendLobbyBusy=false;document.getElementById('friendCreateButton').disabled=false;document.getElementById('friendLobbyBack').disabled=false;
  if(friendPendingRoom){const room=friendPendingRoom;friendPendingRoom=null;window.onFriendRoomUpdate(room);}
  renderFriendRooms();
 }
}
window.onFriendRoomUpdate=function(room){
 if(!friendLobbyActive||room?.matchType!=='friend'||friendTechOpened)return;
 if(friendLobbyBusy){friendPendingRoom=room;return;}
 const players=room.players||{};
 if(!players[1]?.joined||!players[2]?.joined)return;
 if(players[1].online!==true||players[2].online!==true){friendStatus('相手の接続を待っています…');return;}
 friendTechOpened=true;stopFriendList();
 selectingPlayer=window.onlineBattle.localPlayer;onlineTechConfirmed=false;
 selectedTechniques[1]=[0,1,2];selectedTechniques[2]=[0,1,2];
 document.querySelectorAll('#techScreen .techArrow').forEach(e=>{e.disabled=false;e.style.pointerEvents='auto';});
 const button=document.getElementById('techConfirmButton');button.disabled=false;button.textContent='決定';
 document.getElementById('techTitle').textContent='友達対戦：あなたの技を選択';
 showScreen('techScreen');updateTechniqueDisplay();
};
async function closeFriendLobby(){
 if(friendLobbyBusy)return;
 friendLobbyActive=false;friendTechOpened=false;friendPendingRoom=null;stopFriendList();
 await window.onlineBattle.leave();resetOnlineMatchState();gameMode='online';showScreen('onlineScreen');
}
