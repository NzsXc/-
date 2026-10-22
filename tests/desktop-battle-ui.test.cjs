const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('index.html').replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<script\b[^>]*src="\.\/pwa-register[^>]*><\/script>/g,'');
const measure=page=>page.evaluate(()=>({boxes:['player1Area','player2Area','battleCenter','actions1','actions2'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,r.x,r.y,r.width,r.height];}),height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,scroll:scrollY}));
function stable(a,b,label){assert.equal(b.height,a.height,label+' document height');assert.equal(b.width,a.width,label+' document width');assert.equal(b.scroll,a.scroll,label+' scroll');for(let i=0;i<a.boxes.length;i++)for(let k=1;k<5;k++)assert(Math.abs(a.boxes[i][k]-b.boxes[i][k])<.1,label+' '+a.boxes[i][0]+' '+k+': '+JSON.stringify([a.boxes[i],b.boxes[i]]));}
async function controlsFit(page,label){
 const issues=await page.evaluate(()=>{
  const issues=[],safe=getComputedStyle(document.documentElement),inset=side=>parseFloat(safe.getPropertyValue('--safe-'+side))||0;
  const controls=[...document.querySelectorAll('#battleScreen .action,#battleHomeButton,.advancedSkillDock button,.specialSwitchDock button,#battleInspectorToggle')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(n).visibility!=='hidden';});
  for(const n of controls){
   const r=n.getBoundingClientRect(),id=n.id||n.dataset.action||n.className;
   if(r.left<inset('left')+3||r.top<inset('top')+3||r.right>innerWidth-inset('right')-3||r.bottom>innerHeight-inset('bottom')-3)issues.push(id+' outside safe viewport');
   if(r.width<43.9||r.height<(n.matches('.action')?47.9:43.9))issues.push(id+' touch target too small');
   if(n.matches('.action')&&innerWidth<640&&innerHeight-inset('top')-inset('bottom')>=800&&r.height<71.9)issues.push(id+' does not use available portrait height');
   const name=n.querySelector('.actionName');if(name&&getComputedStyle(name).visibility!=='hidden'){const t=name.getBoundingClientRect();if(t.top<r.top||t.bottom>r.bottom||t.left<r.left||t.right>r.right)issues.push(id+' clipped name');}
  }
  for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=controls[i].getBoundingClientRect(),b=controls[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.5)issues.push((controls[i].id||controls[i].dataset.action)+' overlaps '+(controls[j].id||controls[j].dataset.action));}
  return issues;
 });
 assert.deepEqual(issues,[],label);
}
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
  if(mode!=='standard'){m.special={version:3,max:30,gauge:{1:30,2:30}};m.advanced={selected:{1:'stance',2:'heal'}};m.skillWindow={startAt:15500,endAt:18500,confirmAt:19000};}
  rankedApply(m);window.mobileMatch=m;stopTurnCountdownSE();
 },{mode,skills,you,maxHp:hp});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const [width,height]of [[1024,600],[1101,720],[1280,600],[1280,720],[1366,768],[1536,864],[1920,1080]])for(const you of [1,2]){
   const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
   for(const [mode,skills]of [['standard',false],['advanced',false],['advanced',true],['custom',true]]){
    await battle(page,{mode,skills,you});
    await page.evaluate(()=>{cancelAnimationFrame(rankedFrame);rankedFrame=0;document.body.classList.add('hasRoomCode');document.getElementById('roomCodeButton').hidden=false;AdvancedSkills.sync(mobileMatch,20000);SpecialGauge.paintBattle(mobileMatch);syncBattleInspector();});
    const center=await page.locator('#battleCenter').evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:innerWidth,h:innerHeight};});assert(Math.abs(center.x-center.w/2)<.1&&Math.abs(center.y-center.h/2)<.1,'arena center '+JSON.stringify(center));
    const digit=await page.locator('#countdown').evaluate(n=>{const r=n.getBoundingClientRect();return [Math.abs(r.x+r.width/2-innerWidth/2),Math.abs(r.y+r.height/2-innerHeight/2)];});assert(digit.every(d=>d<.1),'desktop countdown centered');
    const initial=await measure(page);assert(initial.width<=width&&initial.height<=height,'viewport fit '+[width,height,mode,you]);
    await controlsFit(page,'desktop controls '+[width,height,mode,you]);
    const buttons=await page.locator('#player'+you+'Area .action').evaluateAll(nodes=>nodes.map(n=>({height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width,font:parseFloat(getComputedStyle(n.querySelector('.actionName')).fontSize)})));
    assert(buttons.every(b=>b.height>=(height<=680?64:72)&&b.width>=100&&b.font>=14),'larger desktop buttons '+JSON.stringify(buttons));
    await page.evaluate(()=>{rankedAnimating=true;document.getElementById('battleHomeButton').hidden=true;document.getElementById('countdown').textContent='';});stable(initial,await measure(page),'desktop turn stability');
    await page.evaluate(()=>{rankedAnimating=false;document.getElementById('battleHomeButton').hidden=false;});
    if(mode!=='standard'){
     await page.locator('#specialSwitchDock button').click();await controlsFit(page,'S desktop controls');stable(initial,await measure(page),'S desktop stability');
     await page.locator('#specialSwitchDock button').click();
    }
    if(process.env.DESKTOP_SCREENSHOT&&width===1366&&you===1&&mode==='standard')await page.screenshot({path:process.env.DESKTOP_SCREENSHOT});
   }
   assert.deepEqual(errors,[]);await page.close();console.log('PASS desktop '+width+'x'+height+' side='+you);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
