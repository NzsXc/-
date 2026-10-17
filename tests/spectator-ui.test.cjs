const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {harness}=require('./rules-harness.cjs');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const spectator=html.slice(html.indexOf('let spectatorActive = false;'),html.indexOf('function startOnlineMatch(type){'));
const filter=html.slice(html.indexOf('  function activeBattles(rooms){'),html.indexOf('  window.onlineBattle ='));
const result=html.slice(html.indexOf('function showBattleResult(text){'),html.indexOf('/* =========================\r\n   UI更新',html.indexOf('function showBattleResult(text){')));
assert(spectator.includes('enterSpectator')&&result.includes('resultShow'));
const protectedSource=fs.readFileSync(path.join(root,'protected-rooms.js'),'utf8').replace(/^import[^\n]*\n/gm,'').replace('export function','function');
const battleUI=html.slice(html.indexOf('let displayedHp='),html.indexOf('function startMenuBGM(){'));
const playerMarkup=side=>`<div id="player${side}Area"><div class="playerName"><span class="playerNameText"></span></div><span id="hp${side}Text"></span><div id="hp${side}Fill"></div><span id="gauge${side}Text"></span><div id="gauge${side}Fill"></div>${['charge','attack','block',0,1,2].map(action=>`<button class="action" data-action="${action}" ${typeof action==='number'?`id="p${side}tech${action}"`:''}><span class="actionName"></span></button>`).join('')}</div>`;
const css=html.match(/#battleScreen\.spectatorMode \.action\{[^}]+\}/)[0];
const fixture=`<!doctype html><html lang="ja"><meta charset="utf-8"><style>${css}</style>
<div id="onlineScreen" class="screen"><button id="open" onclick="openSpectatorList()">観戦</button></div>
<div id="spectatorListScreen" class="screen" hidden><div id="spectatorList"></div><button onclick="closeSpectatorList()">戻る</button></div>
<div id="battleScreen" class="screen" hidden>${playerMarkup(1)}${playerMarkup(2)}<div id="countdown"></div><div id="resultMessage"></div><button id="battleHomeButton">戻る</button><section id="spectatorLoadouts" hidden></section></div>
<script src="/bot-engine.js"></script><script>
const db={},auth={currentUser:{uid:'viewer'},authStateReady:async()=>{}},ref=(db,path)=>({path});
async function get(r){const response=await fetch('/read?path='+encodeURIComponent(r.path));if(!response.ok)throw Error('permission_denied');const value=await response.json();return {val:()=>value};}
function onValue(r,callback,onError){let stopped=false;get(r).then(value=>{if(!stopped)callback(value);},onError);return ()=>{stopped=true;};}
function set(){throw Error('spectator write');}const update=set,remove=set,push=set,onDisconnect=set,serverTimestamp=Date.now,signInAnonymously=set;
let gameMode=null,onlineBattleStarted=false,onlineTurnNumber=0,hp={1:10,2:10},gauge={1:8,2:8},enhanceTurns={},blockSeal={},ruinTurns={},lastAction={},momentumBonus={},rankedActive=false,rankedMatch=null,botMatch=null,selectedAction={},locked={},player1Techs=[],player2Techs=[],countdownTimer=null,countdownFinishTimeout=null;
const techniquePool=window.BattleAI.techniques,ONLINE_REVEAL_MS=1300,PlayerIntro={cancel(){},isActive(){return false;}},PRESENCE_GRACE_MS=60000,serverTimeOffset=0;
function showScreen(id){document.querySelectorAll('.screen').forEach(node=>node.hidden=node.id!==id);}
function resetOnlineMatchState(){}function clearOnlineTechniqueDescription(){}function stopBattleBGM(){}function stopCountdownRing(){}function stopTurnCountdownSE(){}function showTechniqueReveal(){}function playBattleSituationSE(){}function playBattleEffect(a,b,done){done();}
const basicActions={attack:window.BattleAI.ACTIONS[1]};
${battleUI}
function onlineNow(){return window.protectedRooms.now();}
${protectedSource}
window.protectedRooms=createProtectedRooms(db,auth,async data=>{if(data.op!=='profile')throw Error('spectator mutation');}, {find:async id=>(await get(ref(db,'battleHistory/'+id))).val()});
${filter}
window.onlineBattle={watchAllRooms:protectedRooms.watchAllRooms,watchRoom:protectedRooms.watchRoom,filterActiveBattles:activeBattles,now:protectedRooms.now};
${spectator}
${result}
</script></html>`;
(async()=>{
 const h=harness(),base=h.get('freeGames/match'),requests=[];let failReads=false;
 h.setClock(Date.now());h.put('freeGames/match/state',{...base.state,turn:2,startedAt:Date.now()-7000,last1:'block',last2:'reflect'});
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return;}
  if(url.pathname==='/bot-engine.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'bot-engine.js')));return;}
  if(url.pathname==='/read'){const p=url.searchParams.get('path');requests.push(p);if(failReads&&p==='freeGames/match/state'){res.writeHead(503);res.end();return;}if(p!=='.info/serverTimeOffset'&&!h.allowed('.read',p,'viewer')){res.writeHead(403);res.end();return;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify(p==='.info/serverTimeOffset'?0:h.get(p)));return;}
  res.writeHead(404);res.end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,timeout:12000,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&message.text().includes('観戦画面の更新に失敗しました'))errors.push(message.text());});
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load',timeout:10000});await page.click('#open');
  await page.waitForFunction(()=>document.querySelectorAll('#spectatorList .spectatorRow').length===1,{},{timeout:5000});
  assert.equal(await page.locator('.spectatorRow').textContent(),'AVSB');await page.click('.spectatorRow');
  await page.waitForFunction(()=>document.getElementById('hp1Text').textContent==='10/10',{},{timeout:5000});
  assert.equal(await page.locator('#battleScreen').evaluate(node=>node.hidden),false);
  assert.equal(await page.locator('#resultMessage').textContent(),'','joining after an action must not show a connection error');
  assert.equal(await page.locator('#p1BlockRepeat').evaluate(node=>node.hidden),false);
  assert.equal(await page.locator('#p2CounterRepeat').evaluate(node=>node.hidden),false);
  assert.equal(await page.locator('.action').first().evaluate(node=>getComputedStyle(node).pointerEvents),'none');
  assert.equal(await page.locator('#spectatorLoadouts details').count(),6);
  h.put('freeGames/match/state',{...base.state,turn:3,startedAt:Date.now()-10000,hp1:7,hp2:8,last1:'attack',last2:'charge'});
  await page.waitForFunction(()=>document.getElementById('hp1Text').textContent==='7/10'&&document.getElementById('hp2Text').textContent==='8/10',{},{timeout:5000});
  assert.equal(await page.locator('#resultMessage').textContent(),'','normal turns must not leave an error overlay');
  assert.equal(await page.locator('#p1BlockRepeat').evaluate(node=>node.hidden),true);
  failReads=true;
  await page.waitForFunction(()=>document.getElementById('spectatorConnectionStatus')?.hidden===false,{},{timeout:5000});
  assert.equal(await page.locator('#resultMessage').textContent(),'');
  assert.equal(await page.locator('#battleHomeButton').evaluate(node=>node.hidden),true,'a retry is not a finished match');
  failReads=false;
  h.put('freeGames/match/state',{...base.state,turn:4,startedAt:Date.now()-10000,hp1:6,hp2:8,last1:'charge',last2:'attack'});
  await page.waitForFunction(()=>document.getElementById('hp1Text').textContent==='6/10'&&document.getElementById('spectatorConnectionStatus').hidden,{},{timeout:5000});
  assert.equal(await page.locator('#resultMessage').textContent(),'');
  h.put('battleHistory/match',{kind:'random',players:{1:{name:'A',loadout:[0,1,2]},2:{name:'B',loadout:[0,1,2]}},settled:{winner:2},finalState:{...base.state,turn:5,hp1:0,hp2:8}});h.put('freeGames/match',null);
  await page.waitForFunction(()=>document.getElementById('resultMessage').textContent==='B WIN',{},{timeout:5000});
  failReads=true;
  await page.waitForFunction(()=>document.getElementById('spectatorConnectionStatus').hidden===false,{},{timeout:5000});
  assert.equal(await page.locator('#resultMessage').textContent(),'B WIN','a failed retry must preserve the final result');
  await page.click('#spectatorBadge button');assert.equal(await page.locator('#onlineScreen').evaluate(node=>node.hidden),false);
  const count=requests.length;await page.waitForTimeout(1400);assert.equal(requests.length,count,'leaving releases all polling/list subscriptions');
  assert(!requests.some(p=>/^freeGames(?:\/[^/]+)?$/.test(p)||/\/(moves|advance)(?:\/|$)/.test(p)));assert.deepEqual(errors,[]);
  console.log('PASS: real battle UI: mid-match entry, previous-action indicators, HP updates, transient read failure/recovery, archived result preserved and exit; actual Firebase rules enforced');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
