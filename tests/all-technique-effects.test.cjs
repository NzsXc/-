const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launchPersistentContext(path.resolve(root,'../all-effects-profile'),{headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',viewport:{width:1365,height:1050}});
 try{
  const page=await browser.newPage(),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.route('https://effects.test/**',route=>{const file=path.join(root,decodeURIComponent(new URL(route.request().url()).pathname));return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:'missing'});});
  await page.goto(process.env.PREVIEW_TEST_URL||'https://effects.test/battle-preview.html');await page.locator('.moveChoice').last().waitFor();await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  assert.equal(await page.locator('.moveChoice').count(),19);assert.equal(await page.locator('#opponentAction option').count(),41);
  for(const mode of ['normal','special']){
   await page.locator('#'+mode+'Mode').click();
   for(let i=0;i<19;i++){
    await page.locator('.moveChoice').nth(i).click();await page.selectOption('#opponentAction',String(i===1||i===13?1:i===16?2:0));
    const name=await page.locator('#moveTitle').innerText();assert.equal(name.startsWith('S'),mode==='special');
    await page.locator('#fireSpecial').click();await page.clock.runFor(650);
    assert.deepEqual(errors,[],name+' paints without errors');
    if(process.env.PREVIEW_SCREENSHOTS&&[2,14,15,16,18].includes(i))await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,mode+'-tech-'+i+'.png'),fullPage:true});
    await page.clock.runFor(1900);assert(!(await page.locator('#fireSpecial').isDisabled()));assert.equal(await page.locator('canvas').count(),0);
    if(i===12)assert.equal(await page.locator('#previewSelf .gaugeValue').innerText(),'5 / 10');
    if(i===13)assert.equal(await page.locator('#previewSelf .gaugeValue').innerText(),'6 / 10');
    if(i===14)assert.equal(await page.locator('#previewEnemy .hpValue').innerText(),'4 / 10');
    if(i===15)assert.match(await page.locator('#previewEnemy .previewCardStatus').innerText(),/凍結/);
    if(i===16)assert.equal(await page.locator('#previewEnemy .hpValue').innerText(),'6 / 10');
    if(i===17)assert.equal(await page.locator('#previewEnemy .previewCardStatus').innerText(),'毒 2T');
    if(i===18)assert.equal(await page.locator('#previewSelf .gaugeValue').innerText(),'9 / 10');
    if(i>=12&&mode==='special'){assert.match(await page.locator('#moveDescription').innerText(),/演出プレビュー/);assert.equal(await page.locator('#previewSelf .sValue').innerText(),'30 / 30');}
    console.log('PASS '+name);
   }
  }
  for(const i of [0,1,2]){await page.locator('#previewBasics button').nth(i).click();await page.locator('#fireSpecial').click();await page.clock.runFor(1300);assert(!(await page.locator('#fireSpecial').isDisabled()));}
  for(const [i,enemy]of [[12,1],[13,0],[18,2],[16,7],[14,1],[18,14]]){
   await page.locator('#normalMode').click();await page.locator('.moveChoice').nth(i).click();await page.selectOption('#opponentAction',String(enemy));await page.locator('#fireSpecial').click();await page.clock.runFor(2600);
   if(i===12)assert.equal(await page.locator('#previewSelf .gaugeValue').innerText(),'2 / 10','Focus fails when hit');
   if(i===13)assert.equal(await page.locator('#previewSelf .gaugeValue').innerText(),'1 / 10','Convert fails without a hit');
   if(i===18&&enemy===2)assert.equal(await page.locator('#previewSelf .gaugeValue').innerText(),'8 / 10','blocked Drain gains nothing');
   if(i===16)assert.equal(await page.locator('#previewEnemy .hpValue').innerText(),'7 / 10','Foresight blocks Refund');
  }
  await page.locator('#specialMode').click();await page.locator('.moveChoice').nth(10).click();await page.selectOption('#opponentAction','0');await page.selectOption('#playbackRate','0.5');await page.locator('#fireSpecial').click();await page.clock.runFor(1300);assert(await page.locator('#fireSpecial').isDisabled(),'half speed lasts longer');await page.clock.runFor(2500);assert(!(await page.locator('#fireSpecial').isDisabled()));
  await page.selectOption('#playbackRate','1');
  for(const [width,height]of [[1365,1050],[390,844],[320,640],[844,390]]){
   await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow '+width);
   await page.locator('.moveChoice').nth(14).click();await page.locator('#fireSpecial').click();await page.clock.runFor(650);
   if(process.env.PREVIEW_SCREENSHOTS)await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,'all-techniques-'+width+'.png'),fullPage:true});
   await page.clock.runFor(650);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#fireSpecial').click();await page.clock.runFor(1300);assert(!(await page.locator('#fireSpecial').isDisabled()));
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.equal(await page.evaluate(()=>localStorage.length),0);assert(await page.locator('#moveLibrary img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0)));
  console.log('PASS 38 technique effects, 3 basics, conditions, Mirror/clash, slow playback, mobile/landscape, reduced motion, images, no data writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
