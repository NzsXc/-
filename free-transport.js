--- a/free-transport.js
+++ b/free-transport.js
@@
-import {ref,get,set,update,push,serverTimestamp,onValue} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
+import {ref,get,set,update,push,serverTimestamp,onValue,runTransaction} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
 import {calculate,stateFields} from './free-calculator.js';
 export function createFreeTransport(db,auth){
  let offset=0;onValue(ref(db,'.info/serverTimeOffset'),s=>{offset=s.val()||0;});
- const now=()=>Date.now()+offset,read=async p=>(await get(ref(db,p))).val();
+ const now=()=>Date.now()+offset;
+ const withTimeout=(promise,ms,label)=>{
+  let timer;
+  return Promise.race([
+   Promise.resolve(promise),
+   new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+'がタイムアウトしました')),ms);})
+  ]).finally(()=>clearTimeout(timer));
+ };
+ const read=async p=>(await withTimeout(get(ref(db,p)),8000,'通信')).val();
+ const writeSet=(p,value)=>withTimeout(set(ref(db,p),value),8000,'保存');
+ const writeUpdate=(target,value)=>withTimeout(update(ref(db,target),value),8000,'保存');
+ const loadTitles=uid=>withTimeout(
+  Promise.resolve().then(()=>window.titleService?.loadoutFor?.(uid)),
+  1500,
+  '称号取得'
+ ).then(value=>Array.isArray(value)?value:[]).catch(error=>{
+  console.warn('称号情報を取得できなかったため、対戦を続行します',error);
+  return [];
+ });
@@
-   if(!s&&!terminal&&g.ready[1]&&g.ready[2]){try{await set(ref(db,path+'/state'),initial());}catch(e){if(!await read(path+'/state'))throw e;}continue;}
+   if(!s&&!terminal&&g.ready[1]&&g.ready[2]){
+    try{
+     await withTimeout(runTransaction(
+      ref(db,path+'/state'),
+      current=>current||initial(),
+      {applyLocally:false}
+     ),8000,'対戦開始');
+    }catch(e){if(!await read(path+'/state'))throw e;}
+    continue;
+   }
@@
-  const s=g.state,me=g.me,players={};for(const p of [1,2]){const account=await read('freeAccounts/'+g.players[p]);players[p]={name:account.name,rating:account.guest?null:Number.isFinite(account.rating)?account.rating:null,bot:false,titles:await window.titleService.loadoutFor(g.players[p])};}
+  const s=g.state,me=g.me,players={};
+  const playerData=await Promise.all([1,2].map(async p=>{
+   const account=await read('freeAccounts/'+g.players[p]);
+   const titles=await loadTitles(g.players[p]);
+   return [p,{name:account?.name||'プレイヤー',rating:account?.guest?null:Number.isFinite(account?.rating)?account.rating:null,bot:false,titles}];
+  }));
+  for(const [p,data] of playerData)players[p]=data;
@@
-  if(d.op==='loadout')await update(ref(db,path),{['loadouts/'+me]:d.loadout,['ready/'+me]:true});
-  else if(d.op==='action'){const s=await read(path+'/state');if(!s||now()<turnOpensAt(s))throw Error('プレイヤー紹介が終わるまでお待ちください');await set(ref(db,path+'/moves/'+d.turn+'/'+me),d.action);}
-  else if(d.op==='resign')await set(ref(db,path+'/resigned/'+me),serverTimestamp());
+  if(d.op==='loadout'){
+   try{
+    await writeUpdate(path,{['loadouts/'+me]:d.loadout,['ready/'+me]:true});
+   }catch(error){
+    // 書き込み応答だけが失われた場合、保存済みなら成功として続行する。
+    const [savedReady,savedLoadout]=await Promise.all([
+     read(path+'/ready/'+me),
+     read(path+'/loadouts/'+me)
+    ]);
+    const expected=JSON.stringify(d.loadout);
+    if(savedReady!==true||JSON.stringify(savedLoadout)!==expected)throw error;
+   }
+  }
+  else if(d.op==='action'){
+   const s=await read(path+'/state');
+   if(!s||now()<turnOpensAt(s))throw Error('プレイヤー紹介が終わるまでお待ちください');
+   try{await writeSet(path+'/moves/'+d.turn+'/'+me,d.action);}
+   catch(error){if(await read(path+'/moves/'+d.turn+'/'+me)!==d.action)throw error;}
+  }
+  else if(d.op==='resign')await writeSet(path+'/resigned/'+me,serverTimestamp());
   else if(d.op!=='status')throw Error('未対応の操作');
