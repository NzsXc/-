const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<script\b[^>]*src="\.\/pwa-register[^>]*><\/script>/g,'');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--mute-audio'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{for(const [width,height]of [[1365,900],[390,844],[320,640]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.mediaSources={};const media=AudioContext.prototype.createMediaElementSource;
   AudioContext.prototype.createMediaElementSource=function(el){mediaSources[el.id]=(mediaSources[el.id]||0)+1;return media.call(this,el);};
   const proto=CanvasRenderingContext2D.prototype,clear=proto.clearRect,move=proto.moveTo,line=proto.lineTo,stroke=proto.stroke;
   proto.clearRect=function(...a){if(this.canvas.className==='onlineMusicCanvas')this.canvas.lines=[];return clear.apply(this,a);};
   proto.moveTo=function(x,y){this._from=[x,y];return move.call(this,x,y);};proto.lineTo=function(x,y){this._to=[x,y];return line.call(this,x,y);};
   proto.stroke=function(...a){if(this.canvas.className==='onlineMusicCanvas'&&this._from&&this._to)this.canvas.lines.push({length:Math.hypot(this._to[0]-this._from[0],this._to[1]-this._from[1]),color:this.strokeStyle,width:this.lineWidth});return stroke.apply(this,a);};
  });
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='music.test')return route.abort();if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});const p=path.resolve(root,'.'+decodeURIComponent(u.pathname));return p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.fulfill({status:404,body:''});});
  await page.goto('https://music.test/');await page.evaluate(()=>{document.getElementById('openingTransition')?.remove();showScreen('onlineScreen');const b=document.createElement('button');b.id='unlockTest';b.textContent='Unlock test';b.onclick=()=>{unlockBattleSE();resumeScreenBGM();};document.body.append(b);});await page.locator('#unlockTest').click();await page.locator('#unlockTest').evaluate(n=>n.remove());
  await page.waitForFunction(()=>{const a=GameAudio.analysis(onlineMenuBGM);return a&&a.context.state==='running'&&!onlineMenuBGM.paused&&document.querySelector('.onlineMusicCanvas')?.lines?.some(s=>s.length>20);});
  const lines=()=>page.locator('.onlineMusicCanvas').evaluate(c=>c.lines);const initial=await lines();assert.equal(initial.length,112);const styles=rows=>rows.map(s=>[s.color,s.width]);
  await page.waitForTimeout(180);assert.deepEqual(styles(await lines()),styles(initial),'color/brightness/width fixed');
  const max=8+Math.pow(.5,.9)*(40+Math.min(width,height)*.11);assert((await lines()).every(s=>s.length<=max+.01),'reaction strength is 0.5');
  assert.equal(await page.evaluate(()=>GameAudio.analysis(onlineMenuBGM)===GameAudio.analysis(onlineMenuBGM)),true,'one cached analyser');
  for(const id of ['rankingScreen','friendLobbyScreen','friendRuleScreen','spectatorListScreen','audioSettingsScreen','techScreen','titlesScreen','onlineScreen']){
   await page.evaluate(id=>showScreen(id),id);assert.equal(await page.locator('.onlineMusicCanvas').count(),1);assert.equal(await page.locator('.musicReactiveBackground').getAttribute('id'),id);assert.equal(await page.locator('#'+id).evaluate(n=>getComputedStyle(n).backgroundImage),'none');assert(await page.locator('#onlineMenuBGM').evaluate(a=>!a.paused));
  }
  await page.evaluate(()=>{musicVolume.value=0;musicVolume.dispatchEvent(new Event('input'));});await page.waitForTimeout(100);assert((await lines()).every(s=>Math.abs(s.length-8)<.001),'muting gives static short lines');
  await page.evaluate(()=>{musicVolume.value=100;musicVolume.dispatchEvent(new Event('input'));});await page.waitForFunction(()=>document.querySelector('.onlineMusicCanvas').lines.some(s=>s.length>20));
  for(let i=0;i<8;i++)await page.evaluate(()=>{showScreen('modeScreen');showScreen('onlineScreen');});
  assert.equal(await page.evaluate(()=>mediaSources.onlineMenuBGM),1,'switching never duplicates media sources');assert.equal(await page.locator('.onlineMusicCanvas').count(),1);
  if(process.env.MUSIC_BACKGROUND_SCREENSHOTS){fs.mkdirSync(process.env.MUSIC_BACKGROUND_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.MUSIC_BACKGROUND_SCREENSHOTS,'online-'+width+'.png')});}
  await page.evaluate(()=>{showScreen('titlesScreen');titlePlayerName.textContent='Nz';NameStyles.apply(titlePlayerName,{color:'cyan',gloss:true});});
  assert.equal(await page.locator('#titlesScreen').evaluate(n=>getComputedStyle(n,'::before').backgroundImage),'none','title overlay must not cover the music canvas');
  const name=page.locator('#titlePlayerName');assert.equal(await name.getAttribute('data-neon-name'),'Nz');assert.equal(await name.evaluate(n=>getComputedStyle(n,'::after').animationName),'playerNeonScan');assert((await name.evaluate(n=>getComputedStyle(n).filter)).includes('drop-shadow'));assert((await name.evaluate(n=>getComputedStyle(n).backgroundImage)).includes('rgb(128, 230, 255)'));
  if(process.env.MUSIC_BACKGROUND_SCREENSHOTS)await page.screenshot({path:path.join(process.env.MUSIC_BACKGROUND_SCREENSHOTS,'neon-'+width+'.png')});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(80);assert.equal(await name.evaluate(n=>getComputedStyle(n,'::after').animationName),'none');assert((await lines()).every(s=>Math.abs(s.length-8)<.001));await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{NameStyles.apply(titlePlayerName,{color:'red',gloss:false});showScreen('battleScreen');});assert.equal(await page.locator('.onlineMusicCanvas').count(),0);assert.equal(await name.evaluate(n=>n.classList.contains('glossPlayerName')),false);
  await page.evaluate(()=>showScreen('modeScreen'));assert.equal(await page.locator('.onlineMusicCanvas').count(),0);assert.equal(await page.locator('#modeScreen .gameHomeCanvas').count(),1);
  assert.deepEqual(errors,[]);console.log('PASS '+width+': actual BGM frequency response at 0.5, stable colors/brightness, shared graph, all music screens, mute, neon and reduced motion');await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
