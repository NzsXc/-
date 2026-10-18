const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fixture=read('index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,'').replace('</head>','<style>'+read('advanced/advanced.css')+read('advanced/button-art.css')+read('advanced/cutin.css')+'</style></head>');
const m={id:'cutin-test',you:1,players:{1:{name:'青空'},2:{name:'夜空'}},roomRules:{mode:'advanced',hp:10,initialGauge:8,maxGauge:10},state:{turn:1},skillWindow:{startAt:5600,endAt:8600},opensAt:11700,serverNow:8600,advanced:{selected:{1:'boost',2:'heal'},current:{1:{id:'boost',turn:1,used:1},2:{id:'heal',turn:1,used:1}}}};
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});try{
 for(const [width,height]of [[1365,900],[390,844],[320,640],[844,390]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setContent(fixture);await page.evaluate(()=>{document.getElementById('openingTransition')?.remove();document.querySelectorAll('.screen').forEach(n=>n.classList.toggle('active',n.id==='battleScreen'));document.getElementById('battleScreen').dataset.localPlayer='1';});
  if(width===1365){const duration=await page.evaluate(async bytes=>{const context=new AudioContext();try{return(await context.decodeAudioData(Uint8Array.from(bytes).buffer)).duration;}finally{await context.close();}},[...fs.readFileSync(path.join(root,'sounds/advanced-cutin.mp3'))]);assert(duration>0);assert.equal(await page.locator('#seAdvancedCutin').getAttribute('src'),'sounds/advanced-cutin.mp3');}
  await page.addScriptTag({content:`const rankedAnimating=false;let rankedSending=false;const PlayerIntro={cancel(){}};window.played=[];window.situation=[];function playBattleSE(id){window.played.push(id);}function playBattleSituationSE(...args){window.situation.push(args);} ${read('advanced/rules.js')} ${read('advanced/client.js')} ${read('battle-effects.js')} ${read('advanced/cutin.js')}`});
  await page.evaluate(m=>{window.m=m;window.effectCalls=[];const engine=window.BattleEffects;window.BattleEffects={...engine,play(o){window.effectCalls.push(o.actions);return engine.play(o);}};},m);
  const sync=now=>page.evaluate(now=>{window.m.serverNow=now;window.AdvancedSkills.sync(window.m,now);},now);
  await sync(8600);assert.equal(await page.locator('#advancedSkillPresentation').isVisible(),true);assert.equal(await page.locator('.comic-panel').count(),2);assert.equal(await page.locator('#advancedSkillWindow').isVisible(),false);assert.equal(await page.locator('.impact-letter').count(),0);
  const keys=await page.locator('.cutin-layer').evaluate(n=>n.getAnimations()[0].effect.getKeyframes().map(k=>k.transform));assert(keys[0].includes('115%, -115%'));assert(keys.at(-1).includes('-115%, 115%'));
  assert.equal(await page.locator('.comic-paper').first().evaluate(n=>n.getAnimations()[0].effect.getTiming().iterations),Infinity);
  await sync(8750);assert.deepEqual(await page.evaluate(()=>window.played),['seAdvancedCutin'],'one spotlight cue, separate from button audio');assert.equal(await page.locator('.confirmedEffectCanvas').count(),0);
  await page.waitForTimeout(600);
  for(const you of [1,2]){
   await page.evaluate(you=>{window.m.you=you;document.getElementById('battleScreen').dataset.localPlayer=String(you);window.AdvancedSkills.sync(window.m,9000);},you);
   assert.equal(await page.locator('.panel-self').getAttribute('data-player'),String(you),'own cut-in follows the local player');
   assert.equal(await page.locator('.panel-enemy').getAttribute('data-player'),String(3-you),'opponent cut-in follows the other player');
   assert.equal(await page.locator('.panel-self .panel-player-name').textContent(),m.players[you].name);
   assert.equal(await page.locator('.panel-enemy .panel-player-name').textContent(),m.players[3-you].name);
   const self=await page.locator('.panel-self').boundingBox(),enemy=await page.locator('.panel-enemy').boundingBox();
   assert(self.y+self.height/2>height/2,'own cut-in is below the screen center at '+width+'x'+height);
   assert(enemy.y+enemy.height/2<height/2,'opponent cut-in is above the screen center at '+width+'x'+height);
   for(const player of [you,3-you]){
    await page.evaluate(player=>{window.m.advanced.current={[player]:{id:window.m.advanced.selected[player],turn:1,used:1}};window.AdvancedSkills.sync(window.m,9000);},player);
    assert.equal(await page.locator('.comic-panel').count(),1);
    assert.equal(await page.locator(player===you?'.panel-self':'.panel-enemy').count(),1,'single-player cut-ins keep their correct side');
    const offset=await page.locator('.comic-panel').evaluate(n=>parseFloat(getComputedStyle(n).getPropertyValue('--offset')));
    assert(player===you?offset>0:offset<0,'single-player cut-in stays at the same vertical position');
   }
   await page.evaluate(()=>{window.m.advanced.current={1:{id:'boost',turn:1,used:1},2:{id:'heal',turn:1,used:1}};});
  }
  const longName='とても長いプレイヤー名'.repeat(8)+'<img src=x>';
  await page.evaluate(name=>{window.m.you=1;window.m.players[1].name=name;document.getElementById('battleScreen').dataset.localPlayer='1';window.AdvancedSkills.sync(window.m,9000);},longName);
  assert.equal(await page.locator('.panel-self .panel-player-name').textContent(),longName,'name changes are rendered as text');
  assert.equal(await page.locator('.panel-self .panel-player-name').getAttribute('title'),longName,'full long names remain accessible');
  assert.equal(await page.locator('.panel-owner img').count(),0,'player names never become HTML');
  assert(await page.locator('.panel-owner').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1)),'long names fit within the ribbon');
  await page.evaluate(()=>{window.m.players[1].name='青空';window.AdvancedSkills.sync(window.m,9000);});
  assert.deepEqual(await page.evaluate(()=>window.played),['seAdvancedCutin'],'perspective/name updates do not replay audio');
  for(const skill of ['boost','heal','chain','cleanse','invincible']){await page.evaluate(skill=>{window.m.advanced.selected[1]=skill;window.m.advanced.current[1].id=skill;window.AdvancedSkills.sync(window.m,9000);},skill);assert.equal(await page.locator('.comic-panel').first().locator('h2').textContent(),await page.evaluate(skill=>window.AdvancedRules.byId[skill].name,skill));assert(await page.locator('.panel-copy').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+1)),skill+' text fits at '+width);}
  await page.evaluate(()=>{window.m.advanced.selected[1]='boost';window.m.advanced.current[1].id='boost';window.AdvancedSkills.sync(window.m,9000);});
  if(process.env.ADVANCED_SCREENSHOTS)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'cutin-game-'+width+'.png'),fullPage:true});
  await sync(10500);assert.equal(await page.locator('.cutin-layer').isVisible(),false);assert.equal(await page.locator('.post-effect-stage').isVisible(),true);assert.deepEqual(await page.evaluate(()=>window.effectCalls.at(-1)),[{type:'charge'},{type:'heal',skill:'tech4'}]);
  assert.deepEqual(await page.evaluate(()=>window.situation.at(-1)),[{type:'charge'},{type:'heal',skill:'tech4'},0,0],'the ordinary technique sound path follows the cut-in');
  await page.waitForTimeout(300);assert(await page.locator('.confirmedEffectCanvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n>0)));
  if(process.env.ADVANCED_SCREENSHOTS)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'cutin-effects-game-'+width+'.png'),fullPage:true});
  await sync(11700);assert.equal(await page.locator('#advancedSkillPresentation').isVisible(),false);assert.equal(await page.locator('.confirmedEffectCanvas').count(),0);
  await sync(12000);assert.equal(await page.locator('#advancedSkillPresentation').isVisible(),false,'never replay after the shared opening');
  await page.evaluate(()=>{window.m.advanced.current={2:{id:'heal',turn:1,used:1}};window.AdvancedCutin.cancel();window.AdvancedSkills.sync(window.m,9000);});assert.equal(await page.locator('.comic-panel').count(),1);assert.equal(await page.locator('.comic-panel').getAttribute('data-player'),'2','enemy-only cut-in');
  await page.evaluate(()=>{window.m.advanced.current={};window.AdvancedSkills.sync(window.m,9000);});assert.equal(await page.locator('#advancedSkillPresentation').isVisible(),false,'neither player: skip');
  await page.evaluate(()=>{window.m.advanced.current={1:{id:'invincible',turn:1,used:1}};window.m.advanced.selected[1]='invincible';window.AdvancedSkills.sync(window.m,10600);});assert.equal(await page.locator('.post-skill-mark .star-shape').count(),1);
  await page.evaluate(()=>{window.m.roomRules.mode='standard';window.AdvancedSkills.sync(window.m,10600);});assert.equal(await page.locator('#advancedSkillPresentation').isVisible(),false);assert.equal(await page.locator('.confirmedEffectCanvas').count(),0);
  await page.evaluate(()=>{window.AdvancedCutin.reset();window.m.roomRules.mode='advanced';window.m.serverNow=8599;window.AdvancedSkills.sync(window.m,8700);});assert.equal(await page.locator('#advancedSkillPresentation').isVisible(),false,'wait for the final server receipt snapshot');
  assert.deepEqual(errors,[]);await page.close();console.log('PASS: local player below/opponent above for both perspectives and single activation; real/long player names; live cut-in/effects, cancel/rejoin, no double SE, all skills and mode isolation at '+width+'x'+height);
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
