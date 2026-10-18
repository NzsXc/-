const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),html=read('index.html'),ranked=read('ranked-client.js');
const css=Array.from(html.matchAll(/<link[^>]+href="([^"]+\.css)(?:\?[^"]*)?"[^>]*>/g),match=>match[1]).filter(file=>file!=='neon-controls.css').map(read).join('\n');
const fixture=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,'').replace('</head>','<style>'+css+'</style></head>');
const start=ranked.slice(0,ranked.indexOf('async function rankedPoll(')),stop=ranked.slice(ranked.indexOf('function rankedStop(){'),ranked.indexOf('async function rankedLeave('));
const commands='.onlineMainButton,.onlineBackButton,.tipBackButton,.friendRuleCancel,.titles-button,.historyButton,#techConfirmButton,#battleHomeButton';
const geometry=page=>page.locator('.screen.active').evaluate((screen,selector)=>Array.from(screen.querySelectorAll(selector),node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return [node.id,node.textContent,r.x,r.y,r.width,r.height,s.padding,s.fontSize,s.position];}),commands);
(async()=>{
 const browser=await chromium.launch({headless:true,timeout:12000,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const [width,height]of [[1365,900],[390,844],[320,640]]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.clock.install({time:new Date('2026-10-18T00:00:00Z')});await page.clock.pauseAt(new Date('2026-10-18T00:00:01Z'));
   await page.setContent(fixture);await page.evaluate(()=>document.getElementById('openingTransition')?.remove());
   await page.addScriptTag({content:`
    let gameMode=null;window.loggedInPlayerData={name:'Tester'};window.applied=[];window.polled=[];window.mode='waiting';window.commands=[];
    function showScreen(id){document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('active',screen.id===id));}
    function stopBot(){}function resetOnlineMatchState(){}function rankedVisualStop(){}
    function rankedApply(match){window.applied.push({...match,appliedAt:performance.now()});showScreen('techScreen');}
    function rankedPoll(epoch){window.polled.push(epoch);}
    function makeMatch(){return {id:'match',phase:window.mode==='live'?'turn':'select',serverNow:Date.now(),deadline:Date.now()+60000};}
    window.rankedTransport=async data=>{window.commands.push(data.op);if(window.mode==='error')throw Error('offline');if(data.op==='cancel')return window.mode==='cancel-race'?{match:makeMatch()}:{};if(data.op==='queue')return window.mode==='waiting'?{}:{match:makeMatch()};return ['queue','waiting','cancel-race'].includes(window.mode)?{}:{match:makeMatch()};};
    ${start}
    ${stop}
    window.testStart=()=>{window.startFlight=startRanked(window.mode==='live');};
    window.testStop=()=>rankedStop();
    document.getElementById('randomMatchButton').onclick=window.testStart;
    window.confirmTimes=[];new MutationObserver(()=>{if(document.getElementById('onlineScreen').dataset.searchPhase==='matched')window.confirmTimes.push(performance.now());}).observe(document.getElementById('onlineScreen'),{attributes:true,attributeFilter:['data-search-phase']});
   `});
   const screens=['friendLobbyScreen','friendRuleScreen','soloScreen','tipScreen','rankingScreen','playerCardScreen','techScreen'];
   const before={};for(const id of screens){await page.evaluate(id=>showScreen(id),id);before[id]=await geometry(page);}
   await page.addStyleTag({content:read('neon-controls.css')});
   for(const id of screens){await page.evaluate(id=>showScreen(id),id);assert.deepEqual(await geometry(page),before[id],id+': command sizes, padding and position must not change');}
   await page.evaluate(()=>showScreen('onlineScreen'));
   const layout=()=>page.locator('#onlineScreen .onlineMenu,#friendMatchButton,.onlineSubRow').evaluateAll(elements=>elements.map(node=>{const r=node.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
   const idle=await layout();await page.click('#randomMatchButton');await page.clock.runFor(1);
   assert.equal(await page.locator('#randomSearchCancel').isVisible(),true,JSON.stringify(await page.evaluate(()=>({phase:document.getElementById('onlineScreen').dataset.searchPhase,feedback:document.getElementById('randomSearchFeedback').textContent,status:document.getElementById('randomSearchStatus').textContent,commands:window.commands}))));assert.equal(await page.locator('.matchDot').count(),3);
   const orbit=await page.locator('.matchSpinner').evaluate(element=>{const animation=element.querySelector('.matchOrbit').getAnimations()[0];animation.pause();const box=element.getBoundingClientRect();const radii=[0,275,550,825,1100].flatMap(time=>{animation.currentTime=time;return Array.from(element.querySelectorAll('.matchDot'),dot=>{const r=dot.getBoundingClientRect();return Math.hypot(r.x+r.width/2-box.x-box.width/2,r.y+r.height/2-box.y-box.height/2);});});animation.play();return {radii,sizes:Array.from(element.querySelectorAll('.matchDot'),dot=>getComputedStyle(dot).width)};});
   assert.deepEqual(orbit.sizes,['7px','5px','3px']);assert(orbit.radii.every(radius=>Math.abs(radius-16)<.01));assert.deepEqual(await layout(),idle,'search keeps the layout stable');
   if(process.env.NEON_SCREENSHOTS&&width===390)await page.screenshot({path:path.join(process.env.NEON_SCREENSHOTS,'neon-search-mobile.png'),fullPage:true});
   await page.click('#randomSearchCancel');await page.clock.runFor(1400);
   assert.equal(await page.locator('#randomMatchButton').isVisible(),true);assert.equal(await page.locator('#randomSearchFeedback').textContent(),'検索をキャンセルしました');assert.deepEqual(await page.evaluate(()=>window.applied),[]);
   await page.evaluate(()=>window.mode='queue');await page.click('#randomMatchButton');await page.clock.runFor(1500);
   assert.equal(await page.locator('#randomSearchStatus').textContent(),'マッチングしました。');assert.equal(await page.locator('#randomSearchSpinner').isVisible(),false);assert.equal(await page.locator('#randomSearchCancel').isVisible(),false);assert.deepEqual(await layout(),idle);
   const remaining=await page.evaluate(()=>1000-(performance.now()-window.confirmTimes.at(-1)));
   await page.clock.runFor(remaining-1);assert.equal(await page.locator('#onlineScreen').evaluate(node=>node.classList.contains('active')),true);
   await page.clock.runFor(1);assert.equal(await page.evaluate(()=>window.applied.length),1);assert.equal(await page.evaluate(()=>window.polled.length),1);
   const match=await page.evaluate(()=>window.applied[0]);assert.equal(match.deadline-match.serverNow,59000,'the one-second display never extends the server deadline');
   await page.evaluate(()=>{window.testStop();showScreen('onlineScreen');window.mode='immediate';});
   await page.click('#randomMatchButton');await page.clock.runFor(450);assert.equal(await page.locator('#randomSearchStatus').textContent(),'マッチングしました。');
   await page.evaluate(()=>window.testStop());await page.clock.runFor(1500);assert.equal(await page.evaluate(()=>window.applied.length),1,'an invalidated confirmation must not enter a match');
   await page.evaluate(()=>{window.mode='error';showScreen('onlineScreen');});await page.click('#randomMatchButton');await page.clock.runFor(450);
   assert.match(await page.locator('#randomSearchFeedback').textContent(),/offline/);assert.equal(await page.locator('#friendMatchButton').isEnabled(),true);
   await page.evaluate(()=>{window.mode='live';window.testStart();});await page.clock.runFor(450);assert.equal(await page.evaluate(()=>window.applied.length),2,'live reconnects skip the confirmation');
   await page.evaluate(()=>{window.testStop();showScreen('battleScreen');document.getElementById('player1Area').classList.add('locked');document.querySelector('#player1Area .action').classList.add('confirmed-selected');});
   const selected=page.locator('#player1Area .confirmed-selected');
   assert.equal(await selected.evaluate(node=>getComputedStyle(node,'::after').content),'""');assert.equal(await selected.evaluate(node=>getComputedStyle(node,'::after').animationName),'actionEdgeOrbit');
   const action=page.locator('#player1Area .action').first(),box=await action.boundingBox();await action.evaluate(node=>node.classList.remove('confirmed-selected'));assert.deepEqual(await action.boundingBox(),box);
   await action.evaluate(node=>node.classList.add('confirmed-selected'));assert.deepEqual(await selected.boundingBox(),box);
   await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await selected.evaluate(node=>getComputedStyle(node,'::after').animationName),'none');
   assert.deepEqual(errors,[]);console.log('PASS '+width+'x'+height+': command geometry, fixed three-dot orbit, cancellation/errors, exact confirmation, stale-epoch stop, resume and selected edge');await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
