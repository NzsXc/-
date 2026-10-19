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
      });
      await page.getByRole('button', {name:'お知らせを開く',exact:true}).click();
      assert.equal(await page.locator('#tipPage0 h1').innerText(), '目次');
      await page.locator('.guideContents button').first().click();
      assert.equal(await page.locator('#tipNav1').getAttribute('aria-current'), 'page');
      assert.equal(await page.locator('#tipPage1').evaluate(n => n.inert), false);
      assert.equal(await page.locator('#tipPage0').evaluate(n => n.inert), true);
      assert.equal(await page.locator('#tipPage1 .guideSteps li').count(), 4);
      await page.locator('#tipNav2').click();
      const definitions = await page.evaluate(() => [
        ...Object.values(basicActions), ...techniquePool, ...AdvancedRules.SKILLS
      ].map(item => ({name:item.name,description:item.description})));
      const cards = await page.locator('#tipPage2 .guideCard').evaluateAll(nodes => nodes.map(n => ({name:n.querySelector('h3').textContent,description:n.querySelector('p').textContent})));
      assert.deepEqual(cards, definitions, 'every current game definition is shown exactly');
      assert.equal(await page.locator('#guideSkills .guideBadge').count(), 6);
      assert.deepEqual(await page.locator('#guideSkills .guideBadge').allTextContents(), await page.evaluate(() => AdvancedRules.SKILLS.map(s => `1試合 ${s.limit}回`)));
      await page.waitForFunction(() => [...document.querySelectorAll('#tipScreen img')].every(img => img.complete && img.naturalWidth > 0));
      assert.equal(await page.locator('#guideSkills [data-skill="stance"] .stance-blade').count(), 2);
      assert.equal(await page.locator('#guideSkills [data-skill="invincible"] .invincible-star').count(), 1);
      const scroll = page.locator('#tipPage2 .guidePage');
      await scroll.evaluate(n => n.scrollTop = n.scrollHeight);
      assert.equal(await scroll.evaluate(n => n.scrollTop + n.clientHeight >= n.scrollHeight - 1), true, 'last skill can be reached');
      await page.locator('#tipNav3').click();
      assert.match(await page.locator('.guideDraft').innerText(), /仮評価.*投票・集計結果ではありません/);
      for (const [tableId, expected] of [['guideTechniqueTiers', 15], ['guideSkillTiers', 6]]) {
        assert.deepEqual(await page.locator(`#${tableId} .guideTierRank`).allTextContents(), ['S','A','B','C']);
        const ids = await page.locator(`#${tableId} .guideTierTile`).evaluateAll(nodes => nodes.map(n => n.dataset.guideId));
        assert.equal(ids.length, expected);
        assert.equal(new Set(ids).size, expected, 'each action/skill appears once');
      }
      for (const index of [0,1,2,3]) {
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
          await page.screenshot({path:path.join(process.env.GUIDE_SCREENSHOTS, `notice-p${index+1}-${width}.png`)});
        }
      }
      await page.locator('.tipBackButton').click();
      assert.equal(await page.locator('#modeScreen').isVisible(), true);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}x${height}: contents, navigation, 21 definitions, art, limits, SABC coverage, scrolling, layout and return`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exitCode = 1;});
