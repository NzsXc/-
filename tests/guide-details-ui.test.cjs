const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<script\b[^>]*src="\.\/pwa-register[^>]*><\/script>/g,'');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
 for(const [width,height]of [[1365,900],[390,844],[320,640],[844,390]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.error('BROWSER',m.text());});
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='guide.test')return route.abort();if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));return file.startsWith(root+path.sep)&&fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});});
  await page.goto('http://guide.test/');await page.waitForFunction(()=>!!window.GuideDetails);
  if(process.env.GUIDE_TEST_FONT_CSS){await page.addStyleTag({content:fs.readFileSync(process.env.GUIDE_TEST_FONT_CSS,'utf8')});await page.evaluate(()=>document.fonts.ready);}
  await page.evaluate(()=>{
   document.getElementById('openingTransition').remove();HTMLMediaElement.prototype.play=()=>Promise.resolve();showHelpPage(2);showScreen('helpScreen');
   const state={uid:'p1',canVote:true,connected:true,loaded:Object.fromEntries(Object.keys(CommunityRatingCore.categories).map(c=>[c,true])),errors:{},ballots:{basics:{p1:{charge:6}},techniques:{p1:{tech1:10},p2:{tech1:8}},specialTechniques:{},skills:{}}};
   window.voteTest={state,listeners:[],emit(){this.listeners.forEach(fn=>fn(structuredClone(state)));}};
   window.communityRatings={watch(fn){voteTest.listeners.push(fn);fn(structuredClone(state));return()=>{};},async save(category,values){state.ballots[category][state.uid]=values;voteTest.emit();},retry(){voteTest.emit();}};
   window.testBaseline=JSON.stringify({hp,gauge,seal:blockSeal,storage:JSON.stringify(localStorage)});
  });
  async function open(id){await page.evaluate(id=>GuideDetails.open(id),id);await page.waitForFunction(()=>!document.querySelector('.guideDetailDemo>.guideDetailButton').disabled);}
  await page.locator('#guideTechniques [data-detail="tech1"]').click();await page.waitForFunction(()=>!document.querySelector('.guideDetailDemo>.guideDetailButton').disabled);
  assert.equal(await page.locator('[data-rating=vote] .guideDetailScore').innerText(),'9.00');
  assert.equal(await page.locator('[data-rating=owner] .guideDetailScore').innerText(),'—');
  await page.evaluate(()=>{voteTest.state.ballots.techniques.p2.tech1=4;voteTest.emit();});assert.equal(await page.locator('[data-rating=vote] .guideDetailScore').innerText(),'7.00','live vote changes update an already-open detail');
  await page.locator('.guideDetailCopy>.guideDetailButton').click();assert(await page.locator('#guideVoteDialog').isVisible());await page.getByLabel('ブリーチの評価',{exact:true}).selectOption('6');await page.locator('#guideVoteDialog [type=submit]').click();assert.equal(await page.locator('[data-rating=vote] .guideDetailScore').innerText(),'5.00');
  await page.locator('.guideDetailClose').click();
  if(width===1365&&!process.env.GUIDE_UI_QUICK){
   const ids=await page.evaluate(()=>GuideDetails.items.map(a=>a.id));
   for(const id of ids){await open(id);const f=page.frameLocator('.guideDetailStage iframe');await f.locator('#player1Area').waitFor();await page.locator('.guideDetailSceneTabs button').last().click();await page.waitForTimeout(30);assert(!errors.length,id+': '+errors.join(';'));await page.locator('.guideDetailClose').click();}
   console.log('PASS all 47 details and both scenario preparations');
   for(const [id,index]of [['tech1',0],['tech16',0],['tech18',0],['s-tech14',0],['s-tech19',1],['boost',0],['heal',1],['chain',0],['cleanse',0],['invincible',0],['stance',0]]){
    await open(id);if(index)await page.locator('.guideDetailSceneTabs button').nth(index).click();await page.locator('.guideDetailDemo>.guideDetailButton').click();await page.waitForFunction(()=>!document.querySelector('.guideDetailDemo>.guideDetailButton').disabled,{},{timeout:20000});assert.match(await page.locator('.guideDetailReplayStatus').innerText(),/CP1 HP/);await page.locator('.guideDetailClose').click();console.log('PASS actual battle animation '+id+' scene '+index);
   }
  }
  await open('s-tech14');
  const bounds=await page.locator('#guideDetailDialog').evaluate(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:n.scrollWidth>n.clientWidth+1};});assert(bounds.left>=0&&bounds.right<=width&&bounds.top>=0&&bounds.bottom<=height&&!bounds.overflow,JSON.stringify(bounds));
  await page.locator('.guideDetailDemo').scrollIntoViewIfNeeded();fs.mkdirSync(path.join(root,'.test-output'),{recursive:true});await page.screenshot({path:path.join(root,'.test-output','guide-detail-'+width+'.png')});
  await page.locator('.guideDetailDemo>.guideDetailButton').click();await page.keyboard.press('Escape');assert(!(await page.locator('#guideDetailDialog').isVisible()));await open('charge');assert.equal(await page.locator('.guideDetailCopy>.guideDetailButton').isVisible(),false);assert.equal(await page.locator('[data-rating=vote]').isVisible(),false);await page.keyboard.press('Escape');
  await open('tech1');await page.locator('.guideDetailCopy>.guideDetailButton').click();await page.evaluate(()=>showScreen('modeScreen'));assert.equal(await page.locator('#guideDetailDialog[open],#guideVoteDialog[open]').count(),0,'screen changes close nested guide dialogs');assert.equal(await page.locator('.guideDetailStage iframe').count(),0,'screen changes stop and remove the replay');await page.getByRole('button',{name:'設定',exact:true}).click();assert(await page.locator('#audioSettingsScreen').isVisible(),'the new screen accepts input');
  assert.equal(await page.evaluate(()=>JSON.stringify({hp,gauge,seal:blockSeal,storage:JSON.stringify(localStorage)})),await page.evaluate(()=>testBaseline),'replays never alter the real match or player storage');
  assert.deepEqual(errors,[]);console.log('PASS '+width+'x'+height+': responsive details, separate human scores, live votes, nested voting, replay cancellation and match isolation');await page.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
