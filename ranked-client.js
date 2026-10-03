--- a/ranked-client.js
+++ b/ranked-client.js
@@
-let rankedActive=false,rankedMatch=null,rankedPolling=false,rankedSending=false,rankedCancelled=false,rankedEpoch=0,rankedSeenReveal=0,rankedQueue=Promise.resolve(),rankedLastRequest=0;
+let rankedActive=false,rankedMatch=null,rankedPolling=false,rankedSending=false,rankedCancelled=false,rankedEpoch=0,rankedSeenReveal=0,rankedQueue=Promise.resolve(),rankedLastRequest=0,rankedCommandGeneration=0;
@@
 function rankedCommandRpc(data){
  if(!window.rankedTransport)return Promise.reject(Error('ランク戦の接続を準備中です'));
+ // この値より前に開始された status 応答は、確定後の状態を上書きできない。
+ rankedCommandGeneration++;
  rankedLastRequest=Date.now();
  return window.rankedTransport(data);
 }
@@
   while(rankedActive&&epoch===rankedEpoch&&!rankedMatch?.closed){
    await new Promise(r=>setTimeout(r,1000));if(!rankedActive||epoch!==rankedEpoch)break;
    // 確定操作中は新しい status 通信を開始しない。
    if(rankedSending)continue;
-   try{const r=await rankedRpc({op:'status',matchId:rankedMatch.id});if(epoch===rankedEpoch)rankedApply(r.match);}
-   catch(error){if(epoch===rankedEpoch)rankedMessage('通信を再試行しています。制限時間はサーバー側で進みます。');}
+   const commandGeneration=rankedCommandGeneration;
+   try{
+    const r=await rankedRpc({op:'status',matchId:rankedMatch.id});
+    // 通信中に技・行動が確定された場合、この応答は確定前のスナップショットかもしれない。
+    if(epoch===rankedEpoch&&commandGeneration===rankedCommandGeneration)rankedApply(r.match);
+   }catch(error){
+    if(epoch===rankedEpoch&&commandGeneration===rankedCommandGeneration)rankedMessage('通信を再試行しています。制限時間はサーバー側で進みます。');
+   }
   }
