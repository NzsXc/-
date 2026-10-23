const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const context=await chromium.launchPersistentContext(path.resolve(root,'../ruin-collapse-profile'),{headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',viewport:{width:1200,height:1000}});
 try{
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://collapse.test/**',route=>{
   const file=path.join(root,decodeURIComponent(new URL(route.request().url()).pathname));
   return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:'Not found'});
  });
  await page.goto('https://collapse.test/battle-preview.html');await page.locator('.moveChoice').last().waitFor();await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  const snapshot=()=>page.locator('#previewEnemy').evaluate(n=>({clip:n.style.getPropertyValue('clip-path'),priority:n.style.getPropertyPriority('clip-path'),transform:n.style.transform}));
  await page.locator('#previewEnemy').evaluate(n=>n.style.setProperty('clip-path','inset(0px)','important'));
  const original=await snapshot();
  await page.locator('.moveChoice').nth(10).click();await page.locator('#fireSpecial').click();
  assert.equal(await page.locator('.ruinCardFragment').count(),12);assert.equal(await page.locator('#previewEnemy').count(),1,'copies have no duplicate IDs');
  await page.clock.runFor(340);assert.deepEqual(await snapshot(),original,'first show cracks on the intact card');
  if(process.env.PREVIEW_SCREENSHOTS)await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,'ruin-cracked.png'),fullPage:true});
  await page.clock.runFor(310);
  assert.match((await snapshot()).clip,/polygon/);
  const falling=await page.locator('.ruinCardFragment').first().evaluate(n=>({transform:n.style.transform,alpha:Number(n.style.opacity),hasArt:!!n.querySelector('img'),text:n.textContent}));
  assert.match(falling.transform,/translate/);assert(falling.alpha>0&&falling.alpha<1);assert(falling.hasArt&&falling.text.includes('相手'),'fragments carry the original card content');
  if(process.env.PREVIEW_SCREENSHOTS)await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,'ruin-falling.png'),fullPage:true});
  await page.clock.runFor(440);assert(Number(await page.locator('.ruinCardFragment').first().evaluate(n=>n.style.opacity))<.01,'falling fragments fade away');
  assert.match((await snapshot()).clip,/polygon/,'bottom stays absent until the effect completes');
  if(process.env.PREVIEW_SCREENSHOTS)await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,'ruin-vanished.png'),fullPage:true});
  await page.clock.runFor(200);assert.equal(await page.locator('.ruinCollapse').count(),0);assert.deepEqual(await snapshot(),original,'end restores clipping and priority');assert(!(await page.locator('#fireSpecial').isDisabled()));
  async function direct(own,enemy){await page.evaluate(([own,enemy])=>{
   const pool=BattleAI.techniques,basic=BattleAI.ACTIONS.slice(0,3),actions=[own,enemy].map(id=>SpecialRules.actionData(id,pool,basic));
   BattleEffects.play({layer:document.getElementById('previewEffects'),elements:[document.getElementById('previewSelf'),document.getElementById('previewEnemy')],actions,damage:[0,0]});
  },[own,enemy]);}
  for(const elapsed of [200,650]){await direct(25,0);await page.clock.runFor(elapsed);await page.evaluate(()=>BattleEffects.cancel());assert.deepEqual(await snapshot(),original);assert.equal(await page.locator('.ruinCollapse').count(),0,'cancel cleans all copies');}
  await direct(25,25);await page.clock.runFor(650);assert.equal(await page.locator('.ruinCollapse').count(),2);await page.evaluate(()=>BattleEffects.cancel());assert.deepEqual(await snapshot(),original);assert.equal(await page.locator('#previewSelf').evaluate(n=>n.style.clipPath),'');
  await direct(14,25);await page.clock.runFor(650);assert.equal(await page.locator('.ruinCollapse').count(),2,'Mirror copies S Ruin collapse');await page.evaluate(()=>BattleEffects.cancel());
  await direct(13,0);await page.clock.runFor(650);assert.equal(await page.locator('.ruinCollapse').count(),0,'normal Ruin retains its existing cracks');await page.evaluate(()=>BattleEffects.cancel());
  await page.setViewportSize({width:390,height:844});await direct(25,0);await page.clock.runFor(650);
  if(process.env.PREVIEW_SCREENSHOTS)await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,'ruin-falling-mobile.png'),fullPage:true});
  await page.clock.runFor(700);assert.deepEqual(await snapshot(),original);
  await page.emulateMedia({reducedMotion:'reduce'});await direct(25,0);assert.equal(await page.locator('.ruinCollapse').count(),0);assert.deepEqual(await snapshot(),original);await page.clock.runFor(1300);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1200,height:900});
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  await page.setContent(html);await page.addScriptTag({content:fs.readFileSync(path.join(root,'battle-effects.js'),'utf8')});
  await page.evaluate(()=>{
   document.getElementById('openingTransition')?.remove();document.querySelectorAll('.screen').forEach(n=>n.classList.toggle('active',n.id==='battleScreen'));
   const layer=document.createElement('div');layer.id='battleEffectLayer';document.getElementById('battleScreen').appendChild(layer);
   BattleEffects.play({layer,actions:[{type:'ruin',skill:'tech11',special:true},{type:'charge'}],damage:[0,0]});
  });
  await page.clock.runFor(650);assert.equal(await page.locator('.ruinCardFragment').count(),12);assert.equal(await page.locator('#hp2Text').count(),1);assert.equal(await page.locator('#player2Area').count(),1);
  assert(await page.locator('.ruinCollapse').evaluate(n=>n.inert));
  if(process.env.PREVIEW_SCREENSHOTS)await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,'ruin-actual-battle.png'),fullPage:true});
  await page.evaluate(()=>BattleEffects.cancel());assert.equal(await page.locator('#player2Area').evaluate(n=>n.style.clipPath),'');assert.equal(await page.locator('.ruinCollapse').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS Ruin cracks, real card fragments, fall/fade, completion/cancel restoration, both sides, Mirror, normal Ruin, mobile, reduced motion, actual battle DOM');
 }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
