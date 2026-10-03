--- a/ranked-client.js
+++ b/ranked-client.js
@@
 function rankedRpc(data){
  const job=rankedQueue.catch(()=>{}).then(async()=>{
   await new Promise(r=>setTimeout(r,Math.max(0,400-(Date.now()-rankedLastRequest))));
   rankedLastRequest=Date.now();
   if(!window.rankedTransport)throw Error('ランク戦の接続を準備中です');
   return window.rankedTransport(data);
  });rankedQueue=job;return job;
 }
+// プレイヤーが期限内に行った確定操作を status ポーリングの後ろで待たせない。
+// サーバーの状態更新は revision/serverNow により rankedApply 側で順序検証される。
+function rankedCommandRpc(data){
+ if(!window.rankedTransport)return Promise.reject(Error('ランク戦の接続を準備中です'));
+ rankedLastRequest=Date.now();
+ return window.rankedTransport(data);
+}
@@
   while(rankedActive&&epoch===rankedEpoch&&!rankedMatch?.closed){
    await new Promise(r=>setTimeout(r,1000));if(!rankedActive||epoch!==rankedEpoch)break;
+   // 確定操作中は新しい status 通信を開始しない。
+   if(rankedSending)continue;
    try{const r=await rankedRpc({op:'status',matchId:rankedMatch.id});if(epoch===rankedEpoch)rankedApply(r.match);}
@@
-  if(!m.closed&&m.phase==='select')put('techTitle',grace?'復帰猶予：あと'+remaining+'秒（未確定側は期限後に敗北）':m.ready[m.you]?'技を確定しました。相手を待っています…':(m.kind==='friend'?'ルーム対戦':'ランダム対戦')+'：技選択（残り'+remaining+'秒）');
+  if(!m.closed&&m.phase==='select')put('techTitle',rankedSending?'技を送信中…':grace?'復帰猶予：あと'+remaining+'秒（未確定側は期限後に敗北）':m.ready[m.you]?'技を確定しました。相手を待っています…':(m.kind==='friend'?'ルーム対戦':'ランダム対戦')+'：技選択（残り'+remaining+'秒）');
@@
-  document.querySelectorAll('#techScreen .techArrow').forEach(b=>{b.disabled=m.ready[me];b.style.pointerEvents=m.ready[me]?'none':'auto';});
-  const button=document.getElementById('techConfirmButton');button.disabled=m.ready[me]||rankedSending;button.textContent=m.ready[me]?'確定済み':'決定';return;
+  document.querySelectorAll('#techScreen .techArrow').forEach(b=>{b.disabled=m.ready[me]||rankedSending;b.style.pointerEvents=m.ready[me]||rankedSending?'none':'auto';});
+  const button=document.getElementById('techConfirmButton');button.disabled=m.ready[me]||rankedSending;button.textContent=m.ready[me]?'確定済み':rankedSending?'送信中…':'決定';return;
@@
 async function rankedConfirm(){
  if(rankedSending||rankedMatch?.phase!=='select')return;rankedSending=true;
- document.getElementById('techConfirmButton').disabled=true;
- try{const r=await rankedRpc({op:'loadout',matchId:rankedMatch.id,loadout:selectedTechniques[rankedMatch.you].slice()});rankedSending=false;rankedApply(r.match);}
- catch(e){rankedSending=false;document.getElementById('techConfirmButton').disabled=false;rankedMessage(e.message);}
+ const matchId=rankedMatch.id,you=rankedMatch.you;
+ const button=document.getElementById('techConfirmButton');
+ button.disabled=true;button.textContent='送信中…';
+ document.getElementById('techTitle').textContent='技を送信中…';
+ document.querySelectorAll('#techScreen .techArrow').forEach(b=>{b.disabled=true;b.style.pointerEvents='none';});
+ try{
+  const r=await rankedCommandRpc({op:'loadout',matchId,loadout:selectedTechniques[you].slice()});
+  rankedSending=false;rankedApply(r.match);
+ }catch(e){
+  rankedSending=false;
+  // 失敗中に試合終了・別試合への遷移が起きていた場合は古いUIを戻さない。
+  if(rankedActive&&rankedMatch?.id===matchId&&rankedMatch.phase==='select'){
+   button.disabled=false;button.textContent='決定';
+   document.querySelectorAll('#techScreen .techArrow').forEach(b=>{b.disabled=false;b.style.pointerEvents='auto';});
+   rankedMessage('技を確定できませんでした：'+e.message);
+  }
+ }
 }
@@
- try{const r=await rankedRpc({op:'action',matchId:m.id,turn:m.state.turn,action:id});rankedSending=false;rankedApply(r.match);}
+ try{const r=await rankedCommandRpc({op:'action',matchId:m.id,turn:m.state.turn,action:id});rankedSending=false;rankedApply(r.match);}
  catch(e){rankedSending=false;rankedMessage(e.message);}
@@
-  try{const r=await rankedRpc({op:'resign',matchId:rankedMatch.id});rankedApply(r.match);return;}catch(e){rankedMessage(e.message);return;}
+  try{const r=await rankedCommandRpc({op:'resign',matchId:rankedMatch.id});rankedApply(r.match);return;}catch(e){rankedMessage(e.message);return;}
