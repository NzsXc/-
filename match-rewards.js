/* Match rewards are ledger-backed; the home notice acknowledges only a completed grant. */
(()=>{
 const matches=new Map(),claims=new Map();let showing=false,homeGeneration=0;
 function finished(match){if(!match?.closed||!match.state)return;const who=window.economyService?.uid();if(!who)return;const key=who+':'+match.id;matches.set(key,match.id);if(claims.has(key))return;
  const job=window.economyService.claimBattle(match.id).catch(error=>{claims.delete(key);console.warn('対戦コインの受取をホームで再試行します',error);});claims.set(key,job);
 }
 async function home(){
  const generation=++homeGeneration;if(showing||!document.getElementById('modeScreen')?.classList.contains('active'))return;
  const who=window.economyService?.uid();if(!who)return;showing=true;
  try{
   for(const [key,id]of matches)if(key.startsWith(who+':'))await window.economyService.claimBattle(id);
   const result=await window.economyService.pendingBattles();
   if(!result.amount||result.uid!==window.economyService.uid()||generation!==homeGeneration||!document.getElementById('modeScreen').classList.contains('active'))return;
   await window.AccountUI.notice('対戦でコイン獲得',[result.ids.length===1?'ログインユーザー同士の対戦で10コイン獲得':result.ids.length+'試合分で'+result.amount+'コイン獲得','所持コイン '+result.balance]);
   await window.economyService.acknowledgeBattles(result.ids,who);
  }catch(error){console.warn('対戦報酬を受け取れませんでした',error);if(document.getElementById('modeScreen').classList.contains('active'))await window.AccountUI.notice('対戦コインを受け取れませんでした',[/permission[ _-]?denied/i.test(String(error.code||'')+' '+error.message)?'対戦報酬に対応するFirebaseルールの公開が必要です。':'通信を確認してください。次回ホームへ戻ったときに再試行します。']);}
  finally{showing=false;}
 }
 window.MatchRewards={finished,home};
 window.addEventListener('game-screen-change',event=>{if(event.detail.id==='modeScreen')home();else homeGeneration++;});
 window.addEventListener('player-login-ready',()=>{if(document.getElementById('modeScreen')?.classList.contains('active'))home();});
})();
