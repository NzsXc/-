import {ref,get,update,query,orderByValue,limitToLast,endBefore} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
import {buildHistory,HISTORY_LIMIT,historySide} from './battle-history-core.js?v=history-1';
import {summarizePlayerHistories,techniquesFromUsage} from './player-profile.js?v=usage-1';

export function createBattleHistory(db,auth){
 const flights=new Map(),markedClients=new Set();
 const timed=async promise=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('対戦履歴の通信がタイムアウトしました')),8000);})]);}finally{clearTimeout(timer);}};
 const read=async path=>(await timed(get(ref(db,path)))).val();
 async function find(id){const h=await read('battleHistory/'+id);return h?{...h,id}:null;}
 async function markClient(id,players){
  const uid=auth.currentUser?.uid,side=players?.[1]===uid?1:players?.[2]===uid?2:0,key=uid+':'+id;
  if(!side||markedClients.has(key))return;
  const path='freeGames/'+id+'/historyClients/'+side;
  if(await read(path)!==true)await timed(update(ref(db,'freeGames/'+id+'/historyClients'),{[side]:true}));
  markedClients.add(key);
 }
 async function cleanup(id,h){
  const uid=auth.currentUser?.uid;if(!historySide(h,uid))return;
  const [players,room]=await Promise.all([read('freeGames/'+id+'/players'),h.room?read('friendRooms/'+h.room):null]);
  if(players){
   await markClient(id,players);
   const clients=await read('freeGames/'+id+'/historyClients');
   // A tab using the previous release cannot restore results from the archive.
   // Keep its live result until both participants have used the new transport.
   if(clients?.[1]!==true||clients?.[2]!==true)return;
  }
  const patch={};
  if(players)patch['freeGames/'+id]=null;
  if(room?.game===id)patch['friendRooms/'+h.room]=null;
  if(!Object.keys(patch).length)return;
  try{await timed(update(ref(db),patch));}
  catch(error){
   const [remaining,remainingRoom]=await Promise.all([read('freeGames/'+id+'/players'),h.room?read('friendRooms/'+h.room):null]);
   if(remaining||remainingRoom?.game===id)throw error;
  }
 }
 function archiveFinished(id){
  const uid=auth.currentUser?.uid,key=uid+':'+id;if(!uid)return Promise.reject(Error('ログインしてください'));
  if(flights.has(key))return flights.get(key);
  const job=(async()=>{
   let h=await find(id);
   if(!h){
    // The root read is granted only after settlement, so hidden live moves stay private.
    const g=await read('freeGames/'+id);
    if(!g){h=await find(id);if(!h)throw Error('対戦データが見つかりません');}
    else{
     if(!g.settled)throw Error('対戦はまだ終了していません');
     if(g.players[1]!==uid&&g.players[2]!==uid)throw Error('参加者ではありません');
     const entries=await Promise.all([1,2].map(async p=>[p,await read('freeAccounts/'+g.players[p])]));
     h=buildHistory(id,g,Object.fromEntries(entries));
     const patch={['battleHistory/'+id]:h};
     for(const p of [1,2])patch['playerHistory/'+g.players[p]+'/'+id]=h.endedAt;
     try{await timed(update(ref(db),patch));}
     catch(error){const saved=await find(id);if(!saved)throw error;h=saved;}
     h={...h,id};
    }
   }
   if(!historySide(h,uid))throw Error('参加者ではありません');
   if(auth.currentUser?.uid!==uid)throw Error('ログイン状態が変わりました');
   // The immutable history and both indexes have already committed. Cleanup failure
   // keeps the live room for a later retry; it never loses a result or a title proof.
   try{await cleanup(id,h);}catch(error){console.warn('履歴は保存済みです。終了済みルームの削除を再試行します',error);}
   return h;
  })().finally(()=>flights.delete(key));
  flights.set(key,job);return job;
 }
 async function list(uid){
  const snapshot=await timed(get(query(ref(db,'playerHistory/'+uid),orderByValue(),limitToLast(HISTORY_LIMIT))));
  const ids=Object.entries(snapshot.val()||{}).sort((a,b)=>b[1]-a[1]||b[0].localeCompare(a[0])).map(([id])=>id);
  const histories=await Promise.all(ids.map(find));
  return histories.filter(h=>h&&historySide(h,uid));
 }
 async function profileStats(uid,currentRating){
  // Usage is the authoritative persistent counter, including pre-archive records.
  // History is read only for peak rating. Never add the two usage sources together.
  const techniques=techniquesFromUsage(await read('titleProgress/'+uid+'/uses'));
  const histories=[];let cursor=null;
  while(true){
   const constraints=[orderByValue(),limitToLast(HISTORY_LIMIT)];if(cursor)constraints.push(endBefore(cursor[1],cursor[0]));
   const snapshot=await timed(get(query(ref(db,'playerHistory/'+uid),...constraints)));
   const entries=Object.entries(snapshot.val()||{}).sort((a,b)=>a[1]-b[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0));
   for(let start=0;start<entries.length;start+=4){
    const batch=await Promise.all(entries.slice(start,start+4).map(([id])=>find(id)));
    if(batch.some(h=>!h))throw Error('保存済み対戦履歴が不足しています');histories.push(...batch);
   }
   if(entries.length<HISTORY_LIMIT)break;cursor=entries[0];
  }
  return {...summarizePlayerHistories(histories,uid,currentRating),techniques};
 }
 return {find,list,profileStats,archiveFinished,markClient};
}
