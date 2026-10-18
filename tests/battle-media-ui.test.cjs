const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const audioCode=html.slice(html.indexOf('let battleSEUnlocked='),html.indexOf('function playUISound('));
const countdownCode=html.slice(html.indexOf('function startTurnCountdownSE('),html.indexOf('/* =========================',html.indexOf('function stopTurnCountdownSE(')));
const revealCode=html.slice(html.indexOf('function showTechniqueReveal('),html.indexOf('function clearOnlineTechniqueDescription('));
const tags=html.match(/<div id="battleSEAudio"[\s\S]*?<\/div>/)?.[0]||Array.from(html.matchAll(/<audio id="(?:se\w+|turnCountdownSE|ui\w+)"[\s\S]*?<\/audio>/g),m=>m[0]).join('');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=user-gesture-required'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://battle.test/**',route=>{const relative=decodeURIComponent(new URL(route.request().url()).pathname).slice(1);if(relative.startsWith('sounds/')&&!relative.includes('..'))return route.fulfill({contentType:'audio/mpeg',body:fs.readFileSync(path.join(root,relative))});return route.fulfill({contentType:'text/html',body:'<button id="activate">音声を有効化</button><div id="battleScreen"><div id="resultMessage"></div><div id="countdown"></div><div id="battleEffectLayer"></div></div><div id="battleSEAudio">'+tags+'</div>'});});
  await page.goto('https://battle.test/');
  await page.addScriptTag({content:audioCode+'\n'+countdownCode+'\n'+revealCode+'\nconst ONLINE_REVEAL_MS=1300;let selectedAction={};function getBattlePlayerName(p){return p+"P";}document.getElementById("activate").onclick=unlockBattleSE;'});
  await page.click('#activate');
  const files=await page.evaluate(async()=>{
   const out=[];
   for(const el of document.querySelectorAll('#battleSEAudio audio')){
    const buffer=await loadBattleSEBuffer(el);let peak=0,first=-1;
    for(let c=0;c<buffer.numberOfChannels;c++){const data=buffer.getChannelData(c);for(let i=0;i<data.length;i++){const value=Math.abs(data[i]);peak=Math.max(peak,value);if(value>.002&&(first<0||i<first))first=i;}}
    out.push({id:el.id,seconds:buffer.duration,peak,firstAudible:first/buffer.sampleRate});
   }
   return out;
  });
  assert.equal(files.length,23);for(const file of files){assert(file.seconds>0,file.id);assert(file.peak>.002,file.id+': non-silent audio');}
  await page.evaluate(()=>startTurnCountdownSE());await page.waitForFunction(()=>countdownSESource?.loop===true);
  await page.evaluate(()=>{const analyser=battleSEContext.createAnalyser(),silent=battleSEContext.createGain();silent.gain.value=0;countdownSESource.connect(analyser);analyser.connect(silent);silent.connect(battleSEContext.destination);window.probe=analyser;});
  await page.waitForFunction(()=>{const data=new Float32Array(window.probe.fftSize);window.probe.getFloatTimeDomainData(data);return data.some(x=>Math.abs(x)>.002);},{},{timeout:5000});
  await page.evaluate(()=>stopTurnCountdownSE());assert.equal(await page.evaluate(()=>countdownSESource),null);
  // Exercise the real ranked scheduler and real technique labels on a late peer.
  await page.clock.install({time:new Date('2026-10-18T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-18T00:00:01Z'));
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'ranked-client.js'),'utf8')});
  await page.evaluate(()=>{
   window.basicActions={charge:{name:'チャージ',type:'charge'},attack:{name:'アタック',type:'attack'},block:{name:'ブロック',type:'block'}};window.techniquePool=[];window.locked={};window.events=[];
   rankedActive=true;rankedClockStart=()=>{};rankedSyncTurnClock=()=>{};
   window.playBattleSituationSE=()=>{};window.playBattleEffect=()=>{window.events.push('effect');document.getElementById('battleEffectLayer').replaceChildren();};
   rankedReveal({id:'late',serverNow:5000,opensAt:6100,reveal:{turn:1,startedAt:0,countdownEndsAt:3000,actions:{1:1,2:2}}});
  });
  await page.clock.runFor(1);
  await page.waitForSelector('.battleActionLabel.p1');assert.equal(await page.locator('.battleActionLabel').count(),2);
  assert.match(await page.locator('.battleActionLabel.p1').textContent(),/アタック/);assert.match(await page.locator('.battleActionLabel.p2').textContent(),/ブロック/);
  await page.clock.runFor(1298);assert.equal(await page.locator('.battleActionLabel').count(),2);assert.deepEqual(await page.evaluate(()=>window.events),[]);
  await page.clock.runFor(1);assert.deepEqual(await page.evaluate(()=>window.events),['effect']);assert.equal(await page.locator('.battleActionLabel').count(),0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify(files));console.log('PASS: 23 real MP3 elements decode, countdown emits nonzero PCM, 390px late peer shows both technique names for the reveal interval');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
