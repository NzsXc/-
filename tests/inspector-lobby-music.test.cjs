const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<script\b[^>]*src="\.\/pwa-register[^>]*><\/script>/g,'');
const boxes=page=>page.evaluate(()=>({rects:['player1Area','player2Area','battleCenter','actions1','actions2','battleInspectorToggle'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,r.x,r.y,r.width,r.height];}),w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,scroll:scrollY}));
function stable(a,b){assert.equal(b.w,a.w);assert.equal(b.h,a.h);assert.equal(b.scroll,a.scroll);for(let i=0;i<a.rects.length;i++)for(let j=1;j<5;j++)assert(Math.abs(a.rects[i][j]-b.rects[i][j])<.2,JSON.stringify([a.rects[i],b.rects[i]]));}
async function panelFits(page){const bad=await page.locator('#battleInspectorPanel,.battle-inspector-close').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();const style=getComputedStyle(document.documentElement),safe=side=>parseFloat(style.getPropertyValue('--safe-'+side))||0;return r.left<safe('left')||r.top<safe('top')||r.right>innerWidth-safe('right')+.1||r.bottom>innerHeight-safe('bottom')+.1;}).map(n=>n.id||n.className));assert.deepEqual(bad,[]);}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
 for(const [width,height]of [[1365,900],[390,844],[320,568],[844,390]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const playing=new WeakMap();window.audioPlays={};
   Object.defineProperty(HTMLMediaElement.prototype,'paused',{get(){return !playing.get(this);}});
   HTMLMediaElement.prototype.play=function(){if(this.id==='onlineMenuBGM'&&window.rejectOnlineOnce){window.rejectOnlineOnce=false;return Promise.reject(Error('autoplay blocked'));}playing.set(this,true);window.audioPlays[this.id]=(window.audioPlays[this.id]||0)+1;return Promise.resolve();};
   HTMLMediaElement.prototype.pause=function(){playing.set(this,false);};
  });
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='lobby.test')return route.abort();if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});const p=path.resolve(root,'.'+decodeURIComponent(u.pathname));return p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.fulfill({status:404,body:''});});
  await page.goto('https://lobby.test/');await page.evaluate(()=>{document.getElementById('openingTransition')?.remove();window.rankedTransport=async()=>({match:rankedMatch});playBattleSE=()=>{};});
  await page.evaluate(({width})=>{const safe=width===390?{top:47,bottom:34}:width===844?{left:44,right:44,bottom:21}:width===320?{top:20,bottom:20}:{};for(const [side,value]of Object.entries(safe))document.documentElement.style.setProperty('--safe-'+side,value+'px');},{width});
  if(width===1365){
   const decoded=await page.evaluate(async()=>{const c=new OfflineAudioContext(1,1,44100);const b=await c.decodeAudioData(await (await fetch(document.getElementById('onlineMenuBGM').src)).arrayBuffer());return {duration:b.duration,channels:b.numberOfChannels};});assert(decoded.duration>1&&decoded.channels>0);console.log('PASS provided MP3 decodes: '+decoded.duration.toFixed(2)+'s');
  }
  await page.evaluate(()=>showScreen('modeScreen'));assert(await page.locator('#menuBGM').evaluate(n=>!n.paused));
  await page.evaluate(()=>showScreen('onlineScreen'));
  assert.equal(await page.locator('#onlineMenuBGM').getAttribute('src'),'sounds/心の詩.mp3');assert(await page.locator('#onlineMenuBGM').evaluate(n=>n.loop&&!n.paused));
  assert(await page.locator('#menuBGM').evaluate(n=>n.paused));assert(await page.locator('#battleBGM').evaluate(n=>n.paused));
  const plays=await page.evaluate(()=>audioPlays.onlineMenuBGM);await page.evaluate(()=>{resumeScreenBGM();startMenuBGM();});assert.equal(await page.evaluate(()=>audioPlays.onlineMenuBGM),plays,'interaction does not restart the lobby track');
  await page.evaluate(()=>{musicVolume.value='25';musicVolume.dispatchEvent(new Event('input'));});assert(Math.abs(await page.evaluate(()=>GameAudio.scale('music',.208))-.052)<1e-9);
  await page.evaluate(()=>{musicVolume.value='0';musicVolume.dispatchEvent(new Event('input'));});assert(await page.locator('#onlineMenuBGM').evaluate(n=>n.muted));
  await page.evaluate(()=>{musicVolume.value='100';musicVolume.dispatchEvent(new Event('input'));showScreen('rankingScreen');});assert(await page.locator('#onlineMenuBGM').evaluate(n=>!n.paused));assert(await page.locator('#menuBGM').evaluate(n=>n.paused));
  await page.evaluate(()=>{showScreen('modeScreen');window.rejectOnlineOnce=true;showScreen('onlineScreen');});assert(await page.locator('#onlineMenuBGM').evaluate(n=>n.paused));
  await page.evaluate(()=>resumeScreenBGM());assert(await page.locator('#onlineMenuBGM').evaluate(n=>!n.paused));
  for(const you of [1,2])for(const special of [false,true]){
   await page.evaluate(({you,special})=>{
    rankedStop();resetOnlineMatchState();rankedActive=true;rankedMatch=null;rankedSeenReveal=0;botMatch=false;
    const pair=x=>[null,x,x],m={id:'inspector-'+you+'-'+special,kind:'friend',rulesVersion:special?3:2,roomRules:{mode:special?'advanced':'standard',hp:10,initialGauge:8,maxGauge:10,skills:special,special},you,players:{1:{name:'プレイヤー1'},2:{name:'プレイヤー2'}},ready:{1:true,2:true},loadouts:{1:[0,7,10],2:[1,12,15]},state:{turn:4,hp:pair(8),gauge:pair(8),seal:pair(false),enhance:pair(0),momentum:pair(false),ruin:pair(0),last:pair(''),specialSeal:pair(0),specialRuin:pair(0),specialMomentum:pair(0)},closed:false,phase:'turn',revision:20000,serverNow:20000,opensAt:19000,deadline:59000,graceDeadline:89000,ownAction:null,reveal:null};
    if(special){m.special={version:3,max:30,gauge:{1:30,2:30}};m.advanced={selected:{1:'boost',2:'heal'}};m.skillWindow={startAt:15500,endAt:18500,confirmAt:19000};}
    rankedApply(m);cancelAnimationFrame(rankedFrame);rankedFrame=0;clearTimeout(rankedAutoTimer);rankedAnimating=true;stopTurnCountdownSE();document.getElementById('countdown').textContent='3';for(const p of [1,2])document.getElementById('player'+p+'Area').classList.add('locked');syncBattleInspector();
   },{you,special});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   assert(await page.locator('#onlineMenuBGM').evaluate(n=>n.paused),'lobby music stops for a battle');assert(await page.locator('#menuBGM').evaluate(n=>n.paused));
   const before=await boxes(page);assert(await page.locator('#battleInspectorToggle').isVisible(),'visible while counting');
   await page.locator('#battleInspectorToggle').click();assert(await page.locator('#battleInspectorPanel').isVisible());assert.equal(await page.locator('.battle-inspector-techniques li').count(),6);await panelFits(page);stable(before,await boxes(page));
   for(const digit of ['2','1','BATTLE!']){await page.evaluate(d=>{document.getElementById('countdown').textContent=d;syncBattleInspector();},digit);assert(await page.locator('#battleInspectorPanel').isVisible());stable(before,await boxes(page));}
   await page.evaluate(()=>{showTechniqueReveal(player1Techs[0],player2Techs[0]);document.querySelector('.battle-inspector-columns').scrollTop=10000;});assert(await page.locator('#battleInspectorPanel').isVisible(),'reveal keeps equipped-technique details open');await panelFits(page);stable(before,await boxes(page));
   if(width===1365&&you===1&&!special){
    const unchanged=await page.evaluate(()=>({selected:JSON.stringify(selectedAction),deadline:rankedTurnDeadline}));
    await page.evaluate(()=>{BattleCountdown.start('inspector-test',{show(d){document.getElementById('countdown').textContent=String(d);syncBattleInspector();},onComplete(){document.getElementById('countdown').textContent='BATTLE!';window.inspectorClockCompleted=true;}});});
    await page.waitForFunction(()=>window.inspectorClockCompleted===true);assert(await page.locator('#battleInspectorPanel').isVisible(),'clock continues behind the read-only panel');assert.deepEqual(await page.evaluate(()=>({selected:JSON.stringify(selectedAction),deadline:rankedTurnDeadline})),unchanged);
   }
   if(process.env.INSPECTOR_SCREENSHOTS&&you===1&&!special){fs.mkdirSync(process.env.INSPECTOR_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.INSPECTOR_SCREENSHOTS,'inspector-'+width+'.png')});}
   await page.getByRole('button',{name:'閉じる',exact:true}).click();assert(await page.locator('#battleInspectorPanel').isHidden());stable(before,await boxes(page));
   await page.locator('#battleInspectorToggle').click();await page.keyboard.press('Escape');assert(await page.locator('#battleInspectorPanel').isHidden());
   await page.evaluate(()=>showBattleResult('1P WIN'));assert(await page.locator('#battleInspectorToggle').isHidden());
  }
  // Legacy rooms, bot matches and same-device battles also keep the reader available.
  await page.evaluate(()=>{rankedStop();gameMode='online';window.onlineBattle={localPlayer:2};onlineInputOpen=false;onlineTurnPhase='countdown';document.getElementById('resultMessage').className='';showScreen('battleScreen');syncBattleInspector();});assert(await page.locator('#battleInspectorToggle').isVisible());
  await page.locator('#battleInspectorToggle').click();await page.evaluate(()=>{onlineTurnPhase='resolving';syncBattleInspector();});assert(await page.locator('#battleInspectorPanel').isVisible());await page.keyboard.press('Escape');
  for(const bot of [false,true]){await page.evaluate(bot=>{gameMode='offline';botMatch=bot;showScreen('battleScreen');syncBattleInspector();},bot);await page.locator('#battleInspectorToggle').click();assert.match(await page.locator('.battle-inspector-player h3').first().innerText(),bot?/自分/:/1P/);await page.keyboard.press('Escape');}
  await page.evaluate(()=>showScreen('modeScreen'));assert(await page.locator('#battleInspectorPanel').isHidden());assert(await page.locator('#onlineMenuBGM').evaluate(n=>n.paused));
  assert.deepEqual(errors,[]);console.log('PASS '+width+'x'+height+': countdown/reveal inspector, stable arena, scrollable panel, both perspectives and online music routing/autoplay/volume');await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
