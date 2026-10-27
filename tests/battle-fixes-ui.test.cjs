const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<script\b[^>]*src="\.\/pwa-register[^>]*><\/script>/g,'');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
 try{
  for(const [width,height]of [[1365,900],[768,1024],[540,720],[390,844],[844,390]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    const playing=new WeakMap();window.testMusicCalls={};window.testMusicPending=[];
    Object.defineProperty(HTMLMediaElement.prototype,'paused',{get(){return !playing.get(this);},configurable:true});
    HTMLMediaElement.prototype.pause=function(){playing.set(this,false);};
    HTMLMediaElement.prototype.play=function(){testMusicCalls[this.id]=(testMusicCalls[this.id]||0)+1;if(window.deferTestMusic)return new Promise(resolve=>{testMusicPending.push(()=>{playing.set(this,true);resolve();});});playing.set(this,true);return Promise.resolve();};
   });
   await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='fixes.test')return r.abort();if(u.pathname==='/')return r.fulfill({contentType:'text/html',body:html});const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));return file.startsWith(root+path.sep)&&fs.existsSync(file)?r.fulfill({path:file}):r.fulfill({status:404,body:''});});
   await page.goto('http://fixes.test/');await page.waitForFunction(()=>window.AdvancedSkills&&window.TechniquePicker&&window.AccountUI);
   await page.evaluate(()=>document.getElementById('openingTransition')?.remove());
   for(const draft of [false,true]){
    await page.evaluate(draft=>{
     rankedStop();rankedActive=true;rankedMatch=null;rankedSending=false;gameMode='ranked';const now=Date.now();
     const m={id:'selection-'+draft,you:1,phase:'select',kind:'friend',roomRules:{mode:'custom',hp:10,initialGauge:8,maxGauge:10,skills:true,...(draft?{draft:true}:{})},advanced:{selected:{}},serverNow:now,revision:now,deadline:now+60000,graceDeadline:now+90000,ready:{},players:{1:{name:'P1'},2:{name:'P2'}},loadouts:{},closed:false,state:null};
     if(draft)m.draft={first:1,startedAt:now,picks:Object.fromEntries([0,1,2,3,4,5].map(i=>[i,{tech:i,at:now,automatic:false}]))};
     rankedApply(m);cancelAnimationFrame(rankedFrame);rankedFrame=0;
    },draft);
    const rects=await page.locator('.techSelect>.techCard,.techSelect>#techConfirmButton').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{id:n.id,x:r.x,y:r.y,bottom:r.bottom,width:r.width};}));
    assert.equal(rects.length,5);for(let i=1;i<rects.length;i++){assert(rects[i].y>=rects[i-1].bottom,'confirmation/skill follow every technique '+JSON.stringify({width,draft,rects}));assert(Math.abs(rects[i].x-rects[0].x)<1);}
    await page.locator('#techConfirmButton').scrollIntoViewIfNeeded();assert(await page.locator('#techConfirmButton').isVisible());
   }
   await page.evaluate(()=>{rankedStop();showHelpPage(1);showScreen('helpScreen');});
   await page.locator('[data-topic="1"]').click();assert(await page.locator('#helpCoinArticle').isVisible());assert(await page.locator('#helpArticle').isHidden());
   assert.match(await page.locator('#helpCoinArticle').innerText(),/設定HPが10以上/);assert.match(await page.locator('#helpCoinArticle').innerText(),/200コイン/);
   await page.locator('#helpContentsBack').scrollIntoViewIfNeeded();await page.locator('#helpContentsBack').click();assert(await page.locator('#helpCoinArticle').isHidden());
   await page.locator('[data-topic="0"]').click();assert(await page.locator('#helpArticle').isVisible());assert(await page.locator('#helpCoinArticle').isHidden());
   // Browser play() may resolve after the user leaves a screen.
   await page.evaluate(()=>{showScreen('modeScreen');for(const id of ['menuBGM','onlineMenuBGM','battleBGM'])document.getElementById(id).pause();window.deferTestMusic=true;window.testMusicCalls={};syncBattleBGM('modeScreen');for(let i=0;i<10;i++)resumeScreenBGM();});
   assert.equal(await page.evaluate(()=>testMusicCalls.menuBGM),1,'pending autoplay retries are coalesced');
   await page.evaluate(async()=>{showScreen('onlineScreen');showScreen('modeScreen');showScreen('onlineScreen');for(const resolve of testMusicPending.splice(0))resolve();await Promise.resolve();await Promise.resolve();});
   const playing=await page.evaluate(()=>['menuBGM','onlineMenuBGM','battleBGM'].filter(id=>!document.getElementById(id).paused));assert.deepEqual(playing,['onlineMenuBGM'],'old play promises cannot revive a background track');
   await page.evaluate(async()=>{showScreen('modeScreen');for(const resolve of testMusicPending.splice(0))resolve();await Promise.resolve();});
   assert.deepEqual(await page.evaluate(()=>['menuBGM','onlineMenuBGM','battleBGM'].filter(id=>!document.getElementById(id).paused)),['menuBGM']);
   assert.deepEqual(errors,[]);console.log('PASS '+width+'x'+height+': skills/draft confirm below all cards, coin help navigation, delayed BGM races and deduplicated retries');await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
