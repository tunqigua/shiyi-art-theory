const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8877');
    const key = 'shiyi-art-theory-progress-v1';
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({
      attempts:[], favorites:['c05-s25'],
      questionStats:{
        'c05-s25':{attempts:2,wrongCount:2,lastCorrect:false,lastDurationMs:3200},
        'c12-m03':{attempts:1,wrongCount:1,lastCorrect:false,lastDurationMs:4800}
      }
    })), key);
    await page.reload();
    const original = await page.evaluate(key => localStorage.getItem(key), key);
    await page.locator('[data-view="mistakes"]').click();
    const rows = page.locator('.mistake-row');
    assert.equal(await rows.count(), 2);
    for (const toggle of await page.locator('.mistake-toggle').all()) assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('.mistake-explanation:visible').count(), 0);
    assert.equal(await page.locator('#mistakeList .answer-key').count(), 0, '未点击时不提前插入答案');
    await rows.first().locator('.mistake-flag').click();
    assert(await rows.first().locator('.mistake-explanation').isVisible());
    assert((await rows.first().locator('.answer-key').textContent()).includes('C · 现代主义建筑'));
    assert.equal(await rows.first().locator('.option-analysis').count(), 4);
    assert(await rows.last().locator('.mistake-explanation').isHidden());
    assert.equal(await rows.first().locator('.mistake-toggle').getAttribute('aria-expanded'), 'true');
    await rows.first().locator('.mistake-stem').click();
    assert(await rows.first().locator('.mistake-explanation').isHidden());
    await rows.first().locator('.mistake-toggle').focus();
    await page.keyboard.press('Enter');
    assert(await rows.first().locator('.mistake-explanation').isVisible());
    await page.keyboard.press('Space');
    assert(await rows.first().locator('.mistake-explanation').isHidden());
    await page.setViewportSize({width:390,height:844});
    await rows.last().locator('.mistake-flag').click();
    assert.equal(await rows.last().locator('.option-analysis').count(), 5);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:'mistake-expanded-mobile.png',fullPage:true,animations:'disabled'});
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), original, '查看解析不新增作答或改变收藏和历史');
    await page.locator('.rail-item[data-view="overview"]').click();
    await page.locator('[data-view="mistakes"]').click();
    assert.equal(await page.locator('.mistake-explanation:visible').count(), 0);
    await rows.first().locator('.retry-question').click();
    assert(await page.locator('#typeIntro').isVisible());
    await page.locator('#enterStageButton').click();
    assert.equal(await page.locator('.option-button').count(), 4);
    assert(await page.locator('#answerPanel').isHidden());
    await page.locator('.option-button').nth(2).click();
    assert.equal(await page.locator('#answerStatus').textContent(), '✓');
    assert.deepEqual(errors, []);
    console.log('PASS: 错题答案默认隐藏，小旗/题目点击及键盘展开收起，逐题独立、重进重置、完整解析、历史不变、手机布局及单题重练正常。');
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
