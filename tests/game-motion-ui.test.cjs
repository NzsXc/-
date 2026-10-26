const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<script\b[^>]*src="\.\/pwa-register[^>]*><\/script>/g,'');
const profileSource=fs.readFileSync(path.join(root,'player-profile.js'),'utf8').replace(/^import[^\n]*\n/gm,'').replaceAll('export ','');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
 for(const [width,height]of [[1365,900],[390,844],[320,640],[844,390]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='motion.test')return route.abort();if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});const p=path.resolve(root,'.'+decodeURIComponent(u.pathname));return p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.fulfill({status:404,body:''});});
  await page.goto('http://motion.test/');await page.waitForFunction(()=>!!window.GameMotion);
  await page.addScriptTag({content:'(()=>{'+profileSource+';window.createTestProfile=createPlayerProfile;})();'});
  await page.evaluate(()=>{
   document.getElementById('openingTransition')?.remove();HTMLMediaElement.prototype.play=()=>Promise.resolve();showScreen('modeScreen');
   window.shopFixture={wallet:{balance:250,colorUnlocked:false,glossUnlocked:false,color:'white',gloss:false},styles:{owned:{},selected:''}};
   window.titleService={uid:()=> 'p1',readOwn:async()=>({loadout:['s2_champion','skill_name_2','strategist'],uses:{2:{count:50}},grants:{s2_champion:true},milestones:{1050:true}}),loadoutFor:async()=>['s2_champion','skill_name_2','strategist'],saveLoadout:async ids=>{window.savedTitleLoadout=[...ids];}};
   window.battleFrameService={readOwn:async()=>({frame:'',uses:{},onlineWins:96,friendWins:32}),saveFrame:async()=>({frame:''})};
   window.economyService={uid:()=> 'p1',readOwn:async()=>structuredClone(shopFixture.wallet),playerName:async()=> 'NzsXc',readOwnCardStyles:async()=>structuredClone(shopFixture.styles),cardStyleFor:async()=>shopFixture.styles.selected,styleFor:async()=>({color:'white',gloss:false}),buyCardStyle:async id=>{if(!shopFixture.styles.owned[id]){if(shopFixture.wallet.balance<100)throw Error('100コイン必要です');shopFixture.wallet.balance-=100;shopFixture.styles.owned[id]=true;}shopFixture.styles.selected=id;return structuredClone({wallet:shopFixture.wallet,styles:shopFixture.styles});},saveCardStyle:async id=>{if(id&&!shopFixture.styles.owned[id])throw Error('未購入');shopFixture.styles.selected=id;return structuredClone(shopFixture.styles);}};
  });
  assert.equal(await page.evaluate(()=>GameMotionArt.HOME_TRAILS),98);
  assert.equal(await page.locator('#modeScreen').evaluate(n=>getComputedStyle(n).backgroundImage),'none');
  await page.evaluate(()=>{gameMode='offline';botMatch=true;rankedActive=false;selectingPlayer=1;selectedTechniques[1]=[0,1,15];showScreen('techScreen');updateTechniqueDisplay();});
  assert.equal(await page.locator('#techScreen .gameTechCost').count(),3);assert.deepEqual(await page.locator('#techScreen .gameTechCost').allTextContents(),['通常消費 4','通常消費 2','通常消費 2']);
  await page.getByLabel('次の技',{exact:true}).first().click();assert.equal(new Set(await page.locator('#techScreen .techIcon').allTextContents()).size,3,'existing duplicate-skip behavior remains');
  await page.evaluate(()=>{showScreen('battleScreen');showBattleResult('1P WIN');});assert.equal(await page.locator('.gameResultWord').innerText(),'VICTORY');
  await page.evaluate(()=>showBattleResult('2P WIN'));assert.equal(await page.locator('.gameResultWord').innerText(),'DEFEAT');assert.equal(await page.locator('.gameResultOverlay').count(),1);
  await page.evaluate(()=>{document.getElementById('battleScreen').classList.add('spectatorMode');showBattleResult('1P WIN');});assert.equal(await page.locator('.gameResultWord').innerText(),'WINNER');
  await page.evaluate(()=>{document.getElementById('battleScreen').classList.remove('spectatorMode');showBattleResult('DRAW');});assert.equal(await page.locator('.gameResultOverlay').count(),0);
  await page.evaluate(()=>{showBattleResult('1P WIN');showScreen('modeScreen');});assert.equal(await page.locator('.gameResultOverlay').count(),0,'screen exits cancel result ornament');
  await page.evaluate(()=>openTitles());
  assert(await page.locator('#titleCollection').isVisible(),'collection opens with title screen');
  assert.equal(await page.locator('#titleCollection .titleIndexMeta').count(),await page.evaluate(()=>TitleCatalog.items.length));
  assert.equal(await page.locator('#titleCollection .title-entry[data-title-id="s2_champion"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#titleCollection .title-entry[data-title-id="s2_champion"] .titleIndexCode').innerText(),'TOURNAMENT / SEASON 2');
  assert.equal(await page.locator('#titleCollection .title-entry[data-title-id="skill_prestige_2"] .titleIndexCode').innerText(),'MASTERY / COUNTER');
  assert.equal(await page.locator('#titleCollection .title-entry[data-title-id="skill_prestige_16"] .title-progress').innerText(),'0 / 50 回');
  assert(await page.locator('#titleCollection .title-entry[data-title-id="skill_prestige_16"]').isDisabled());
  const rowLayout=await page.locator('#titleCollection .title-entry').evaluateAll(rows=>rows.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.dataset.titleId));assert.deepEqual(rowLayout,[],'collection rows fit '+width);
  if(process.env.GAME_MOTION_SCREENSHOTS&&[1365,390].includes(width)){fs.mkdirSync(process.env.GAME_MOTION_SCREENSHOTS,{recursive:true});await page.locator('#titleCollection').evaluate(n=>document.getElementById('titlesScreen').scrollTop=n.offsetTop-20);await page.screenshot({path:path.join(process.env.GAME_MOTION_SCREENSHOTS,'title-index-'+width+'.png')});}
  await page.getByRole('button',{name:'称号2を変更',exact:true}).click();
  await page.locator('#titleCollection .title-entry[data-title-id="skill_prestige_2"]').click();
  assert.equal(await page.locator('#titleCollection .title-entry[data-title-id="skill_prestige_2"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#titleCollection [aria-pressed=true]').count(),1);
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.titleId),'skill_prestige_2','selection keeps keyboard focus');
  await page.locator('#titleSave').click();assert.deepEqual(await page.evaluate(()=>savedTitleLoadout),['s2_champion','skill_prestige_2','strategist']);
  await page.locator('#titlePlayerName').click();assert(await page.locator('#titleCollection').isHidden());
  await page.getByRole('button',{name:'称号3を変更',exact:true}).click();assert(await page.locator('#titleCollection').isVisible());
  await page.locator('#titleCollection .title-entry[data-title-id="skill_prestige_2"]').click();await page.locator('#titleSave').click();assert.deepEqual(await page.evaluate(()=>savedTitleLoadout),['s2_champion','','skill_prestige_2'],'equipping in another slot moves the title');
  await page.locator('#titleClear').click();assert.equal(await page.locator('#titleCollection [aria-pressed=true]').count(),0);
  await page.getByRole('button',{name:'黒曜プラチナ：100コインで購入して装備',exact:true}).click();await page.waitForFunction(()=>shopFixture.wallet.balance===150);
  await page.getByRole('button',{name:'深海プリズム：100コインで購入して装備',exact:true}).click();await page.waitForFunction(()=>shopFixture.wallet.balance===50);
  await page.getByRole('button',{name:'黒曜プラチナ：この背景を選択',exact:true}).click();assert.equal(await page.evaluate(()=>shopFixture.wallet.balance),50);
  await page.evaluate(async()=>{
   window.profileUnderTest=createTestProfile({history:{profileStats:async()=>({peakRating:1245,techniques:[{name:'ブリーチ',count:382},{name:'カウンター',count:241},{name:'フリーズ',count:168}]}),open:()=>{}},loadTitles:async()=>['s2_champion','skill_name_2','strategist'],loadCardStyle:uid=>economyService.cardStyleFor(uid),showScreen,playSound(){}});
   await profileUnderTest.open({uid:'p1',name:'NzsXc',rating:1200,onlineWins:96,friendWins:32});
  });
  assert.equal(await page.locator('.playerCardPanel').getAttribute('data-card-style'),'obsidian');assert.equal(await page.locator('#playerCardTitles>.badge-item').count(),3);
  assert.deepEqual(await page.locator('.playerCardTechniqueCount').allTextContents(),['382回','241回','168回']);assert.equal(await page.locator('#playerCardTotalWins').innerText(),'128');assert.equal(await page.locator('#playerCardPeakRate').innerText(),'1,245');
  const bounds=await page.locator('.playerCardPanel').evaluate(n=>({overflow:n.scrollWidth>n.clientWidth+1}));assert(!bounds.overflow,'all profile data fit '+width);
  await page.evaluate(()=>{shopFixture.wallet.balance=99;shopFixture.styles={owned:{},selected:''};return openTitles();});assert(await page.getByRole('button',{name:'黒曜プラチナ：100コインで購入して装備',exact:true}).isDisabled());
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{showScreen('battleScreen');showBattleResult('1P WIN');});assert.equal(await page.locator('.gameResultPanel').evaluate(n=>getComputedStyle(n).animationName),'none');
  await page.evaluate(()=>openTitles());assert.equal(await page.locator('#titleCollection .title-entry').first().evaluate(n=>getComputedStyle(n,'::after').animationName),'none');
  await page.waitForTimeout(100);assert.deepEqual(errors,[]);console.log('PASS '+width+'x'+height+': home, cartridges, result perspective/cancellation, 100-coin shop, all profile fields and reduced motion');
  await page.close();
 }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
