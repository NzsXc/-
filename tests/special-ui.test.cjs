const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,'').replace('</head>','<style>'+read('advanced/advanced.css')+read('advanced/button-art.css')+read('advanced/special.css')+read('battle-action-art.css')+'</style></head>');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 try{for(const [width,height]of [[1365,900],[390,844],[320,640],[844,390]])for(const skills of [false,true]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://special.test/**',route=>route.fulfill({path:path.join(root,new URL(route.request().url()).pathname)}));await page.setContent(html);
  await page.evaluate(()=>document.getElementById('openingTransition')?.remove());
  await page.addScriptTag({content:read('room-rules.js')});
  await page.addScriptTag({content:`const techniquePool=[{name:'ブリーチ',description:'ゲージ4消費 / 2ダメージ。ブロックを貫通してダメージを与える'},{name:'カウンター',description:'反射'},{name:'パニッシュ',description:'2ダメージ'}];const selectedTechniques={1:[0,1,2],2:[0,1,2]};let selectingPlayer=1,rankedAnimating=false;const PlayerIntro={cancel(){}};`});
  await page.addScriptTag({content:read('advanced/rules.js')});await page.addScriptTag({content:read('advanced/client.js')});
  await page.addScriptTag({content:read('advanced/special.js')});await page.addScriptTag({url:'https://special.test/battle-action-art.js'});
  await page.evaluate(skills=>{
   window.m={id:'ui',you:1,phase:'select',roomRules:{mode:'advanced',skills,special:true,hp:15},special:{version:1,max:30,gauge:{1:14,2:5}},state:{turn:2},loadouts:{1:[0,1,2],2:[0,1,2]}};
   document.querySelectorAll('.screen').forEach(n=>n.classList.toggle('active',n.id==='techScreen'));SpecialGauge.select(m);
  },skills);
  const before=await page.locator('#techConfirmButton').boundingBox(),cardBefore=await page.locator('#techIcon0').evaluate(n=>n.closest('.techCard').getBoundingClientRect().height);
  await page.locator('#techIcon0').evaluate(n=>n.parentElement.querySelector('button').click());assert.equal(await page.locator('#techIcon0').innerText(),'Sブリーチ');
  await page.screenshot({path:path.join(root,'..','special-selection-'+width+'-'+skills+'.png')});
  const after=await page.locator('#techConfirmButton').boundingBox();assert(Math.abs(before.y-after.y)<.1,'toggle does not move confirm button');assert.equal(await page.locator('#techIcon0').evaluate(n=>n.closest('.techCard').getBoundingClientRect().height),cardBefore,'toggle keeps card height');
  assert.match(await page.locator('#techCardDescription0').innerText(),/準備中/);assert(await page.locator('#specialSelectionNote').isVisible());
  await page.locator('#techIcon0').evaluate(n=>n.parentElement.querySelector('button').click());assert.equal(await page.locator('#techIcon0').innerText(),'ブリーチ');
  await page.evaluate(skills=>{
   document.querySelectorAll('.screen').forEach(n=>n.classList.toggle('active',n.id==='battleScreen'));document.getElementById('battleScreen').dataset.localPlayer='1';m.phase='turn';
   m.advanced={selected:{1:'boost',2:'heal'}};m.serverNow=10000;m.opensAt=10000;m.skillWindow={startAt:6000,endAt:9000,confirmAt:9500};
   SpecialGauge.sync(m);AdvancedSkills.sync(m,m.serverNow);
   const artLoadout=[{skill:'tech1'},{skill:'tech2'},{skill:'tech3'}];BattleActionArt.update({loadouts:{1:artLoadout,2:artLoadout},localPlayer:1});SpecialGauge.paintBattle(m);
   for(const p of [1,2])document.getElementById('hp'+p+'Text').textContent=m.roomRules.hp+'/'+m.roomRules.hp;
  },skills);
  for(const side of [1,2])assert.equal(await page.locator('#specialGauge'+side+' .specialGaugeHint').innerText(),'（チャージ、ターン終了、被弾ごとに+1）');
  const hpStep=await page.locator('#player1Area .hpBar').evaluate(n=>getComputedStyle(n,'::after').backgroundSize);assert(Math.abs(parseFloat(hpStep)-100/15)<.01,'15 HP segments');
  await page.locator('#specialSwitchDock button').click();
  const ranked=read('ranked-client.js'),choose=ranked.slice(ranked.indexOf('async function rankedChoose('),ranked.indexOf('async function rankedSubmitAction('));
  await page.addScriptTag({content:`let rankedMatch=m,rankedSending=false,rankedTurnDeadline=0,rankedTurnOpensAt=0;const locked={1:false};const isBattleActionAvailable=()=>true;window.submitted=[];const rankedSubmitAction=async(m,id)=>submitted.push(id);PlayerIntro.isActive=()=>false;${choose}`});
  await page.evaluate(async()=>{await rankedChoose(1,'tech0');await rankedChoose(1,'charge');});assert.deepEqual(await page.evaluate(()=>submitted),[0],'S preview blocks keyboard techs, keeps basic actions');
  for(let i=0;i<3;i++){assert(await page.locator('#p1tech'+i).isDisabled());assert((await page.locator('#p1tech'+i+' .actionName').innerText()).startsWith('S'));}
  assert.equal(await page.locator('#player1Area [data-action="charge"] .actionName').innerText(),'チャージ');
  assert.equal(await page.locator('#p1tech0').evaluate(n=>getComputedStyle(n,'::after').animationName),'specialEdgeFlow');
  const box=await page.locator('#specialSwitchDock').boundingBox(),area=await page.locator('#player1Area').boundingBox();assert(box.x>=0&&box.x+box.width<=width);assert(box.y+box.height<=area.y+1,'switch above player card');
  if(skills){const skill=await page.locator('#advancedSkillDock').boundingBox();assert(box.x+box.width+7<=skill.x,'switch beside skill');assert(Math.abs(box.y-skill.y)<1);}
  await page.screenshot({path:path.join(root,'..','special-'+width+'-'+skills+'.png')});
  await page.locator('#specialSwitchDock button').click();assert.equal(await page.locator('#p1tech0 .actionName').innerText(),'ブリーチ');assert(!(await page.locator('#p1tech0').isDisabled()));
  await page.evaluate(async()=>rankedChoose(1,'tech0'));assert.deepEqual(await page.evaluate(()=>submitted),[0,3]);
  const source=read('index.html'),reveal=source.slice(source.indexOf('function showTechniqueReveal('),source.indexOf('function clearOnlineTechniqueDescription('));
  await page.addScriptTag({content:`const playBattleSE=()=>{},getBattlePlayerName=p=>p+'P',ONLINE_REVEAL_MS=1300;${reveal}`});
  await page.evaluate(()=>showTechniqueReveal({special:true,name:'Sブリーチ'},{name:'ブロック'}));
  assert.equal(await page.locator('.specialActionLabel').innerText(),'1P　Sブリーチ');assert.equal(await page.locator('.specialActionLabel').evaluate(n=>getComputedStyle(n).color),'rgb(234, 215, 250)');
  await page.evaluate(()=>SpecialGauge.reset());assert(await page.locator('#specialSwitchDock').isHidden());assert.deepEqual(errors,[]);await page.close();
  console.log('PASS special selection and battle switch '+width+'x'+height+' skills='+skills);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
