import {ref,get,set} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';

export function createBattleFrameService(db,auth){
 const uid=()=>auth.currentUser&&!auth.currentUser.isAnonymous?auth.currentUser.uid:null;
 const read=async path=>(await get(ref(db,path))).val();
 const catalog=()=>window.BattleFrameCatalog;
 async function forPlayer(who){return who?catalog().normalize(await read('battleFrameLoadouts/'+who)):'';}
 async function readOwn(){
  const who=uid();if(!who)throw Error('ログインしてください');
  const warnings=[];
  const [uses,account,frame]=await Promise.all([read('titleProgress/'+who+'/uses'),read('freeAccounts/'+who),forPlayer(who).catch(error=>{warnings.push('現在フレーム情報を取得できません。しばらくしてから開き直してください。');console.warn(error);return '';})]);
  if(uid()!==who)throw Error('ログイン状態が変わりました');
  const data={uses:uses||{},onlineWins:account?.onlineWins||0,friendWins:account?.friendWins||0,frame,warnings};
  if(!catalog().unlocked(frame,data))data.frame='';return data;
 }
 async function saveFrame(id){
  const who=uid();if(!who)throw Error('ログインしてください');
  if(!Object.hasOwn(catalog().byId,id))throw Error('不明なフレームです');
  const data=await readOwn();if(!catalog().unlocked(id,data))throw Error('フレームの解放条件を満たしていません');
  if(uid()!==who)throw Error('ログイン状態が変わりました');
  await set(ref(db,'battleFrameLoadouts/'+who),id);
  if(uid()!==who)throw Error('ログイン状態が変わりました');
  window.dispatchEvent(new Event('battle-frame-changed'));return {...data,frame:id};
 }
 return {uid,forPlayer,readOwn,saveFrame};
}
