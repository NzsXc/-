const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launchPersistentContext(process.env.PREVIEW_TEST_PROFILE||path.join(root,'..','preview-test-profile'),{
  headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',viewport:{width:1365,height:1000}
 });
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://preview.test/**',async route=>{
   const file=path.resolve(root,'.'+new URL(route.request().url()).pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'Not found'});
   await route.fulfill({path:file});
  });
  await page.goto('https://preview.test/battle-preview.html');
  await page.locator('.moveChoice').last().waitFor();
  assert.equal(await page.locator('.moveChoice').count(),19);assert.equal(await page.locator('#opponentAction option').count(),41);
  for(let i=0;i<12;i++){
   await page.locator('.moveChoice').nth(i).click();
   await page.selectOption('#opponentAction',String(i===1?1:i===11?15:0));
   const name=await page.locator('#moveTitle').innerText();
   await page.locator('#fireSpecial').click();
   assert(await page.locator('#fireSpecial').isDisabled());assert.equal(await page.locator('canvas').count(),1);
   await page.waitForFunction(()=>!document.getElementById('fireSpecial').disabled);
   assert.equal(await page.locator('canvas').count(),0);
   assert.match(await page.locator('#previewStatus').innerText(),/もう一度試せます/);
   if(i===0)assert.equal(await page.locator('#previewEnemy .hpValue').innerText(),'5 / 10');
   if(i===1)assert.equal(await page.locator('#previewEnemy .hpValue').innerText(),'5 / 10');
   if(i===3)assert.equal(await page.locator('#previewSelf .hpValue').innerText(),'9 / 10');
   console.log('PASS card cast '+name);
  }
  await page.locator('.moveChoice').first().click();await page.selectOption('#opponentAction','2');
  await page.locator('#replaySpecial').click();await page.waitForFunction(()=>!document.getElementById('fireSpecial').disabled);
  assert.equal(await page.locator('#previewEnemy .hpValue').innerText(),'5 / 10','Breach preview uses real piercing calculation');
  for(const [width,height]of [[1365,1000],[390,844],[320,640],[844,390]]){
   await page.setViewportSize({width,height});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow '+width);
   for(const id of ['fireSpecial','previewSelf','previewEnemy']){
    const b=await page.locator('#'+id).boundingBox(),a=await page.locator('#previewArena').boundingBox();
    assert(b.x>=a.x&&b.x+b.width<=a.x+a.width+1,'card fits arena '+width);
   }
   await page.locator('#fireSpecial').scrollIntoViewIfNeeded();
   if(process.env.PREVIEW_SCREENSHOTS){await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,'battle-preview-'+width+'.png'),fullPage:true});}
  }
  const art=await page.locator('#fireSpecial img').boundingBox(),card=await page.locator('#fireSpecial').boundingBox();
  assert(art.width<=card.width&&art.height<=card.height,'action art fits the card');
  await page.setViewportSize({width:1365,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#fireSpecial').click();
  if(process.env.PREVIEW_SCREENSHOTS)await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,'battle-preview-effect.png'),fullPage:true});
  assert.equal(await page.locator('canvas').count(),1);await page.waitForFunction(()=>!document.getElementById('fireSpecial').disabled);
  assert.equal(await page.locator('canvas').count(),0,'reduced motion cleans up');
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.length),0,'preview does not write player data');
  console.log('PASS repeat, piercing, reduced motion, desktop/mobile/landscape layout, no player-data writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
