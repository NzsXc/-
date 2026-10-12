const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const css=['titles.css','titles-design.css','player-profile.css','tournament-preview.css','titles-champion-crown.css','titles-prestige.css','titles-season2.css'];
const js=['titles-catalog.js','titles-season2-art.js','titles-season2-effects.js'];
const fixture=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${css.map(file=>`<link rel="stylesheet" href="/${file}">`).join('')}
<style>body{margin:0;padding:12px;background:#101b2d}main{max-width:736px;margin:auto}.check-row{margin-bottom:12px}.playerCardTitles{display:grid;justify-items:center;padding:0}.intro-title-value{display:block}.test-panel{box-sizing:content-box;max-width:100%;margin-bottom:8px}</style>
<main id="qa"></main>${js.map(file=>`<script src="/${file}"></script>`).join('')}
<script>for(const title of TitleCatalog.items.filter(t=>t.season===2)){const row=document.createElement('section');row.className='check-row';for(const mode of ['title-entry','title-slot','playerCardTitles','intro-title-value']){const panel=document.createElement('div');panel.className=mode+' test-panel';panel.append(TitleCatalog.badge(title.id));row.append(panel);}qa.append(row);}</script></html>`;
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function measure(page){
 return page.locator('.season2-ribbon').evaluateAll(badges=>badges.map(b=>{
  const text=b.querySelector('.title-badge'),range=document.createRange();range.selectNodeContents(text);
  const t=range.getBoundingClientRect(),r=b.getBoundingClientRect(),l=(b.querySelector('.s2-crown-medal')||b.querySelector('.s2-left')).getBoundingClientRect(),right=b.querySelector('.s2-right').getBoundingClientRect();
  const fits=t.left>=r.left&&t.right<=r.right&&t.top>=r.top&&t.bottom<=r.bottom;
  const scale=r.width/b.clientWidth;
  const clear=t.left>=l.right+scale&&t.right<=right.left-scale;
  const ornaments=[l,right].every(o=>o.left>=r.left&&o.right<=r.right&&o.top>=r.top&&o.bottom<=r.bottom);
  const p=b.parentElement.getBoundingClientRect();
  return {id:b.dataset.titleId,mode:b.parentElement.className,width:r.width,font:getComputedStyle(text).fontSize,shrunk:!!text.style.fontSize,fits,clear,ornaments,parentFits:r.left>=p.left&&r.right<=p.right};
 }));
}
(async()=>{
 const allowed=new Set([...css,...js]);
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1);
  if(!name){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return;}
  if(!allowed.has(name)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(path.join(root,name)));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,count=0;
 try{
  browser=await chromium.launch({headless:true,timeout:12000,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  const page=await browser.newPage({viewport:{width:776,height:5000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load',timeout:10000});
  for(const viewport of [320,550,551,776,1280]){
   await page.setViewportSize({width:viewport,height:5000});
   for(const family of ['"Arial Black","Yu Gothic UI",sans-serif','serif','monospace']){
    await page.evaluate(family=>{let style=document.getElementById('test-font');if(!style){style=document.createElement('style');style.id='test-font';document.head.append(style);}style.textContent='.season2-ribbon .title-badge{font-family:'+family+'!important}';},family);
    for(const width of [80,100,130,160,190,220,270,342,520]){
     await page.locator('.test-panel').evaluateAll((panels,width)=>panels.forEach(panel=>panel.style.width=width+'px'),width);
     await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await settle(page);
     const metrics=await measure(page);count+=metrics.length;
     assert.deepEqual(metrics.filter(m=>!m.fits||!m.clear||!m.ornaments||!m.parentFits),[],JSON.stringify({viewport,family,width}));
    }
   }
  }
  // A large badge keeps its preferred size, and recovers after a narrow layout.
  await page.setViewportSize({width:1280,height:5000});
  await page.evaluate(()=>document.getElementById('test-font').remove());
  await page.locator('.test-panel').evaluateAll(panels=>panels.forEach(p=>p.style.width='520px'));await settle(page);
  const large=await measure(page);assert(large.filter(m=>m.mode.startsWith('title-')).every(m=>!m.shrunk));
  await page.locator('.test-panel').evaluateAll(panels=>panels.forEach(p=>p.style.width='100px'));await settle(page);
  const small=await measure(page);assert(small.some(m=>m.shrunk));
  await page.locator('.test-panel').evaluateAll(panels=>panels.forEach(p=>p.style.width='520px'));await settle(page);
  assert.deepEqual((await measure(page)).map(m=>m.font),large.map(m=>m.font));
  // Parent scale never affects the fit calculation or canvas backing resolution.
  await page.locator('.test-panel').evaluateAll(panels=>panels.forEach(p=>{p.style.width='130px';p.style.transform='scale(.25)';p.style.transformOrigin='left center';}));await settle(page);
  assert.deepEqual((await measure(page)).filter(m=>!m.fits||!m.clear||!m.ornaments||!m.parentFits),[]);
  await page.emulateMedia({reducedMotion:'reduce'});await settle(page);
  await page.locator('.test-panel').evaluateAll(panels=>panels.forEach(p=>{p.style.display='none';}));await settle(page);
  await page.locator('.test-panel').evaluateAll(panels=>panels.forEach(p=>{p.style.removeProperty('display');p.style.removeProperty('transform');p.style.width='190px';}));await settle(page);
  assert.deepEqual((await measure(page)).filter(m=>!m.fits||!m.clear||!m.ornaments||!m.parentFits),[]);
  assert.deepEqual(errors,[]);console.log('PASS: '+count+' browser layouts; full text/ornament/frame bounds, fallback fonts, resize recovery, scaled profiles, hidden/reduced-motion reveal');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
