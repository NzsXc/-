const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launchPersistentContext(path.resolve(root,'../beam-transfer-profile'),{headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',viewport:{width:1200,height:1000}});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://timing.test/**',route=>{const file=path.join(root,new URL(route.request().url()).pathname);return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:''});});
  await page.goto('https://timing.test/battle-preview.html');await page.locator('.moveChoice').last().waitFor();await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.evaluate(()=>{
   const api=BattleEffects,transfer=api.drawGaugeTransfer;window.transfers=[];
   window.BattleEffects={...api,drawGaugeTransfer(...args){transfers.push({ms:args[1],count:args[4],start:args[5]?.start??100,flight:args[5]?.flight??550,linear:args[5]?.linear??false});return transfer(...args);}};
  });
  async function cast(index,enemy,mode='normal'){
   await page.locator('#'+mode+'Mode').click();await page.locator('.moveChoice').nth(index).click();await page.selectOption('#opponentAction',String(enemy));await page.locator('#fireSpecial').click();
  }
  for(const [index,enemy,mode,label]of [[14,1,'normal','blast-pierces'],[16,1,'normal','refund-tie'],[14,29,'normal','beam-tie'],[14,1,'special','s-blast-pierces'],[16,3,'normal','refund-loses']]){
   await cast(index,enemy,mode);await page.clock.runFor(560);
   if(process.env.PREVIEW_SCREENSHOTS)await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,label+'.png'),fullPage:true});
   await page.clock.runFor(210);
   if(process.env.PREVIEW_SCREENSHOTS&&label==='blast-pierces')await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,'blast-through-impact.png'),fullPage:true});
   await page.clock.runFor(1900);assert(!(await page.locator('#fireSpecial').isDisabled()));
   if(label.includes('tie'))assert.equal(await page.locator('#previewEnemy .hpValue').innerText(),'7 / 10');
  }
  for(const index of [9,18,16]){
   await page.evaluate(()=>transfers.length=0);await cast(index,0);await page.clock.runFor(600);
   if(index!==9){const calls=await page.evaluate(()=>transfers);assert(calls.some(c=>c.count===(index===16?3:1)&&c.start===460),'new technique uses shared Siphon packet and real clock');}
   await page.clock.runFor(2100);
  }
  for(const mode of ['normal','special'])for(const [index,enemy,count]of [[12,0,3],[13,1,5]]){
   await page.evaluate(()=>transfers.length=0);await cast(index,enemy,mode);await page.clock.runFor(600);
   const calls=await page.evaluate(()=>transfers),starts=[...new Set(calls.map(c=>c.start))];
   assert.deepEqual(starts,Array.from({length:count},(_,i)=>460+i*(count===3?50:25)));
   assert(calls.every(c=>c.flight===600&&c.linear),'local collection stays visible throughout a steady flight');
   assert.equal(starts.at(-1)+calls[0].flight-starts[0],700,'all Focus/Convert packets arrive over 0.7 seconds');
   await page.clock.runFor(2100);assert(!(await page.locator('#fireSpecial').isDisabled()));
  }
  for(const [index,enemy]of [[12,1],[13,0]]){
   await page.evaluate(()=>transfers.length=0);await cast(index,enemy);await page.clock.runFor(1400);assert.equal(await page.evaluate(()=>transfers.length),0,'failed condition produces no collection packets');
  }
  await cast(17,0);await page.clock.runFor(1400);assert(await page.locator('#fireSpecial').isDisabled(),'Venom is slower than the old compressed reveal');
  if(process.env.PREVIEW_SCREENSHOTS)await page.screenshot({path:path.join(process.env.PREVIEW_SCREENSHOTS,'venom-slow.png'),fullPage:true});
  await page.clock.runFor(1100);assert(!(await page.locator('#fireSpecial').isDisabled()));
  assert.deepEqual(errors,[]);console.log('PASS beams, shared Siphon/Drain/Refund/Focus/Convert packets, conditional collection, slow Venom, completion');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
