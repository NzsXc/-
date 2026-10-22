const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g, '')
  .replace(/<script\b[^>]*src="\.\/pwa-register[^>]*><\/script>/g, '');
const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.json':'application/json'};

(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  try {
    for (const [width, height] of [[1365,900], [390,844], [320,640], [844,390]]) {
      const page = await browser.newPage({viewport:{width,height}});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== 'psycho.test') return route.abort();
        if (url.pathname === '/') return route.fulfill({contentType:'text/html', body:html});
        const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404,body:''});
        return route.fulfill({contentType:mime[path.extname(file)] || 'application/octet-stream',body:fs.readFileSync(file)});
      });
      await page.goto('http://psycho.test/');
      await page.evaluate(() => {
        document.getElementById('openingTransition').remove();
        HTMLMediaElement.prototype.play = () => Promise.resolve();
        showScreen('modeScreen');
        const state={uid:'p1',canVote:true,connected:true,loaded:{techniques:true,skills:true,specialTechniques:true},errors:{},ballots:{specialTechniques:{},techniques:{p1:{tech1:10,tech2:9,tech3:8,tech4:7},p2:{tech1:8,tech2:8,tech3:7,tech4:7}},skills:{p1:{boost:10,heal:9,chain:8,cleanse:7},p2:{boost:8,heal:8,chain:7,cleanse:7}}}};
        window.voteTest={state,saves:[],fail:false,listeners:[],emit(){this.listeners.forEach(fn=>fn(structuredClone(this.state)));}};
        window.communityRatings={watch(fn){voteTest.listeners.push(fn);fn(structuredClone(state));return()=>{};},retry(){voteTest.emit();},async save(category,values){if(voteTest.fail)throw Error('テスト通信エラー');voteTest.saves.push({category,values});state.ballots[category][state.uid]=values;voteTest.emit();}};
        window.openPlayerLogin=()=>window.loginOpened=true;
        window.dispatchEvent(new Event('community-ratings-ready'));
      });
      await page.getByRole('button', {name:'お知らせを開く',exact:true}).click();
      assert.equal(await page.locator('#tipPage0 h1').innerText(), '目次');
      assert.equal(await page.locator('.tipNavButton').count(), 5);
      assert.deepEqual(await page.locator('.guideContents .guidePageNumber').allTextContents(), ['p1','p2','p3','p4']);
      assert.equal(await page.locator('.guideContents button').first().locator('strong').innerText(), 'お知らせ');
      const navWidths=await page.locator('.tipNavButton').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));
      assert(navWidths[0]<=64.1&&navWidths[0]>=43.9&&navWidths[0]<navWidths[1],JSON.stringify(navWidths));
      assert(navWidths.slice(1).every(w=>Math.abs(w-navWidths[1])<.1),'P1-P4 divide the remaining width equally');
      await page.locator('.guideContents button').first().click();
      assert.equal(await page.locator('#tipNav1').getAttribute('aria-current'), 'page');
      assert.equal(await page.locator('#tipPage1').evaluate(n=>n.inert), false);
      assert.equal(await page.locator('#tipPage0').evaluate(n=>n.inert), true);
      assert.equal(await page.locator('#tipPage1 .guideNotice').count(),1);
      assert.equal(await page.locator('#tipPage1 time').innerText(),'2026/10/22');
      assert.equal(await page.locator('#tipPage1 time').getAttribute('datetime'),'2026-10-22');
      assert.equal(await page.locator('#foresightNoticeTitle').innerText(),'フォーサイト上方修正');
      assert.equal(await page.locator('#tipPage1 .guideArt').getAttribute('src'),'assets/actions/foresight.png');
      assert.deepEqual(await page.locator('#tipPage1 .guideNotice li').allTextContents(),['貫通攻撃を防げるようになった']);
      assert.equal(await page.locator('.guideBuffArrow').evaluate(n=>getComputedStyle(n).color),'rgb(87, 220, 131)');
      await page.locator('#tipNav0').click();
      await page.locator('.guideContents button').nth(1).click();
      assert.equal(await page.locator('#tipNav2').getAttribute('aria-current'), 'page');
      assert.equal(await page.locator('#tipPage2').evaluate(n => n.inert), false);
      assert.equal(await page.locator('#tipPage0').evaluate(n => n.inert), true);
      assert.equal(await page.locator('#tipPage2 .guideSteps li').count(), 4);
      await page.locator('#tipNav3').click();
      const definitions = await page.evaluate(() => [
        ...Object.values(basicActions), ...techniquePool, ...AdvancedRules.SKILLS
      ].map(item => ({name:item.name,description:item.description})));
      const cards = await page.locator('#tipPage3 .guideCard:not(.guideSpecialCard)').evaluateAll(nodes => nodes.map(n => ({name:n.querySelector('h3').textContent,description:n.querySelector('p').textContent})));
      assert.deepEqual(cards, definitions, 'every current game definition is shown exactly');
      assert.deepEqual(await page.locator('#guideSpecialTechniques h3').allTextContents(),await page.evaluate(()=>techniquePool.map(t=>'S'+t.name)));
      assert.equal(await page.locator('#guideSpecialTechniques .guideSpecialArt').count(),12);
      assert.deepEqual(await page.locator('#guideSpecialTechniques p').allTextContents(),await page.evaluate(()=>SpecialRules.definitions.map(d=>d.description)));
      assert.deepEqual(await page.locator('#guideSpecialTechniques .guideBadge').allTextContents(),await page.evaluate(()=>SpecialRules.definitions.map(d=>'Sゲージ追加消費+'+d.cost)));
      assert.equal(await page.locator('#guideSkills .guideBadge').count(), 6);
      assert.deepEqual(await page.locator('#guideSkills .guideBadge').allTextContents(), await page.evaluate(() => AdvancedRules.SKILLS.map(s => `1試合 ${s.limit}回`)));
      await page.waitForFunction(() => [...document.querySelectorAll('#tipScreen img')].every(img => img.complete && img.naturalWidth > 0));
      assert.equal(await page.locator('#guideSkills [data-skill="stance"] .stance-blade').count(), 2);
      assert.equal(await page.locator('#guideSkills [data-skill="invincible"] .invincible-star').count(), 1);
      const scroll = page.locator('#tipPage3 .guidePage');
      await scroll.evaluate(n => n.scrollTop = n.scrollHeight);
      assert.equal(await scroll.evaluate(n => n.scrollTop + n.clientHeight >= n.scrollHeight - 1), true, 'last skill can be reached');
      assert(await page.locator('#guideSpecialTechniques .guideCard').last().isVisible());
      if(process.env.GUIDE_SCREENSHOTS&&[390,1365].includes(width)){await page.waitForTimeout(500);await page.screenshot({path:path.join(process.env.GUIDE_SCREENSHOTS,'notice-s-catalog-'+width+'.png')});}
      await page.locator('#tipNav4').click();
      assert.equal(await page.locator('.guideDraft').count(),0);
      assert.doesNotMatch(await page.locator('#tipPage3').innerText(), /各ターンの最初の3秒間に使用/);
      assert.equal(await page.locator('#guideTechniqueTiers [data-guide-id="tech1"] .guideTierScore').innerText(),'(9.00)');
      assert.equal(await page.locator('#guideTechniqueTiers [data-guide-id="charge"],#guideTechniqueTiers [data-guide-id="block"],#guideTechniqueTiers [data-guide-id="attack"]').count(),0);
      assert.equal(await page.locator('#guideVoteSpecialTechniques').isDisabled(),false);
      assert.equal(await page.locator('#guideSpecialTechniqueTiers [data-rank="unrated"] .guideTierTile').count(),12);
      assert((await page.locator('#guideSpecialTechniqueTiers .guideTierScore').allTextContents()).every(t=>t==='(未評価)'));
      await page.locator('#guideSpecialTechniqueTiers').scrollIntoViewIfNeeded();
      if(process.env.GUIDE_SCREENSHOTS&&[390,1365].includes(width))await page.screenshot({path:path.join(process.env.GUIDE_SCREENSHOTS,'notice-s-ratings-'+width+'.png')});
      for (const [tableId, expected] of [['guideTechniqueTiers', 12], ['guideSkillTiers', 6]]) {
        assert.deepEqual(await page.locator(`#${tableId} .guideTierRank`).allTextContents(), ['S','A','B','C','未評価']);
        const ids = await page.locator(`#${tableId} .guideTierTile`).evaluateAll(nodes => nodes.map(n => n.dataset.guideId));
        assert.equal(ids.length, expected);
        assert.equal(new Set(ids).size, expected, 'each action/skill appears once');
      }
      for (const index of [0,1,2,3,4]) {
        await page.locator('#tipNav' + index).click();
        await page.waitForTimeout(500);
        const layout = await page.evaluate(i => {
          const inner = document.querySelector('#tipPage' + i + ' .guidePage');
          const r = inner.getBoundingClientRect();
          const nav = document.querySelector('.tipNav').getBoundingClientRect();
          const back = document.querySelector('.tipBackButton').getBoundingClientRect();
          return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,navBottom:nav.bottom,backTop:back.top,backBottom:back.bottom,overflow:inner.scrollWidth > inner.clientWidth + 1,documentOverflow:document.documentElement.scrollWidth > innerWidth};
        }, index);
        assert(layout.left >= -1 && layout.right <= width + 1, JSON.stringify(layout));
        assert(layout.top >= layout.navBottom && layout.bottom <= layout.backTop, JSON.stringify(layout));
        assert(layout.backBottom <= height && !layout.overflow && !layout.documentOverflow, JSON.stringify(layout));
        if (process.env.GUIDE_SCREENSHOTS && [390,1365].includes(width)) {
          await page.locator('#tipPage' + index + ' .guidePage').evaluate(n => n.scrollTop = 0);
          fs.mkdirSync(process.env.GUIDE_SCREENSHOTS, {recursive:true});
          await page.screenshot({path:path.join(process.env.GUIDE_SCREENSHOTS, `notice-page-${index}-${width}.png`)});
        }
      }
      await page.locator('#tipNav4').click();
      await page.locator('#guideVoteSpecialTechniques').click();assert.equal(await page.locator('#guideVoteDialog select').count(),12);await page.locator('#guideVoteDialog select').first().selectOption('9');await page.locator('#guideVoteDialog button[type=submit]').click();assert.equal(await page.evaluate(()=>voteTest.saves.at(-1).category),'specialTechniques');await page.evaluate(()=>{voteTest.saves=[];});
      await page.locator('#guideVoteTechniques').click();
      assert.equal(await page.locator('#guideVoteDialog select').count(),12);
      assert.deepEqual(await page.getByLabel('ブリーチの評価',{exact:true}).locator('option').evaluateAll(nodes=>nodes.map(n=>n.value)),['',...Array.from({length:10},(_,i)=>String(i+1))]);
      assert.equal(await page.getByLabel('ブリーチの評価',{exact:true}).inputValue(),'10');
      await page.getByLabel('ブリーチの評価',{exact:true}).selectOption('7');
      await page.getByRole('button',{name:'保存する',exact:true}).click();
      assert.equal(await page.locator('#guideVoteDialog').isVisible(),false);
      assert.equal(await page.locator('#guideTechniqueTiers [data-rank="B"] [data-guide-id="tech1"] .guideTierScore').innerText(),'(7.50)');
      await page.locator('#guideVoteTechniques').click();
      assert.equal(await page.getByLabel('ブリーチの評価',{exact:true}).inputValue(),'7');
      await page.getByLabel('ブリーチの評価',{exact:true}).selectOption('10');
      await page.getByRole('button',{name:'保存する',exact:true}).click();
      assert.equal(await page.locator('#guideTechniqueTiers [data-guide-id="tech1"]').getAttribute('title').then(s=>s.includes('2票')),true);
      await page.locator('#guideVoteSkills').click();
      assert.equal(await page.locator('#guideVoteDialog select').count(),6);
      await page.getByLabel('無敵の評価',{exact:true}).selectOption('10');
      await page.evaluate(()=>voteTest.fail=true);
      await page.getByRole('button',{name:'保存する',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.guideVoteMessage').textContent==='テスト通信エラー');
      assert.equal(await page.getByLabel('無敵の評価',{exact:true}).inputValue(),'10');
      await page.evaluate(()=>{voteTest.fail=false;voteTest.state.connected=false;voteTest.emit();});
      assert.equal(await page.getByRole('button',{name:'保存する',exact:true}).isDisabled(),true);
      await page.evaluate(()=>{voteTest.state.connected=true;voteTest.emit();});
      assert.equal(await page.getByRole('button',{name:'保存する',exact:true}).isEnabled(),true);
      const geometry=await page.locator('#guideVoteDialog').evaluate(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:n.scrollWidth>n.clientWidth};});
      assert(geometry.left>=0&&geometry.right<=width&&geometry.top>=0&&geometry.bottom<=height&&!geometry.overflow,JSON.stringify(geometry));
      assert.equal(await page.locator('.guideVoteField select').evaluateAll(nodes=>nodes.every(n=>n.offsetHeight>=44)),true);
      await page.locator('.guideVoteFields').evaluate(n=>n.scrollTop=n.scrollHeight);
      await page.getByRole('button',{name:'保存する',exact:true}).click();
      assert.equal(await page.locator('#guideSkillTiers [data-rank="S"] [data-guide-id="invincible"] .guideTierScore').innerText(),'(10.00)');
      await page.locator('#guideVoteSkills').click();
      await page.getByLabel('無敵の評価',{exact:true}).selectOption('1');
      await page.keyboard.press('Escape');
      await page.locator('#guideVoteSkills').click();
      assert.equal(await page.getByLabel('無敵の評価',{exact:true}).inputValue(),'10','Escape discards draft');
      await page.evaluate(()=>{voteTest.state.uid='p2';voteTest.emit();});
      assert.equal(await page.getByLabel('無敵の評価',{exact:true}).inputValue(),'','changing account replaces old draft');
      await page.evaluate(()=>{voteTest.state.canVote=false;voteTest.state.uid='guest';voteTest.emit();});
      assert.equal(await page.locator('#guideVoteDialog select:enabled').count(),0);
      assert.equal(await page.getByRole('button',{name:'保存する',exact:true}).isVisible(),false);
      await page.getByRole('button',{name:'ログイン',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.loginOpened),true);
      await page.locator('.tipBackButton').click();
      assert.equal(await page.locator('#modeScreen').isVisible(), true);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}x${height}: contents, compact contents button, four equal page tabs, Foresight news, navigation, 21 definitions, art, limits, SABC averages, editable ballots, auth changes, offline/failure/cancel, dialog layout and return`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exitCode = 1;});
