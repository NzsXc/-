const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {harness}=require('./rules-harness.cjs');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const spectator=html.slice(html.indexOf('let spectatorActive = false;'),html.indexOf('function startOnlineMatch(type){'));
const filter=html.slice(html.indexOf('  function activeBattles(rooms){'),html.indexOf('  window.onlineBattle ='));
const result=html.slice(html.indexOf('function showBattleResult(text){'),html.indexOf('/* =========================\r\n   UI更新',html.indexOf('function showBattleResult(text){')));
assert(spectator.includes('enterSpectator')&&result.includes('resultShow'));
const protectedSource=fs.readFileSync(path.join(root,'protected-rooms.js'),'utf8').replace(/^import[^\n]*\n/gm,'').replace('export function','function');
const css=html.match(/#battleScreen\.spectatorMode \.action\{[^}]+\}/)[0];
const fixture=`<!doctype html><html lang="ja"><meta charset="utf-8"><style>${css}</style>
<div id="onlineScreen" class="screen"><button id="open" onclick="openSpectatorList()">観戦</button></div>
<div id="spectatorListScreen" class="screen" hidden><div id="spectatorList"></div><button onclick="closeSpectatorList()">戻る</button></div>
<div id="battleScreen" class="screen" hidden><div id="player1Area"><span class="playerNameText"></span><span id="hp1"></span><button class="action">アタック</button></div><div id="player2Area"><span class="playerNameText"></span><span id="hp2"></span></div><div id="countdown"></div><div id="resultMessage"></div><button id="battleHomeButton">戻る</button><section id="spectatorLoadouts" hidden></section></div>
<script src="/bot-engine.js"></script><script>
const db={},auth={currentUser:{uid:'viewer'},authStateReady:async()=>{}},ref=(db,path)=>({path});
async function get(r){const response=await fetch('/read?path='+encodeURIComponent(r.path));if(!response.ok)throw Error('permission_denied');const value=await response.json();return {val:()=>value};}
function onValue(r,callback,onError){let stopped=false;get(r).then(value=>{if(!stopped)callback(value);},onError);return ()=>{stopped=true;};}
function set(){throw Error('spectator write');}const update=set,remove=set,push=set,onDisconnect=set,serverTimestamp=Date.now,signInAnonymously=set;
let gameMode=null,onlineBattleStarted=false,onlineTurnNumber=0,hp={1:10,2:10},gauge={1:8,2:8},enhanceTurns={},blockSeal={},ruinTurns={},lastAction={},selectedAction={},locked={},player1Techs=[],player2Techs=[],countdownTimer=null,countdownFinishTimeout=null;
const techniquePool=window.BattleAI.techniques,ONLINE_REVEAL_MS=1300,PlayerIntro={cancel(){}},PRESENCE_GRACE_MS=60000,serverTimeOffset=0;
function showScreen(id){document.querySelectorAll('.screen').forEach(node=>node.hidden=node.id!==id);}
function resetOnlineMatchState(){}function clearOnlineTechniqueDescription(){}function stopBattleBGM(){}function stopCountdownRing(){}function stopTurnCountdownSE(){}function showTechniqueReveal(){}function playBattleSituationSE(){}function playBattleEffect(a,b,done){done();}
function updateBattleUI(){document.getElementById('hp1').textContent=hp[1];document.getElementById('hp2').textContent=hp[2];}
function onlineNow(){return window.protectedRooms.now();}
${protectedSource}
window.protectedRooms=createProtectedRooms(db,auth,async data=>{if(data.op!=='profile')throw Error('spectator mutation');}, {find:async id=>(await get(ref(db,'battleHistory/'+id))).val()});
${filter}
window.onlineBattle={watchAllRooms:protectedRooms.watchAllRooms,watchRoom:protectedRooms.watchRoom,filterActiveBattles:activeBattles,now:protectedRooms.now};
${spectator}
${result}
</script></html>`;
(async()=>{
 const h=harness(),base=h.get('freeGames/match'),requests=[];
 h.setClock(Date.now());h.put('freeGames/match/state',{...base.state,startedAt:Date.now()-7000});
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return;}
  if(url.pathname==='/bot-engine.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'bot-engine.js')));return;}
  if(url.pathname==='/read'){const p=url.searchParams.get('path');requests.push(p);if(p!=='.info/serverTimeOffset'&&!h.allowed('.read',p,'viewer')){res.writeHead(403);res.end();return;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify(p==='.info/serverTimeOffset'?0:h.get(p)));return;}
  res.writeHead(404);res.end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,timeout:12000,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load',timeout:10000});await page.click('#open');
  await page.waitForFunction(()=>document.querySelectorAll('#spectatorList .spectatorRow').length===1,{},{timeout:5000});
  assert.equal(await page.locator('.spectatorRow').textContent(),'AVSB');await page.click('.spectatorRow');
  await page.waitForFunction(()=>document.getElementById('hp1').textContent==='10',{},{timeout:5000});
  assert.equal(await page.locator('#battleScreen').evaluate(node=>node.hidden),false);
  assert.equal(await page.locator('.action').evaluate(node=>getComputedStyle(node).pointerEvents),'none');
  assert.equal(await page.locator('#spectatorLoadouts details').count(),6);
  h.put('freeGames/match/state',{...base.state,turn:2,startedAt:Date.now()-10000,hp1:7,hp2:8});
  await page.waitForFunction(()=>document.getElementById('hp1').textContent==='7'&&document.getElementById('hp2').textContent==='8',{},{timeout:5000});
  h.put('battleHistory/match',{kind:'random',players:{1:{name:'A',loadout:[0,1,2]},2:{name:'B',loadout:[0,1,2]}},settled:{winner:2},finalState:{...base.state,turn:3,hp1:0,hp2:8}});h.put('freeGames/match',null);
  await page.waitForFunction(()=>document.getElementById('resultMessage').textContent==='B WIN',{},{timeout:5000});
  await page.click('#spectatorBadge button');assert.equal(await page.locator('#onlineScreen').evaluate(node=>node.hidden),false);
  const count=requests.length;await page.waitForTimeout(1400);assert.equal(requests.length,count,'leaving releases all polling/list subscriptions');
  assert(!requests.some(p=>/^freeGames(?:\/[^/]+)?$/.test(p)||/\/(moves|advance)(?:\/|$)/.test(p)));assert.deepEqual(errors,[]);
  console.log('PASS: real browser list → random-match entry → read-only techniques/HP updates → archived result → exit; actual Firebase rules enforced');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
