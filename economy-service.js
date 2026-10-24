import {ref,get,update,onValue,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
export const PALETTE={white:'#ffffff',red:'#ff7185',orange:'#ffb36b',gold:'#ffe07d',green:'#8fe6ad',cyan:'#80e6ff',blue:'#8baaff',purple:'#c6a0ff',pink:'#ffafe0'};
export const emptyWallet=()=>({balance:0,claimDay:-1,claimFrom:'',colorUnlocked:false,glossUnlocked:false,color:'white',gloss:false});
export function createEconomyService(db,auth){
 let offset=0,chain=Promise.resolve();onValue(ref(db,'.info/serverTimeOffset'),s=>{offset=Number(s.val())||0;});
 const read=async p=>(await get(ref(db,p))).val(),uid=()=>auth.currentUser&&!auth.currentUser.isAnonymous?auth.currentUser.uid:null;
 const enqueue=fn=>{const job=chain.catch(()=>{}).then(fn);chain=job;return job;};
 const day=()=>Math.floor((Date.now()+offset+9*3600000)/86400000);
 const wallet=who=>read('coinWallets/'+who).then(w=>w||emptyWallet());
 async function retry(fn){for(let n=0;n<5;n++)try{return await fn();}catch(e){if(n===4)throw e;}}
 async function claim(who,d,from,event,isOwn=false){
  const receipt='coinClaims/'+who+'/'+d+'/'+from;if(await read(receipt))return false;
  return retry(async()=>{if(uid()!==who)throw Error('ログイン状態が変わりました');if(await read(receipt))return false;const current=await wallet(who),next={...current,balance:current.balance+(who===from?50:10),claimDay:Number(d),claimFrom:from};
   const patch={['coinWallets/'+who]:next,[receipt]:true};if(isOwn)patch['coinEvents/'+d+'/'+from]=event;
   try{await update(ref(db),patch);return true;}catch(e){if(await read(receipt))return false;throw e;}
  });
 }
 async function start(){
  await auth.authStateReady();const who=uid();if(!who)return {own:0,gifts:[],balance:null};
  await window.rankedTransport?.({op:'profile'});const currentDay=day(),all=await read('coinEvents')||{},gifts=[];let own=0;
  if(!all[currentDay]?.[who]){const account=await read('freeAccounts/'+who);if(await claim(who,currentDay,who,{at:serverTimestamp(),name:account.name},true))own=50;}
  if(own){all[currentDay]||={};all[currentDay][who]={name:(await read('freeAccounts/'+who)).name};}
  const [receipts,account]=await Promise.all([read('coinClaims/'+who),read('freeAccounts/'+who)]);
  for(const [d,sources]of Object.entries(all).sort((a,b)=>Number(a[0])-Number(b[0])))for(const [from,event]of Object.entries(sources)){
   if(from===who||receipts?.[d]?.[from]||event.at<(account.createdAt||0))continue;
   if(await claim(who,d,from,event))gifts.push({from,name:event.name,amount:10});
  }
  const [done,ack]=await Promise.all([read('coinClaims/'+who),read('coinAcknowledgements/'+who)]);own=0;gifts.length=0;const pending=[];for(const [d,sources]of Object.entries(done||{}))for(const from of Object.keys(sources)){if(ack?.[d]?.[from])continue;pending.push([d,from]);if(from===who)own+=50;else gifts.push({from,name:all[d]?.[from]?.name||'プレイヤー',amount:10});}return {own,gifts,receipts:pending,balance:(await wallet(who)).balance};
 }
 async function change(fn){const who=uid();if(!who)throw Error('ログインしてください');return retry(async()=>{const value=fn(await wallet(who));if(uid()!==who)throw Error('ログイン状態が変わりました');await update(ref(db),{['coinWallets/'+who]:value});window.dispatchEvent(new Event('wallet-changed'));return value;});}
 async function styleFor(who){if(!who)return {color:'white',gloss:false};const value=await wallet(who);return {color:value.colorUnlocked?value.color:'white',gloss:value.colorUnlocked&&value.glossUnlocked&&value.gloss};}
 return {playerName:async()=>{const who=uid();return who?(await read('freeAccounts/'+who))?.name||'プレイヤー':'プレイヤー';},acknowledge:async entries=>{const who=uid();if(!who||!entries?.length)return;await update(ref(db),Object.fromEntries(entries.map(([d,from])=>['coinAcknowledgements/'+who+'/'+d+'/'+from,true])));},uid,day,start:()=>enqueue(start),readOwn:()=>{const who=uid();if(!who)throw Error('ログインしてください');return wallet(who);},styleFor,PALETTE,
  unlock:kind=>enqueue(()=>change(w=>{if(kind==='color'){if(w.colorUnlocked)return w;if(w.balance<100)throw Error('100コイン必要です');return {...w,balance:w.balance-100,colorUnlocked:true};}if(kind==='gloss'){if(!w.colorUnlocked)throw Error('先に名前色を解放してください');if(w.glossUnlocked)return w;if(w.balance<300)throw Error('300コイン必要です');return {...w,balance:w.balance-300,glossUnlocked:true};}throw Error('購入内容が不正です');})),
  saveStyle:(color,gloss)=>enqueue(()=>change(w=>{if(!PALETTE[color]||color!=='white'&&!w.colorUnlocked||gloss&&!w.glossUnlocked)throw Error('名前色を解放してください');return {...w,color,gloss:!!gloss};}))};
}
