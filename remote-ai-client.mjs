const PREFIX='./api/game-ai/';
const pending=new Map();
export async function ensureAIAuth(){
 if(!window.gameAuth)throw Error('ログイン機能を読み込んでいます。少し待って再試行してください');
 await window.gameAuth.authStateReady();if(!window.gameAuth.currentUser)await window.protectedRooms?.ensure();
 if(!window.gameAuth.currentUser)throw Error('ログイン情報を確認できません');return window.gameAuth.currentUser;
}
export async function requestAI(path,{method='GET',body,signal}={}){
 const user=await ensureAIAuth(),token=await user.getIdToken();
 const r=await fetch(new URL(PREFIX+path,document.baseURI),{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:signal||AbortSignal.timeout(20000),cache:'no-store'});
 let data;try{data=await r.json();}catch{const error=Error('AIの応答を取得できません。時間をおいて再試行してください');error.status=r.status;throw error;}
 if(!r.ok){const error=Error(data.error||'AIデータを取得できません');error.status=r.status;throw error;}return data;
}
export function enqueueHistory(id){
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))return Promise.reject(Error('履歴IDが不正です'));
 if(!pending.has(id))pending.set(id,requestAI('history/'+id,{method:'POST',body:{}}).catch(error=>{pending.delete(id);throw error;}));
 return pending.get(id);
}
window.SecureAI={request:requestAI,enqueueHistory};
