const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const markup=html.slice(html.indexOf('<div id="friendLobbyScreen"'),html.indexOf('<div id="spectatorListScreen"'));
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const fixture=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style>${markup}<script>
let gameMode=null,rankedActive=false,rankedMatch=null,rankedCancelled=false,rankedSeenReveal=0,onlineMatchType=null,selectedTechniques={},rankedEpoch=0;
function stopBot(){}function resetOnlineMatchState(){}function rankedApply(m){window.enteredMatch=m;}function rankedPoll(){}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));}
window.creations=[];window.joined=[];window.failCreate=false;
window.protectedRooms={now:Date.now,resume:async()=>({}),leave:async()=>({}),watchHost:()=>()=>{},
 watchList(callback){callback({legacy:{name:'旧ルーム',game:'',heartbeat:Date.now()},custom:{name:'カスタムホスト',game:'',heartbeat:Date.now(),roomRules:{mode:'custom',hp:20,initialGauge:4,maxGauge:15}}});return ()=>{};},
 create:async rules=>{window.creations.push(rules);await new Promise(r=>setTimeout(r,100));if(window.failCreate)throw Error('テスト用の通信失敗');return 'createdRoom';},
 join:async id=>{window.joined.push(id);return {match:{id,roomRules:{mode:'custom',hp:20,initialGauge:4,maxGauge:15}}};}
};
${fs.readFileSync(path.join(root,'room-rules.js'),'utf8')}
${fs.readFileSync(path.join(root,'lobby-client.js'),'utf8')}
</script></html>`;
(async()=>{
 const browser=await chromium.launch({headless:true,timeout:12000,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const width of [1365,390]){
   const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(fixture);await page.evaluate(()=>openFriendLobby());
   assert.deepEqual(await page.locator('.friendRoomMode').allTextContents(),['Standard','Custom']);
   assert.match(await page.locator('.friendRoomSummary').textContent(),/HP 20.*初期ゲージ 4.*最大ゲージ 15/);
   await page.click('#friendCreateButton');assert.equal(await page.locator('#friendRuleScreen').evaluate(n=>n.classList.contains('active')),true);
   assert.deepEqual(await page.evaluate(()=>window.creations),[],'opening settings must not create a room');
   assert.equal(await page.locator('input[value="advanced"]').isEnabled(),true);
   assert.equal(await page.locator('#friendCustomRules').isVisible(),false);
   if(process.env.FRIEND_ROOM_SCREENSHOTS&&width===1365)await page.screenshot({path:path.join(process.env.FRIEND_ROOM_SCREENSHOTS,'friend-room-standard-desktop.png')});
   await page.click('#friendRuleCancel');assert.deepEqual(await page.evaluate(()=>window.creations),[],'cancel must not create a room');
   await page.click('#friendCreateButton');await page.click('#friendRuleSubmit');await page.waitForFunction(()=>document.getElementById('friendCreateButton').hidden);
   assert.deepEqual(await page.evaluate(()=>window.creations),[{mode:'standard',hp:10,initialGauge:8,maxGauge:10}]);
   assert.match(await page.locator('#friendLobbyStatus').textContent(),/Standard/);
   // Fresh lobby: validate Custom, recover from a failed creation, then submit once.
   await page.evaluate(()=>openFriendLobby());await page.click('#friendCreateButton');await page.check('input[value="custom"]');
   await page.fill('#friendRuleHp','20');await page.fill('#friendRuleMaxGauge','3');await page.fill('#friendRuleInitialGauge','4');
   await page.click('#friendRuleSubmit');assert.equal(await page.evaluate(()=>window.creations.length),1);
   await page.fill('#friendRuleMaxGauge','15');await page.fill('#friendRuleInitialGauge','4');
   if(process.env.FRIEND_ROOM_SCREENSHOTS&&width===390)await page.screenshot({path:path.join(process.env.FRIEND_ROOM_SCREENSHOTS,'friend-room-custom-mobile.png')});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'settings must fit the viewport');
   await page.evaluate(()=>window.failCreate=true);await page.click('#friendRuleSubmit');
   await page.waitForFunction(()=>document.getElementById('friendRuleStatus').textContent.includes('通信失敗'));
   assert.equal(await page.locator('#friendRuleSubmit').isEnabled(),true);assert.equal(await page.locator('input[value="advanced"]').isEnabled(),true);
   await page.evaluate(()=>window.failCreate=false);await page.dblclick('#friendRuleSubmit');
   await page.waitForFunction(()=>document.getElementById('friendLobbyScreen').classList.contains('active'));
   assert.equal(await page.evaluate(()=>window.creations.length),3,'double-click must issue one create');
   assert.deepEqual(await page.evaluate(()=>window.creations.at(-1)),{mode:'custom',hp:20,initialGauge:4,maxGauge:15});
   await page.evaluate(()=>openFriendLobby());await page.locator('.friendRoomButton').filter({hasText:'Custom'}).click();
   assert.deepEqual(await page.evaluate(()=>window.joined),['custom']);assert.equal(await page.evaluate(()=>window.enteredMatch.roomRules.maxGauge),15);
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: actual lobby/settings UI at desktop and mobile widths; no early creation, Standard, Advanced available, Custom validation, cancel/retry, single creation, room badges/details and join');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
