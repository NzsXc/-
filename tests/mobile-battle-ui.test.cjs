const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html').replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<script\b[^>]*src="\.\/pwa-register[^>]*><\/script>/g,'');
const measure=page=>page.evaluate(()=>({boxes:['player1Area','player2Area','battleCenter','actions1','actions2'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,r.x,r.y,r.width,r.height];}),height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,scroll:scrollY}));
function stable(a,b,label){assert.equal(b.height,a.height,label+' document height');assert.equal(b.width,a.width,label+' document width');assert.equal(b.scroll,a.scroll,label+' scroll');for(let i=0;i<a.boxes.length;i++)for(let k=1;k<5;k++)assert(Math.abs(a.boxes[i][k]-b.boxes[i][k])<.1,label+' '+a.boxes[i][0]+' '+k+': '+JSON.stringify([a.boxes[i],b.boxes[i]]));}
async function setup(page){
 await page.route('https://mobile.test/**',route=>{
  const name=decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
  if(!name)return route.fulfill({contentType:'text/html',body:html});
  const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  const ext=path.extname(file),type={'.js':'text/javascript','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg','.json':'application/json'}[ext];
  return route.fulfill({contentType:type||'text/plain',body:fs.readFileSync(file)});
 });
 await page.goto('https://mobile.test/');
 await page.evaluate(()=>{document.getElementById('openingTransition')?.remove();HTMLMediaElement.prototype.play=()=>Promise.resolve();HTMLMediaElement.prototype.pause=()=>{};window.rankedTransport=async()=>({match:rankedMatch});});
}
async function battle(page,{mode='standard',skills=false,you=1,hp=10}={}){
 await page.evaluate(({mode,skills,you,maxHp})=>{
  rankedStop();rankedActive=true;rankedMatch=null;rankedSeenReveal=0;
  const pair=value=>[null,value,value],rules=mode==='standard'?{mode,hp:maxHp,initialGauge:8,maxGauge:10}:{mode,hp:maxHp,initialGauge:8,maxGauge:10,skills,special:true};
  const m={id:'mobile-'+mode+'-'+skills+'-'+you,kind:'friend',rulesVersion:mode==='standard'?2:3,roomRules:rules,you,players:{1:{name:'プレイヤー1',titles:[]},2:{name:'プレイヤー2',titles:[]}},ready:{1:true,2:true},loadouts:{1:[0,7,10],2:[0,7,10]},state:{turn:4,hp:pair(maxHp-2),gauge:pair(8),seal:pair(false),enhance:pair(0),momentum:pair(false),ruin:pair(0),last:pair(''),specialSeal:pair(0),specialRuin:pair(0),specialMomentum:pair(0)},closed:false,phase:'turn',revision:20000,serverNow:20000,opensAt:19000,deadline:29000,graceDeadline:59000,ownAction:null,reveal:null};
  if(mode==='advanced'){m.special={version:2,max:30,gauge:{1:30,2:30}};m.advanced={selected:{1:'stance',2:'heal'}};m.skillWindow={startAt:15500,endAt:18500,confirmAt:19000};}
  rankedApply(m);window.mobileMatch=m;stopTurnCountdownSE();
 },{mode,skills,you,maxHp:hp});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const [width,height]of [[390,844],[320,640],[844,390]])for(const you of [1,2]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2}),errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
   for(const [mode,skills]of [['standard',false],['advanced',false],['advanced',true]]){
    await battle(page,{mode,skills,you,hp:mode==='standard'?10:12});
    await page.evaluate(()=>{cancelAnimationFrame(rankedFrame);rankedFrame=0;});
    const initial=await measure(page);
    for(let turn=0;turn<3;turn++){
     await page.evaluate(()=>{rankedAnimating=true;syncBattleInspector();document.getElementById('battleHomeButton').hidden=true;document.getElementById('countdown').textContent='';document.getElementById('resultMessage').textContent='';});
     stable(initial,await measure(page),'hidden controls '+width+' '+mode+' '+skills);
     await page.evaluate(()=>{rankedAnimating=false;syncBattleInspector();document.getElementById('battleHomeButton').hidden=false;document.getElementById('countdown').textContent='10';document.getElementById('resultMessage').textContent='相手の行動を待っています…';});
     stable(initial,await measure(page),'visible controls '+width+' '+mode+' '+skills);
    }
    await page.evaluate(()=>{setPlayerNames('とても長いプレイヤー名の表示テスト','とても長いプレイヤー名の表示テスト');for(const p of [1,2]){enhanceTurns[p]=2;blockSeal[p]=true;ruinTurns[p]=3;momentumBonus[p]=true;lastAction[p]={data:{type:'block'}};}updateBattleUI();});
    stable(initial,await measure(page),'status badges '+width+' '+mode+' '+skills);
    await page.evaluate(()=>{setPlayerNames('プレイヤー1','プレイヤー2');rankedPaintState(mobileMatch);});
    if(mode==='advanced'){
     for(let group=0;group<4;group++){
      await page.evaluate(group=>{mobileMatch.loadouts[mobileMatch.you]=[group*3,group*3+1,group*3+2];SpecialGauge.paintBattle(mobileMatch);},group);
      await page.locator('#specialSwitchDock button').click();
      stable(initial,await measure(page),'S explanation '+width+' '+skills);
      const descriptions=await page.locator('#player'+you+'Area .specialMoveExplanation').evaluateAll(nodes=>nodes.map(n=>({text:n.innerText,overflow:n.scrollHeight>n.clientHeight+1,disabled:n.closest('button').disabled})));
      assert.equal(descriptions.length,3);assert(descriptions.every(d=>d.text.startsWith('S')&&d.disabled&&!d.overflow),JSON.stringify({width,descriptions}));
      assert.equal(await page.evaluate(you=>isBattleActionAvailable(you,'charge'),you),false,'explanatory cards cannot send a basic action through the keyboard');
      await page.locator('#specialSwitchDock button').click();stable(initial,await measure(page),'normal controls restored');
      assert.equal(await page.locator('#player'+you+'Area [data-action="charge"]').isDisabled(),false);
     }
     if(skills){await page.evaluate(()=>AdvancedSkills.sync(mobileMatch,16000));stable(initial,await measure(page),'skill window');await page.evaluate(()=>AdvancedSkills.sync(mobileMatch,20000));stable(initial,await measure(page),'skill window ended');}
    }
    await page.evaluate(()=>{const bar=document.getElementById('hp1Fill').parentElement;bar.style.width='';});
    const hpGeometry=await page.locator('#hp1Fill').evaluate(fill=>{const bar=fill.parentElement,r=bar.getBoundingClientRect(),f=fill.getBoundingClientRect(),cs=getComputedStyle(bar),s=getComputedStyle(fill),b=parseFloat(cs.borderLeftWidth);return {inner:r.width-b-parseFloat(cs.borderRightWidth),fill:f.width,max:Number(cs.getPropertyValue('--hp-max')),shadow:s.boxShadow,grid:getComputedStyle(bar,'::after').backgroundImage};});
    assert.equal(hpGeometry.max,mode==='standard'?10:12);assert(Math.abs(hpGeometry.fill-hpGeometry.inner*(hpGeometry.max-2)/hpGeometry.max)<.03);assert(hpGeometry.shadow.includes('inset'));assert(hpGeometry.grid.startsWith('repeating-linear-gradient'));
    console.log('PASS stable turn geometry and HP grid '+width+'x'+height+' side='+you+' '+mode+' skills='+skills);
   }
   assert.deepEqual(errors,[]);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
