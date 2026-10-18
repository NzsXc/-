const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),{harness}=require('./rules-harness.cjs');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),html=read('index.html'),ranked=read('ranked-client.js');
const confirm=ranked.slice(ranked.indexOf('async function rankedConfirm(){'),ranked.indexOf('async function rankedChoose('));
const fixture=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,'').replace('</head>','<style>'+read('advanced/advanced.css')+read('advanced/button-art.css')+read('battle-action-art.css')+read('battle-inspector.css')+'</style></head>');
const layout=page=>page.evaluate(()=>({boxes:['battleScreen','battleCenter','player1Area','player2Area','countdown','battleInspectorToggle'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,r.x,r.y,r.width,r.height];}),scroll:[scrollX,scrollY,document.documentElement.scrollWidth,document.documentElement.scrollHeight]}));
const pageTop=(page,selector)=>page.locator(selector).evaluate(n=>n.getBoundingClientRect().top+scrollY);
function assertStable(before,after,label){for(let i=0;i<before.boxes.length;i++){assert.equal(before.boxes[i][0],after.boxes[i][0]);for(let j=1;j<5;j++)assert(Math.abs(before.boxes[i][j]-after.boxes[i][j])<1,label+': '+before.boxes[i][0]+' moved or resized');}assert.deepEqual(after.scroll,before.scroll,label+': scroll position or document size changed');}
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
   if(width===1365){
    const duration=await page.evaluate(async bytes=>{const context=new AudioContext();try{return (await context.decodeAudioData(Uint8Array.from(bytes).buffer)).duration;}finally{await context.close();}},[...fs.readFileSync(path.join(root,'sounds/advanced-skill.mp3'))]);
    assert(duration>0,'the provided MP3 decodes successfully');
    assert.equal(await page.locator('#seAdvancedSkill').getAttribute('src'),'sounds/advanced-skill.mp3');
   }
   await page.addScriptTag({content:read('battle-inspector.js')});
   await page.addScriptTag({content:`
    window.playedSkillSE=[];function playBattleSE(id){window.playedSkillSE.push(id);}
    let rankedMatch=null,rankedActive=true,rankedSending=false,rankedAnimating=false,rankedClockServer=0,rankedClockAt=0;
    const selectedTechniques={1:[0,1,2],2:[0,1,2]},PlayerIntro={cancel(){window.introCancelled=true;}};
    function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));}
    function rankedMessage(text){document.getElementById('resultMessage').textContent=text;}
    const rankedCommandRpc=data=>window.advancedTestRpc(data);
    function rankedApply(m){rankedMatch=m;rankedClockServer=m.serverNow;rankedClockAt=performance.now();showScreen(m.phase==='select'?'techScreen':'battleScreen');document.getElementById('battleScreen').dataset.localPlayer=String(m.you);window.AdvancedSkills.select(m);window.AdvancedSkills.sync(m,m.serverNow);window.BattleInspector.update({enabled:!!m.state&&!m.closed,side:m.you,loadouts:{1:[0,1,2].map(i=>({name:'技'+i,description:'効果'+i})),2:[0,1,2].map(i=>({name:'技'+i,description:'効果'+i}))},names:{1:'A',2:'B'}});document.getElementById('techConfirmButton').disabled=m.ready[m.you]||rankedSending||!window.AdvancedSkills.ready(m);if(m.state)document.getElementById('gauge1Text').textContent=m.state.gauge[1]+'/10';}
    function confirmTech(){return rankedConfirm();}
    function setSkillTime(now){rankedClockServer=now;rankedClockAt=performance.now();window.AdvancedSkills.sync(rankedMatch,now);document.getElementById('countdown').textContent=now>=rankedMatch.opensAt?'10':'';}
    ${read('advanced/rules.js')}
    ${read('advanced/client.js')}
    ${confirm}`});
   await page.evaluate(m=>rankedApply(m),match);
   assert.equal(await page.locator('#advancedSkillSelection input').count(),0,'the five-row radio list is replaced by one card');
   assert.equal(await page.locator('#advancedSkillSelection .techArrow').count(),2);
   assert.equal(await page.locator('#advancedSkillSelection').getAttribute('data-skill'),'boost','the first skill is selected by default, like ordinary techniques');
   assert.equal(await page.locator('#techConfirmButton').isEnabled(),true);
   await page.getByRole('button',{name:'前のスキル',exact:true}).click();
   assert.equal(await page.locator('#advancedSkillSelection').getAttribute('data-skill'),'stance','previous wraps to the last skill');
   await page.getByRole('button',{name:'次のスキル',exact:true}).click();
   for(const id of ['heal','chain','cleanse','invincible','stance','boost']){await page.getByRole('button',{name:'次のスキル',exact:true}).click();assert.equal(await page.locator('#advancedSkillSelection').getAttribute('data-skill'),id);}
   const card=await page.locator('#advancedSkillSelection').boundingBox(),normal=await page.locator('.techCard').first().boundingBox();
   assert(Math.abs(card.width-normal.width)<1,'the skill picker occupies the same width as one ordinary technique');
   if(process.env.ADVANCED_SCREENSHOTS&&width===1365)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'advanced-skill-selection.png'),fullPage:true});
   await page.click('#techConfirmButton');await page.waitForFunction(()=>rankedMatch.ready[1]===true);
   assert.equal(await page.getByRole('button',{name:'次のスキル',exact:true}).isDisabled(),true);
   assert.equal(await page.getByRole('button',{name:'前のスキル',exact:true}).isDisabled(),true);
   assert.equal(h.get('freeGames/'+id+'/advanced/selected/1'),'boost');
   const start=(await h.transports[1]({op:'loadout',matchId:id,loadout:[0,1,2],advancedSkill:'heal'})).match;
   await page.evaluate(m=>rankedApply({...m,you:1}),start);
   if(height>680||width<640){
    const top=width>1100?16:12;
    assert.equal(await pageTop(page,'#player2Area'),top,'no empty header space remains above the opponent');
    await page.evaluate(()=>document.body.classList.add('hasRoomCode'));
    assert.equal(await pageTop(page,'#player2Area'),width>1100?64:62,'legacy room-code header still has space');
    await page.evaluate(()=>document.body.classList.remove('hasRoomCode'));
   }
   assert.equal(await page.locator('#advancedSkillWindow').isVisible(),false);
   assert.equal(await page.locator('#advancedSkillButton').isDisabled(),true);
   assert.equal((await page.locator('#advancedSkillButton').boundingBox()).width,56,'normal size outside the skill window');
   assert.equal(await page.locator('#advancedSkillButton').evaluate(n=>n.closest('.playerArea')),null,'the skill button must be outside both player panels');
   await page.evaluate(()=>{document.getElementById('battleHomeButton').hidden=false;document.getElementById('battleHomeButton').textContent='降参して戻る';document.getElementById('countdown').textContent='';});
   assert.equal(await page.locator('#battleHomeButton').isVisible(),true);
   const waitingLayout=await layout(page);
   const from=start.skillWindow.startAt;h.setClock(from);
   await page.evaluate(now=>setSkillTime(now),from);
   assert.equal(await page.locator('#battleHomeButton').isVisible(),false,'surrender is hidden for the skill window');
   assertStable(waitingLayout,await layout(page),'opening skill window at '+width+'x'+height);
   assert.equal(await page.locator('#advancedSkillWindow').isVisible(),true);
   assert.equal(await page.locator('.advancedSkillSeconds').textContent(),'3.0秒');
   assert.equal(await page.locator('#advancedSkillButton').isEnabled(),true);
   assert.equal(await page.locator('#advancedSkillButton').getAttribute('data-no-ui-se'),'','generic click sound is suppressed');
   assert.equal(await page.evaluate(()=>window.AdvancedSkills.usedForTurn(rankedMatch).length),0,'no cut-in when neither player uses a skill');
   await page.evaluate(now=>setSkillTime(now),from+1500);h.setClock(from+1500);
   assert.equal(await page.locator('.advancedSkillFill').evaluate(n=>n.style.transform),'scaleX(0.5)');
   assert.equal(await page.locator('#advancedSkillButton .advancedSkillUses').textContent(),'3/3');
   for(const skill of ['boost','heal','chain','cleanse','invincible']){
    await page.evaluate(skill=>window.AdvancedSkills.sync({...rankedMatch,advanced:{selected:{...rankedMatch.advanced.selected,1:skill}}},rankedMatch.opensAt-1000),skill);
    assert.equal(await page.locator('#advancedSkillButton').getAttribute('data-skill'),skill);
    assert.equal(await page.locator('#advancedSkillButton img, #advancedSkillButton svg, #advancedSkillButton canvas').count(),0,'art must be CSS only');
   }
   assert.equal(await page.locator('#advancedSkillButton .invincible-star').count(),1,'invincibility uses the approved star');
   await page.evaluate(()=>window.AdvancedSkills.sync({...rankedMatch,advanced:{selected:{...rankedMatch.advanced.selected,1:'stance'}}},rankedMatch.opensAt-1000));
   assert.equal(await page.locator('#advancedSkillButton .stance-blade').count(),2,'attack stance uses crossed blades');
   assert.equal(await page.locator('#advancedSkillButton .advancedSkillUses').textContent(),'3/3');
   if(process.env.ADVANCED_SCREENSHOTS&&width===390)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'attack-stance-mobile.png'),fullPage:true});
   await page.evaluate(()=>window.AdvancedSkills.sync({...rankedMatch,advanced:{selected:{...rankedMatch.advanced.selected,1:'chain'}}},rankedMatch.opensAt-1000));
   assert.equal(await page.locator('#advancedSkillButton .advancedSkillUses').textContent(),'7/7');
   await page.evaluate(()=>window.AdvancedSkills.sync({...rankedMatch,advanced:{selected:{...rankedMatch.advanced.selected,1:'invincible'}}},rankedMatch.opensAt-1000));
   assert.equal(await page.locator('#advancedSkillButton .advancedSkillUses').textContent(),'3/3');
   if(process.env.ADVANCED_SCREENSHOTS&&width===390)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'advanced-css-star-mobile.png'),fullPage:true});
   await page.evaluate(now=>setSkillTime(now),from+1500);
   const own=await page.locator('#player1Area').boundingBox(),orb=await page.locator('#advancedSkillButton').boundingBox(),lens=await page.locator('#battleInspectorToggle').boundingBox();
   assert.equal(orb.width,80);assert.equal(orb.height,80);
   assert(Math.abs(orb.x+orb.width-own.x-own.width)<2,'skill replaces the old inspector position at the panel right');
   assert.equal(await page.locator('#advancedEnemySkillButton').isDisabled(),true,'the opponent button is read-only');
   const enemy=await page.locator('#player2Area').boundingBox(),enemyOrb=await page.locator('#advancedEnemySkillButton').boundingBox();
   assert(Math.abs(lens.x+lens.width-enemy.x-enemy.width)<4,'inspector anchors at the enemy right '+JSON.stringify({width,enemy,lens}));
   assert(Math.abs(lens.y-enemy.y-enemy.height-5)<2,'inspector anchors below the enemy panel');
   assert(Math.abs(lens.x+lens.width+enemyOrb.x-2*(enemy.x+enemy.width/2))<4,'inspector and enemy skill are mirrored about the card center');
   assert.equal(enemyOrb.width,80);assert.equal(enemyOrb.height,80);
   assert(Math.abs(enemyOrb.x-enemy.x)<2,'opponent skill anchors at the enemy left');
   assert(Math.abs(enemyOrb.y-enemy.y-enemy.height-5)<2,'opponent skill anchors below the enemy panel');
   assert(Math.abs(orb.y+orb.height-own.y+5)<3,'skill stays outside the panel');
   for(const control of ['#advancedSkillButton','#advancedEnemySkillButton','#advancedSkillWindow'])for(const panel of ['#player1Area','#player2Area']){
    const a=await page.locator(control).boundingBox(),b=await page.locator(panel).boundingBox();
    assert(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),control+' overlaps '+panel+' at '+width+'x'+height);
   }
   if(process.env.ADVANCED_SCREENSHOTS&&width===390)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'advanced-skill-window-mobile.png'),fullPage:true});
   if(process.env.ADVANCED_SCREENSHOTS&&width!==390)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'advanced-skill-window-'+(width===844?'landscape':'desktop')+'.png'),fullPage:true});
   await page.click('#battleInspectorToggle');assert.equal(await page.locator('#battleInspectorPanel').isVisible(),true);
   await page.getByRole('button',{name:'閉じる',exact:true}).click();assert.equal(await page.locator('#battleInspectorPanel').isVisible(),false);
   await page.click('#advancedSkillButton');await page.waitForFunction(()=>document.querySelector('#advancedSkillButton .advancedSkillUses').textContent==='2/3');
   assert.deepEqual(await page.evaluate(()=>window.playedSkillSE),['seAdvancedSkill']);
   assert.deepEqual(await page.evaluate(()=>window.AdvancedSkills.usedForTurn(rankedMatch).map(s=>[s.player,s.id])),[[1,'boost']],'own-only activation is ready for the future cut-in');
   assert.equal(await page.locator('#gauge1Text').textContent(),'8/10','the press acknowledgement does not apply resources before the effects');assert.equal(await page.locator('#advancedSkillButton').isDisabled(),true);
   await page.evaluate(()=>document.getElementById('advancedSkillButton').click());assert.equal(h.get('freeGames/'+id+'/advanced/current/1/used'),1);
   assert.deepEqual(await page.evaluate(()=>window.playedSkillSE),['seAdvancedSkill'],'disabled retries do not replay the sound');
   await h.transports[1]({op:'advancedSkill',matchId:id,turn:1});
   const afterEnemy=(await h.transports[0]({op:'status',matchId:id})).match;await page.evaluate(m=>rankedApply(m),afterEnemy);
   assert.equal(await page.locator('#advancedEnemySkillButton .advancedSkillUses').textContent(),'1/2');
   assert.deepEqual(await page.evaluate(()=>window.AdvancedSkills.usedForTurn(rankedMatch).map(s=>[s.player,s.id])),[[1,'boost'],[2,'heal']],'both sides are supplied in player order');
   assert.deepEqual(await page.evaluate(()=>{const m=structuredClone(rankedMatch);delete m.advanced.current[1];delete m.advanced.uses[1];return window.AdvancedSkills.usedForTurn(m).map(s=>[s.player,s.id]);}),[[2,'heal']],'enemy-only activation is ready for the future cut-in');
   const activeLayout=await layout(page);
   await page.evaluate(now=>setSkillTime(now),start.skillWindow.endAt);
   assertStable(activeLayout,await layout(page),'closing skill window at '+width+'x'+height);
   assert.equal(await page.locator('#battleHomeButton').isVisible(),true,'surrender returns at the exact skill deadline');
   await page.evaluate(now=>setSkillTime(now),start.opensAt);
   assertStable(activeLayout,await layout(page),'starting action countdown at '+width+'x'+height);
   assert.equal(await page.locator('#advancedSkillWindow').isVisible(),false,'the countdown must disappear exactly at zero');
   assert.equal((await page.locator('#advancedSkillButton').boundingBox()).width,56,'own orb shrinks at the exact window deadline');
   assert.equal((await page.locator('#advancedEnemySkillButton').boundingBox()).width,56,'enemy orb also shrinks');
   if(process.env.ADVANCED_SCREENSHOTS&&width===390)await page.screenshot({path:path.join(process.env.ADVANCED_SCREENSHOTS,'advanced-action-window-mobile.png'),fullPage:true});
   await page.evaluate(()=>rankedApply({...rankedMatch,you:2}));
   const second=await page.locator('#player2Area').boundingBox(),secondOrb=await page.locator('#advancedSkillButton').boundingBox(),secondLens=await page.locator('#battleInspectorToggle').boundingBox();
   assert(Math.abs(secondOrb.x+secondOrb.width-second.x-second.width)<2,'player 2 skill follows their own panel');
   const secondEnemy=await page.locator('#player1Area').boundingBox();
   if(height>680||width<640)assert.equal(await pageTop(page,'#player1Area'),width>1100?16:12,'player 2 view also removes the empty header space');
   assert(Math.abs(secondLens.x+secondLens.width-secondEnemy.x-secondEnemy.width)<4,'player 2 inspector follows the opponent right');
   assert(Math.abs(secondLens.y-secondEnemy.y-secondEnemy.height-5)<2,'player 2 inspector stays below the opponent');
   await page.evaluate(()=>{document.getElementById('countdown').textContent='';window.AdvancedSkills.sync(rankedMatch,rankedMatch.skillWindow.startAt);});
   assert.equal(await page.locator('#battleHomeButton').isVisible(),false,'player 2 also hides surrender during selection');
   await page.setViewportSize({width:width-10,height:height-10});
   const resizedEnemy=await page.locator('#player1Area').boundingBox(),resizedLens=await page.locator('#battleInspectorToggle').boundingBox();
   assert(Math.abs(resizedLens.x+resizedLens.width-resizedEnemy.x-resizedEnemy.width)<4,'inspector follows the opponent after viewport resize');
   const resizedLayout=await layout(page);
   await page.evaluate(now=>setSkillTime(now),start.skillWindow.endAt);
   assertStable(resizedLayout,await layout(page),'player 2 closing skill window after resize');
   await page.evaluate(()=>window.AdvancedSkills.sync({...rankedMatch,closed:true},rankedMatch.skillWindow.startAt));
   assert.equal(await page.locator('#battleHomeButton').isVisible(),true,'closed matches always keep the home button available');
   await page.setViewportSize({width,height});
   await page.evaluate(()=>rankedApply({...rankedMatch,roomRules:{mode:'standard',hp:10,initialGauge:8,maxGauge:10}}));
   assert.equal(await page.locator('#advancedSkillDock').isVisible(),false);assert.equal(await page.locator('#advancedSkillWindow').isVisible(),false);
   assert.equal(await page.locator('#advancedEnemySkillDock').isVisible(),false);
   assert.equal(await page.locator('#battleScreen').evaluate(n=>n.classList.contains('advancedMode')),false);
   assert.equal(await page.locator('#battleInspectorToggle').isVisible(),true,'Standard keeps its inspector');
   assert.equal(await page.locator('#battleHomeButton').isVisible(),true,'Standard keeps its home button');
   const standardEnemy=await page.locator('#player1Area').boundingBox(),standardLens=await page.locator('#battleInspectorToggle').boundingBox();
   assert(Math.abs(standardLens.x+standardLens.width-standardEnemy.x-standardEnemy.width)<4,'Standard inspector anchors at the opponent right');
   assert(Math.abs(standardLens.y-standardEnemy.y-standardEnemy.height-5)<2,'Standard inspector stays below the opponent');
   if(height>680||width<640){
    assert.equal(await pageTop(page,'#player1Area'),width>1100?16:12,'Standard also removes the empty header space');
    await page.evaluate(()=>{document.getElementById('battleScreen').classList.add('spectatorMode');document.getElementById('battleScreen').style.setProperty('--safe-top','20px');});
    assert.equal(await pageTop(page,'#player1Area'),(width>1100?64:62)+20,'spectator header and safe-area inset are preserved');
    await page.evaluate(()=>{document.getElementById('battleScreen').classList.remove('spectatorMode');document.getElementById('battleScreen').style.removeProperty('--safe-top');});
   }
   await page.evaluate(()=>{window.AdvancedSkills.sync({...rankedMatch,roomRules:{mode:'advanced'}},rankedMatch.skillWindow.startAt);window.AdvancedSkills.reset();});
   assert.equal(await page.locator('#battleHomeButton').isVisible(),true,'reset restores the home button even during the skill window');
   await page.evaluate(()=>{const now=rankedMatch.opensAt;window.AdvancedSkills.sync({...rankedMatch,roomRules:{mode:'advanced'},state:{...rankedMatch.state,skillsExhausted:true},skillWindow:{startAt:now,endAt:now},advanced:{selected:{1:'boost',2:'heal'},current:{1:{used:3},2:{used:2}}}},now);});
   assert.equal(await page.locator('#advancedSkillWindow').isVisible(),false,'both skills spent: no selection window');
   assert.equal(await page.locator('#battleHomeButton').isVisible(),true,'both skills spent: keep surrender available');
   assert.equal((await page.locator('#advancedSkillButton').boundingBox()).width,56,'both skills spent: no enlarged skill buttons');
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: actual skill selection/activation; mirrored opponent-card inspector, resize, stable panel/document/scroll geometry across 3-second selection and action countdown, surrender visibility, both player sides, Standard/closed/reset cleanup on desktop/mobile/landscape');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

