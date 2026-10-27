const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const root=process.cwd(),html=fs.readFileSync('index.html','utf8').replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<script\b[^>]*src="\.\/pwa-register[^>]*><\/script>/g,'');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
 try{for(const [width,height]of [[1365,900],[390,844],[320,640],[844,390]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];await page.emulateMedia({reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='layout.test')return r.abort();if(u.pathname==='/')return r.fulfill({contentType:'text/html',body:html});const f=path.resolve(root,'.'+decodeURIComponent(u.pathname));return f.startsWith(root+path.sep)&&fs.existsSync(f)?r.fulfill({path:f}):r.fulfill({status:404,body:''});});
  await page.goto('http://layout.test/');await page.waitForFunction(()=>!!window.GameMotion&&!!window.TechniquePicker);
  if(process.env.GAME_TEST_FONT_CSS){await page.addStyleTag({content:fs.readFileSync(process.env.GAME_TEST_FONT_CSS,'utf8')});await page.evaluate(()=>document.fonts.ready);}
  await page.evaluate(()=>{document.getElementById('openingTransition').remove();HTMLMediaElement.prototype.play=()=>Promise.resolve();selectMode('offline');});
  for(const classic of [false,true]){
   await page.evaluate(classic=>{rankedActive=classic;rankedMatch=classic?{you:1,roomRules:{classic:true}}:null;selectedTechniques={1:classic?[0,1,2]:[9,15,18],2:[0,1,2]};updateTechniqueDisplay();},classic);
   const bounds=await page.locator('.techCard').evaluateAll(ns=>ns.map(n=>{const body=n.querySelector('.techSlotButton'),r=n.getBoundingClientRect(),b=body.getBoundingClientRect();return{width:r.width,height:r.height,bodyWidth:b.width,bodyHeight:b.height,overflow:body.scrollWidth>body.clientWidth+1};}));
   assert(bounds.every(n=>n.bodyWidth>=n.width-3&&!n.overflow&&n.height<220&&n.bodyHeight<=n.height),JSON.stringify({width,classic,bounds}));
   const cards=await page.locator('.techCard').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{top:r.top,bottom:r.bottom};}));assert(cards.every((r,i)=>i===0||r.top>=cards[i-1].bottom),'cards never overlap');
  }
  await page.evaluate(()=>{rankedActive=false;rankedMatch=null;updateTechniqueDisplay();});await page.locator('.techSlotButton').first().click();const choices=await page.locator('#techniquePickerDialog [data-technique]').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{width:r.width,height:r.height};}));assert(choices.every(n=>n.width>=44&&n.height>=44&&n.height<=150));await page.keyboard.press('Escape');
  await page.locator('#techConfirmButton').scrollIntoViewIfNeeded();assert(await page.locator('#techConfirmButton').evaluate(n=>{const r=n.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}));await page.locator('.techSlotButton').first().scrollIntoViewIfNeeded();await page.screenshot({path:'.test-output/tech-layout-fixed-'+width+'.png'});assert.deepEqual(errors,[]);console.log('PASS full-width compact technique slots and reachable controls '+width+'x'+height);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
