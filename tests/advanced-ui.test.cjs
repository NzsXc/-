const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),{harness}=require('./rules-harness.cjs');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),html=read('index.html'),ranked=read('ranked-client.js');
const confirm=ranked.slice(ranked.indexOf('async function rankedConfirm(){'),ranked.indexOf('async function rankedChoose('));
const fixture=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,'').replace('</head>','<style>'+read('advanced/advanced.css')+read('advanced/button-art.css')+read('battle-inspector.css')+'</style></head>');
(async()=>{
 const browser=await chromium.launch({headless:true,timeout:12000,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const [width,height]of [[1365,900],[390,844],[320,640],[844,390]]){
   const h=harness();for(const p of [1,2])h.put('freeAccounts/p'+p,{name:p===1?'A':'B',rating:1000,guest:false,games:0,active:'',lastSettled:''});
   h.commit({'friendRooms/adv':{host:'p2',name:'B',createdAt:h.now(),heartbeat:h.now(),game:'',roomRules:{mode:'advanced',hp:10,initialGauge:8,maxGauge:10}}},'p2');
   const match=(await h.transports[0]({op:'friendJoin',roomId:'adv'})).match,id=match.id;
   const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.exposeFunction('advancedTestRpc',data=>h.transports[0](data));
   await page.setContent(fixture);
   await page.evaluate(()=>document.getElementById('openingTransition')?.remove());
   await page.addScriptTag({content:read('battle-inspector.js')});
   await page.addScriptTag({content:`
    let rankedMatch=null,rankedActive=true,rankedSending=false,rankedAnimating=false,rankedClockServer=0,rankedClockAt=0;
    const selectedTechniques={1:[0,1,2],2:[0,1,2]},PlayerIntro={cancel(){window.introCancelled=true;}};
    function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));}
    function rankedMessage(text){document.getElementById('resultMessage').textContent=text;}
    const rankedCommandRpc=data=>window.advancedTestRpc(data);
    function rankedApply(m){rankedMatch=m;rankedClockServer=m.serverNow;rankedClockAt=performance.now();showScreen(m.phase==='select'?'techScreen':'battleScreen');document.getElementById('battleScreen').dataset.localPlayer=String(m.you);window.AdvancedSkills.select(m);window.AdvancedSkills.sync(m,m.serverNow);window.BattleInspector.update({enabled:!!m.state&&!m.closed,side:m.you,loadouts:{1:[0,1,2].map(i=>({name:'技'+i,description:'効果'+i})),2:[0,1,2].map(i=>({name:'技'+i,description:'効果'+i}))},names:{1:'A',2:'B'}});document.getElementById('techConfirmButton').disabled=m.ready[m.you]||rankedSending||!window.AdvancedSkills.ready(m);if(m.state)document.getElementById('gauge1Text').textContent=m.state.gauge[1]+'/10';}
    function confirmTech(){return rankedConfirm();}
    function setSkillTime(now){rankedClockServer=now;rankedClockAt=performance.now();window.AdvancedSkills.sync(rankedMatch,now);}
    ${read('advanced/rules.js')}
    ${read('advanced/client.js')}
    ${confirm}`});
   await page.evaluate(m=>rankedApply(m),match);
   assert.equal(await page.locator('#advancedSkillSelection input').count(),5);
   assert.equal(await page.locator('#techConfirmButton').isDisabled(),true,'one skill must be selected before confirming');
   await page.check('input[name="advancedSkill"][value="heal"]');await page.check('input[name="advancedSkill"][value="boost"]');
   assert.equal(await page.locator('input[name="advancedSkill"]:checked').count(),1);
   if(process.env.ADVANCED_SCREENSHOTS&&width===1365)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'advanced-skill-selection.png'),fullPage:true});
   await page.click('#techConfirmButton');await page.waitForFunction(()=>rankedMatch.ready[1]===true);
   assert.equal(await page.locator('input[name="advancedSkill"][value="boost"]').isDisabled(),true);
   assert.equal(h.get('freeGames/'+id+'/advanced/selected/1'),'boost');
   const start=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:'heal'})).match;
   await page.evaluate(m=>rankedApply({...m,you:1}),start);
   assert.equal(await page.locator('#advancedSkillWindow').isVisible(),false);
   assert.equal(await page.locator('#advancedSkillButton').isDisabled(),true);
   assert.equal(await page.locator('#advancedSkillButton').evaluate(n=>n.closest('.playerArea')),null,'the skill button must be outside both player panels');
   const from=start.skillWindow.startAt;h.setClock(from);
   await page.evaluate(now=>setSkillTime(now),from);
   assert.equal(await page.locator('#advancedSkillWindow').isVisible(),true);
   assert.equal(await page.locator('.advancedSkillSeconds').textContent(),'2.0秒');
   assert.equal(await page.locator('#advancedSkillButton').isEnabled(),true);
   await page.evaluate(now=>setSkillTime(now),from+1000);h.setClock(from+1000);
   assert.equal(await page.locator('.advancedSkillFill').evaluate(n=>n.style.transform),'scaleX(0.5)');
   assert.equal(await page.locator('.advancedSkillUses').textContent(),'3/3');
   for(const skill of ['boost','heal','chain','cleanse','invincible']){
    await page.evaluate(skill=>window.AdvancedSkills.sync({...rankedMatch,advanced:{selected:{...rankedMatch.advanced.selected,1:skill}}},rankedMatch.opensAt-1000),skill);
    assert.equal(await page.locator('#advancedSkillButton').getAttribute('data-skill'),skill);
    assert.equal(await page.locator('#advancedSkillButton img, #advancedSkillButton svg, #advancedSkillButton canvas').count(),0,'art must be CSS only');
   }
   assert.equal(await page.locator('#advancedSkillButton .invincible-star').count(),1,'invincibility uses the approved star');
   if(process.env.ADVANCED_SCREENSHOTS&&width===390)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'advanced-css-star-mobile.png'),fullPage:true});
   await page.evaluate(now=>setSkillTime(now),from+1000);
   const own=await page.locator('#player1Area').boundingBox(),orb=await page.locator('#advancedSkillButton').boundingBox(),lens=await page.locator('#battleInspectorToggle').boundingBox();
   assert.equal(orb.width,56);assert.equal(orb.height,56);
   assert(Math.abs(orb.x+orb.width-own.x-own.width)<2,'skill replaces the old inspector position at the panel right');
   assert(Math.abs(lens.x-own.x)<2,'inspector moves to the panel left');
   assert(lens.x+lens.width<orb.x,'the two buttons do not overlap');
   assert(Math.abs(orb.y+orb.height-own.y+5)<3,'skill stays outside the panel');
   for(const control of ['#advancedSkillButton','#advancedSkillWindow'])for(const panel of ['#player1Area','#player2Area']){
    const a=await page.locator(control).boundingBox(),b=await page.locator(panel).boundingBox();
    assert(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),control+' overlaps '+panel+' at '+width+'x'+height);
   }
   if(process.env.ADVANCED_SCREENSHOTS&&width===390)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'advanced-skill-window-mobile.png'),fullPage:true});
   if(process.env.ADVANCED_SCREENSHOTS&&width!==390)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'advanced-skill-window-'+(width===844?'landscape':'desktop')+'.png'),fullPage:true});
   await page.click('#battleInspectorToggle');assert.equal(await page.locator('#battleInspectorPanel').isVisible(),true);
   await page.getByRole('button',{name:'閉じる',exact:true}).click();assert.equal(await page.locator('#battleInspectorPanel').isVisible(),false);
   await page.click('#advancedSkillButton');await page.waitForFunction(()=>document.querySelector('.advancedSkillUses').textContent==='2/3');
   assert.equal(await page.locator('#gauge1Text').textContent(),'10/10');assert.equal(await page.locator('#advancedSkillButton').isDisabled(),true);
   await page.evaluate(()=>document.getElementById('advancedSkillButton').click());assert.equal(h.get('freeGames/'+id+'/advanced/current/1/used'),1);
   await page.evaluate(now=>setSkillTime(now),start.opensAt);
   assert.equal(await page.locator('#advancedSkillWindow').isVisible(),false,'the countdown must disappear exactly at zero');
   await page.evaluate(()=>rankedApply({...rankedMatch,you:2}));
   const second=await page.locator('#player2Area').boundingBox(),secondOrb=await page.locator('#advancedSkillButton').boundingBox(),secondLens=await page.locator('#battleInspectorToggle').boundingBox();
   assert(Math.abs(secondOrb.x+secondOrb.width-second.x-second.width)<2,'player 2 skill follows their own panel');
   assert(Math.abs(secondLens.x-second.x)<2,'player 2 inspector follows the panel left');
   await page.evaluate(()=>rankedApply({...rankedMatch,roomRules:{mode:'standard',hp:10,initialGauge:8,maxGauge:10}}));
   assert.equal(await page.locator('#advancedSkillDock').isVisible(),false);assert.equal(await page.locator('#advancedSkillWindow').isVisible(),false);
   assert.equal(await page.locator('#battleScreen').evaluate(n=>n.classList.contains('advancedMode')),false);
   assert.equal(await page.locator('#battleInspectorToggle').isVisible(),true,'Standard keeps its inspector');
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: actual skill selection/confirmation and rules-enforced activation; desktop/mobile/landscape layouts, single selection, external skill button, 2→0 bar, remaining uses, immediate resources, exact expiry and Standard cleanup');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
