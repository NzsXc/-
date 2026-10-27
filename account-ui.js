/* Menus, volume controls, name styles, and tap-to-dismiss startup notices. */
(()=>{
 const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text!=null)e.textContent=text;return e;};
 const VERSION='2026-10-24-seven-techniques-coins';
 window.showHelpPage=function(page){const p=page===2?2:1;for(const i of [1,2]){$('helpPage'+i).hidden=i!==p;const tab=$('helpTab'+i);tab.setAttribute('aria-pressed',String(i===p));tab.classList.toggle('active',i===p);if(i===p)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current');}if(p===1){$('helpTopics').hidden=false;$('helpArticle').hidden=true;$('helpContentsBack').hidden=true;}document.querySelector('#helpScreen .utilityPanel').scrollTop=0;};
 document.querySelector('[data-topic="0"]').onclick=()=>{$('helpTopics').hidden=true;$('helpArticle').hidden=false;$('helpContentsBack').hidden=false;};$('helpContentsBack').onclick=()=>showHelpPage(1);
 const safely={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
 const colors={white:'#ffffff',red:'#ff7185',orange:'#ffb36b',gold:'#ffe07d',green:'#8fe6ad',cyan:'#80e6ff',blue:'#8baaff',purple:'#c6a0ff',pink:'#ffafe0'};
 function applyName(el,style={}){if(!el)return;const color=colors[style.color]||colors.white;el.style.setProperty('--player-name-color',color);el.style.color=color;el.classList.add('coloredPlayerName');el.classList.toggle('glossPlayerName',!!style.gloss);}
 async function paintName(el,uid){if(!el)return;el.dataset.styleUid=uid||'';applyName(el);try{const style=await window.economyService?.styleFor(uid);if(el.dataset.styleUid===(uid||''))applyName(el,style);}catch{}}
 window.NameStyles={apply:applyName,paint:paintName,colors};
 window.renderV4Statuses=state=>{for(const p of [1,2]){let status=$('v4Status'+p);if(!status){status=node('span','battleStatusV4');status.id='v4Status'+p;document.querySelector('#player'+p+'Area .playerName')?.append(status);}const frozen=state?.frozen?.[p]??window.localExtraState?.['frozen'+p]??0,poison=state?.poison?.[p]??window.localExtraState?.['poison'+p]??0;status.textContent=[frozen?'凍結：このターン行動不能':'',poison?'毒 '+poison+'T':''].filter(Boolean).join(' / ');status.hidden=!frozen&&!poison;}};
 const dialog=node('dialog','startupNotice');dialog.id='startupNotice';const dismiss=node('button','startupNoticeButton');dismiss.type='button';dismiss.setAttribute('aria-label','お知らせを閉じる');dialog.append(dismiss);document.body.append(dialog);
 async function renderNotice(title,lines){return new Promise(resolve=>{dismiss.replaceChildren(node('span','startupEyebrow','PSYCHO BATTLE'),node('strong','startupNoticeTitle',title),...lines.map(s=>node('span','startupNoticeLine',s)),node('small','','タップして閉じる'));const done=()=>{dialog.close();resolve();};dismiss.onclick=done;dialog.oncancel=e=>{e.preventDefault();done();};dialog.showModal();dismiss.focus();});}
 let noticeQueue=Promise.resolve();
 function notice(title,lines){const next=noticeQueue.catch(()=>{}).then(()=>renderNotice(title,lines));noticeQueue=next;return next;}
 let startupBusy=false,started=false,pending=false;const original=window.startToMode;
 async function startupNotices(){pending=true;if(startupBusy||!started)return;startupBusy=true;try{do{pending=false;
  if(!window.economyService){const ready=await new Promise(resolve=>{const done=()=>{clearTimeout(timer);resolve(true);};const timer=setTimeout(()=>{window.removeEventListener('economy-ready',done);resolve(false);},8000);window.addEventListener('economy-ready',done,{once:true});});if(!ready){await notice('接続できませんでした',['コインの受取は次回のスタート時に再試行します。']);return;}}
  await window.gameAuth?.authStateReady();const user=window.gameAuth?.currentUser;const who=user&&!user.isAnonymous?user.uid:'guest';
  if(who!=='guest'){
   try{const result=await window.economyService.start();if(window.gameAuth?.currentUser?.uid!==who)continue;if(result.own||result.gifts.length){const grouped=new Map();for(const gift of result.gifts){const old=grouped.get(gift.from)||{name:gift.name,amount:0};old.amount+=gift.amount;grouped.set(gift.from,old);}const lines=[...(result.own?['ログインボーナスで'+result.own+'コイン獲得']:[]),...[...grouped.values()].map(g=>g.name+'さんのログインで'+g.amount+'コイン獲得'),'所持コイン '+result.balance];await notice('コイン獲得',lines);await window.economyService.acknowledge(result.receipts,who);}}
   catch(e){console.warn('コインの受取に失敗しました',e);await notice('コインを受け取れませんでした',[/permission[ _-]?denied/i.test(String(e.code||'')+' '+e.message)?'Firebaseのルールで保存が拒否されました。管理者がコイン対応ルールを公開した後、再読み込みしてください。':'通信を確認して、スタート画面から再度お試しください。']);}
  }
  const key='psy-news-seen-'+who;if(safely.get(key)!==VERSION){await notice('お知らせが更新されました。',['7種類の技追加・ブリーチ調整などの更新内容をご確認ください。']);safely.set(key,VERSION);}
 }while(pending);}finally{startupBusy=false;}}
 window.startToMode=function(){if(startupBusy||!$('openingTransition').classList.contains('finished'))return;started=true;original();return startupNotices();};
 window.addEventListener('player-login-ready',()=>{startupNotices().catch(console.warn);});
 window.AccountUI={notice,VERSION};
})();
