const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<script\b[^>]*src="\.\/pwa-register[^>]*><\/script>/g,'');
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
async function metrics(page){
 return page.locator('[data-plate-qa] .badge-item').evaluateAll(badges=>badges.map(b=>{
  const label=b.querySelector('.title-badge'),r=b.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(label);
  const t=range.getBoundingClientRect(),frame=getComputedStyle(b,'::before'),face=b.querySelector('.s2-surface'),faceStyle=face?getComputedStyle(face):getComputedStyle(b,'::after');
  const scale=r.width/b.clientWidth,left=[],right=[];
  for(const n of b.querySelectorAll(':scope>.prestige-medallion,:scope>.crown-medal,:scope>.s2-crown-medal,:scope>.s2-left'))if(getComputedStyle(n).visibility!=='hidden')left.push(n.getBoundingClientRect().right);
  for(const n of b.querySelectorAll(':scope>.prestige-gems,:scope>.crown-right-gem,:scope>.s2-right'))right.push(n.getBoundingClientRect().left);
  const fits=t.left>=r.left-1&&t.right<=r.right+1&&t.top>=r.top&&t.bottom<=r.bottom;
  const clear=left.every(x=>t.left>=x+scale-1)&&right.every(x=>t.right<=x-scale+1);
  const ornaments=[...b.querySelectorAll(':scope>.prestige-medallion,:scope>.prestige-gems,:scope>.crown-medal,:scope>.crown-right-gem,:scope>.s2-crown-medal,:scope>.s2-ornament')].filter(n=>getComputedStyle(n).visibility!=='hidden').every(n=>{const q=n.getBoundingClientRect();return q.left>=r.left&&q.right<=r.right+.5&&q.top>=r.top&&q.bottom<=r.bottom+.5;});
  const geometry=window.TitlePrestigeEffects?.getController(b)?.getEmissionGeometry();
  const effectAligned=!geometry||Math.abs(geometry.textLeft-(label.getBoundingClientRect().left-r.left)/scale)<1;
  return {id:b.dataset.titleId,surface:b.closest('[data-plate-qa]').dataset.plateQa,w:b.clientWidth,h:b.clientHeight,frame:parseFloat(frame.height),face:parseFloat(faceStyle.height),outline:frame.clipPath,faceShape:faceStyle.clipPath,font:parseFloat(getComputedStyle(label).fontSize),fits,clear,ornaments,effectAligned};
 }));
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='plates.test')return route.abort();if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});const p=path.resolve(root,'.'+decodeURIComponent(u.pathname));return p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.fulfill({status:404,body:''});});
  await page.goto('http://plates.test/');await page.waitForFunction(()=>!!window.TitlePlateLayout);
  await page.evaluate(()=>{
   document.getElementById('openingTransition')?.remove();showScreen('titlesScreen');
   const layout=document.querySelector('#titlesScreen>.titles-layout');layout.replaceChildren();
   const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
   for(const surface of ['collection','slots','profile','intro','history']){
    const section=make('section','qa-section');section.dataset.plateQa=surface;section.append(make('h2','',surface));
    let host;
    if(surface==='collection'){host=make('div','');host.id='titleCollection';}
    if(surface==='slots'){const identity=make('div','compactIdentity');host=make('div','title-slots');identity.append(host);section.append(identity);}
    if(surface==='profile'){const panel=make('div','playerCardPanel'),profile=make('div','playerCardProfile');host=make('div','playerCardTitles');profile.append(make('div','playerCardIdentity','プレイヤー'),host);panel.append(profile);section.append(panel);}
    if(surface==='intro'){const card=make('div','intro-card');card.style.position='relative';card.style.left='auto';host=make('div','intro-titles');card.append(host);section.append(card);}
    if(surface==='history'){const player=make('div','historyPlayer');host=make('div','historyTitles');player.append(host);section.append(player);}
    if(surface==='collection')section.append(host);
    for(const item of TitleCatalog.items){
     const badge=TitleCatalog.badge(item.id);
     if(surface==='collection'){const row=make('button','title-entry');row.type='button';row.dataset.qaId=item.id;row.append(make('span','titleIndexMeta',item.kind),badge,make('span','title-description',item.description),make('span','titleIndexFooter','所持済み'));host.append(row);}
     else if(surface==='slots'){const slot=make('button','title-slot');slot.type='button';slot.dataset.qaId=item.id;slot.append(make('span','','称号'),badge);host.append(slot);}
     else if(surface==='intro'){const row=make('div','intro-title'),value=make('div','intro-title-value');row.dataset.qaId=item.id;value.append(badge);row.append(make('span','intro-title-index','01'),value);host.append(row);}
     else{badge.dataset.qaId=item.id;host.append(badge);}
    }
    layout.append(section);
   }
  });await page.evaluate(()=>document.fonts.ready);await settle(page);
  let count=0;
  for(const width of [1280,760,551,550,390,320]){
   await page.setViewportSize({width,height:900});await settle(page);
   const data=await metrics(page);assert.equal(data.length,250);
   assert.deepEqual(data.filter(m=>!m.fits||!m.clear||!m.ornaments||!m.effectAligned),[],JSON.stringify({width}));
   for(const surface of ['collection','slots','profile','intro','history']){
    const rows=data.filter(m=>m.surface===surface),first=rows[0];
    for(const row of rows){assert(Math.abs(row.w-first.w)<1,'equal widths: '+JSON.stringify({width,surface,row,first}));assert.equal(row.h,first.h);assert(Math.abs(row.frame-first.frame)<.02);assert(Math.abs(row.face-first.face)<.02);assert.equal(row.outline,first.outline);assert.equal(row.faceShape,first.faceShape);}
   }
   count+=data.length;
  }
  // Narrow columns, alternate font metrics and a scaled parent must still fit.
  await page.evaluate(()=>{for(const section of document.querySelectorAll('[data-plate-qa]'))section.style.width='130px';for(const label of document.querySelectorAll('[data-plate-qa] .title-badge'))label.style.setProperty('font-family','monospace','important');TitlePlateLayout.refresh();});await settle(page);
  assert.deepEqual((await metrics(page)).filter(m=>!m.fits||!m.clear||!m.ornaments||!m.effectAligned),[]);
  await page.evaluate(()=>{for(const section of document.querySelectorAll('[data-plate-qa]')){section.style.width='';section.style.transform='scale(.4)';section.style.transformOrigin='left top';}TitlePlateLayout.refresh();});await settle(page);
  assert.deepEqual((await metrics(page)).filter(m=>!m.fits||!m.clear||!m.ornaments||!m.effectAligned),[]);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>document.querySelectorAll('[data-plate-qa]').forEach(n=>n.hidden=true));await settle(page);
  await page.evaluate(()=>{for(const n of document.querySelectorAll('[data-plate-qa]')){n.hidden=false;n.style.transform='';}for(const label of document.querySelectorAll('[data-plate-qa] .title-badge'))label.style.removeProperty('font-family');});await settle(page);
  assert.deepEqual((await metrics(page)).filter(m=>!m.fits||!m.clear||!m.ornaments||!m.effectAligned),[]);
  if(process.env.TITLE_PLATE_SCREENSHOTS){
   fs.mkdirSync(process.env.TITLE_PLATE_SCREENSHOTS,{recursive:true});
   await page.evaluate(()=>{const keep=new Set(['skill_name_1','skill_prestige_8','strategist','s1_champion','s2_champion','s2_qualifier']);document.querySelectorAll('[data-plate-qa]').forEach(n=>n.hidden=n.dataset.plateQa!=='collection');document.querySelectorAll('[data-qa-id]').forEach(n=>n.hidden=!keep.has(n.dataset.qaId));});
   for(const width of [1280,390]){await page.setViewportSize({width,height:1100});await settle(page);await page.screenshot({path:path.join(process.env.TITLE_PLATE_SCREENSHOTS,'title-plates-'+width+'.png')});}
  }
  assert.deepEqual(errors,[]);console.log('PASS '+count+' layouts: all 50 titles × 5 surfaces, common frames, unclipped labels, ornaments, effect alignment, narrow/fallback fonts, scaled parents and hidden/reduced-motion reveal');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
