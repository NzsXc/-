import {ref,get,update,onValue,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
export const PALETTE={white:'#ffffff',red:'#ff7185',orange:'#ffb36b',gold:'#ffe07d',green:'#8fe6ad',cyan:'#80e6ff',blue:'#8baaff',purple:'#c6a0ff',pink:'#ffafe0'};
export const emptyWallet=()=>({balance:0,claimDay:-1,claimFrom:'',colorUnlocked:false,glossUnlocked:false,color:'white',gloss:false});
export const CARD_STYLE_IDS=Object.freeze(['obsidian','abyss']);
export function normalizeCardStyles(value){
 const owned=Object.fromEntries(CARD_STYLE_IDS.filter(id=>value?.owned?.[id]===true).map(id=>[id,true]));
 return {owned,selected:value?.selected&&owned[value.selected]===true?value.selected:''};
}
export function createEconomyService(db,auth){
 let offset=0,chain=Promise.resolve();onValue(ref(db,'.info/serverTimeOffset'),s=>{offset=Number(s.val())||0;});
 const read=async p=>(await get(ref(db,p))).val(),uid=()=>auth.currentUser&&!auth.currentUser.isAnonymous?auth.currentUser.uid:null;
 const enqueue=fn=>{const job=chain.catch(()=>{}).then(fn);chain=job;return job;};
 const day=()=>Math.floor((Date.now()+offset+9*3600000)/86400000);
 const wallet=who=>read('coinWallets/'+who).then(w=>w||emptyWallet());
 const cardStyles=who=>read('playerCardStyles/'+who).then(normalizeCardStyles);
 const permissionDenied=e=>/permission[ _-]?denied/i.test(String(e.code||'')+' '+e.message);
 const sameWallet=(a,b)=>Object.keys(emptyWallet()).every(k=>a[k]===b[k]);
 async function retry(fn){for(let n=0;n<5;n++)try{return await fn();}catch(e){if(n===4||permissionDenied(e)&&!e.walletConflict)throw e;}}
 async function claim(who,d,from,event,isOwn=false){
  const receipt='coinClaims/'+who+'/'+d+'/'+from;if(await read(receipt))return false;
  return retry(async()=>{if(uid()!==who)throw Error('ログイン状態が変わりました');if(await read(receipt))return false;const current=await wallet(who),next={...current,balance:current.balance+(who===from?50:10),claimDay:Number(d),claimFrom:from};
   const patch={['coinWallets/'+who]:next,[receipt]:true};if(isOwn)patch['coinEvents/'+d+'/'+from]=event;
   try{await update(ref(db),patch);return true;}catch(e){if(await read(receipt))return false;if(permissionDenied(e)&&!sameWallet(current,await wallet(who)))e.walletConflict=true;throw e;}
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
 async function change(fn){const who=uid();if(!who)throw Error('ログインしてください');return retry(async()=>{const current=await wallet(who),value=fn(current);if(uid()!==who)throw Error('ログイン状態が変わりました');try{await update(ref(db),{['coinWallets/'+who]:value});}catch(e){if(permissionDenied(e)&&!sameWallet(current,await wallet(who)))e.walletConflict=true;throw e;}window.dispatchEvent(new Event('wallet-changed'));return value;});}

 async function purchaseCardStyle(id){
  const who=uid();if(!who)throw Error('ログインしてください');
  if(!CARD_STYLE_IDS.includes(id))throw Error('不明なカード背景です');
  return retry(async()=>{
   const [current,styles]=await Promise.all([wallet(who),cardStyles(who)]);
   if(uid()!==who)throw Error('ログイン状態が変わりました');
   if(styles.owned[id])return {wallet:current,styles};
   if(current.balance<100)throw Error('100コイン必要です');
   const next={...current,balance:current.balance-100},nextStyles={owned:{...styles.owned,[id]:true},selected:id};
   try{await update(ref(db),{['coinWallets/'+who]:next,['playerCardStyles/'+who]:nextStyles});}
   catch(error){
    if(uid()!==who)throw Error('ログイン状態が変わりました');
    const [latestWallet,latestStyles]=await Promise.all([wallet(who),cardStyles(who)]);
    if(latestStyles.owned[id])return {wallet:latestWallet,styles:latestStyles};
    if(permissionDenied(error)&&(!sameWallet(current,latestWallet)||CARD_STYLE_IDS.some(key=>styles.owned[key]!==latestStyles.owned[key])))error.walletConflict=true;
    throw error;
   }
   if(uid()!==who)throw Error('ログイン状態が変わりました');
   window.dispatchEvent(new Event('wallet-changed'));window.dispatchEvent(new Event('player-card-style-changed'));
   return {wallet:next,styles:nextStyles};
  });
 }
 async function selectCardStyle(id){
  const who=uid();if(!who)throw Error('ログインしてください');
  if(id!==''&&!CARD_STYLE_IDS.includes(id))throw Error('不明なカード背景です');
  const styles=await cardStyles(who);if(uid()!==who)throw Error('ログイン状態が変わりました');
  if(id&&!styles.owned[id])throw Error('カード背景を購入してください');
  await update(ref(db),{['playerCardStyles/'+who+'/selected']:id});
  if(uid()!==who)throw Error('ログイン状態が変わりました');
  window.dispatchEvent(new Event('player-card-style-changed'));return cardStyles(who);
 }

 async function claimBattle(id){
  const who=uid();if(!who||typeof id!=='string'||!/^[A-Za-z0-9_-]+$/.test(id))return false;
  const receipt='coinBattleClaims/'+who+'/'+id;if(await read(receipt))return false;
  const live=await read('freeGames/'+id+'/players'),saved=live?null:await read('battleHistory/'+id);
  const players=live||{1:saved?.players?.[1]?.uid,2:saved?.players?.[2]?.uid};
  if(![1,2].some(p=>players[p]===who)||!players[1]||!players[2]||players[1]===players[2])return false;
  const [a,b,settled,state]=await Promise.all([read('freeAccounts/'+players[1]),read('freeAccounts/'+players[2]),live?read('freeGames/'+id+'/settled'):Promise.resolve(saved?.settled),live?read('freeGames/'+id+'/state'):Promise.resolve(saved?.finalState)]);
  if(!settled||!state||!a||!b||a.guest===true||b.guest===true)return false;
  return retry(async()=>{
   if(uid()!==who)throw Error('ログイン状態が変わりました');if(await read(receipt))return false;
   const current=await wallet(who),next={...current,balance:current.balance+10,claimDay:-1,claimFrom:id};
   try{await update(ref(db),{['coinWallets/'+who]:next,[receipt]:true});}
   catch(error){if(await read(receipt))return false;if(permissionDenied(error)&&!sameWallet(current,await wallet(who)))error.walletConflict=true;throw error;}
   window.dispatchEvent(new Event('wallet-changed'));return true;
  });
 }
 async function pendingBattles(){
  const who=uid();if(!who)return {ids:[],amount:0,balance:null};
  const account=await read('freeAccounts/'+who);if(account?.lastSettled)await claimBattle(account.lastSettled);
  const [claims,ack]=await Promise.all([read('coinBattleClaims/'+who),read('coinBattleAcknowledgements/'+who)]);
  const ids=Object.keys(claims||{}).filter(id=>!ack?.[id]);return {ids,amount:ids.length*10,balance:(await wallet(who)).balance,uid:who};
 }
 async function acknowledgeBattles(ids,expectedUid){const who=uid();if(!who||who!==expectedUid||!ids.length)return;await update(ref(db),Object.fromEntries(ids.map(id=>['coinBattleAcknowledgements/'+who+'/'+id,true])));}
 async function styleFor(who){if(!who)return {color:'white',gloss:false};const value=await wallet(who);return {color:value.colorUnlocked?value.color:'white',gloss:value.colorUnlocked&&value.glossUnlocked&&value.gloss};}
 return {claimBattle:id=>enqueue(()=>claimBattle(id)),pendingBattles:()=>enqueue(pendingBattles),acknowledgeBattles,readOwnCardStyles:()=>{const who=uid();if(!who)throw Error('ログインしてください');return cardStyles(who);},cardStyleFor:async who=>who?(await cardStyles(who)).selected:'',buyCardStyle:id=>enqueue(()=>purchaseCardStyle(id)),saveCardStyle:id=>enqueue(()=>selectCardStyle(id)),playerName:async()=>{const who=uid();return who?(await read('freeAccounts/'+who))?.name||'プレイヤー':'プレイヤー';},acknowledge:async (entries,expectedUid)=>{const who=uid();if(!who||(expectedUid&&who!==expectedUid)||!entries?.length)return;await update(ref(db),Object.fromEntries(entries.map(([d,from])=>['coinAcknowledgements/'+who+'/'+d+'/'+from,true])));},uid,day,start:()=>enqueue(start),readOwn:()=>{const who=uid();if(!who)throw Error('ログインしてください');return wallet(who);},styleFor,PALETTE,
  unlock:kind=>enqueue(()=>change(w=>{if(kind==='color'){if(w.colorUnlocked)return w;if(w.balance<100)throw Error('100コイン必要です');return {...w,balance:w.balance-100,colorUnlocked:true};}if(kind==='gloss'){if(!w.colorUnlocked)throw Error('先に名前色を解放してください');if(w.glossUnlocked)return w;if(w.balance<200)throw Error('200コイン必要です');return {...w,balance:w.balance-200,glossUnlocked:true};}throw Error('購入内容が不正です');})),
  saveStyle:(color,gloss)=>enqueue(()=>change(w=>{if(!PALETTE[color]||color!=='white'&&!w.colorUnlocked||gloss&&!w.glossUnlocked)throw Error('名前色を解放してください');return {...w,color,gloss:!!gloss};}))};
}
