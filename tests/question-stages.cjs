const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1400,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8765');
    await page.locator('.map-node').first().click();
    assert(await page.locator('#typeIntro').isVisible());
    assert(await page.locator('#questionStage').isHidden());
    assert.equal(await page.locator('#typeIntro').innerText(), '单选题');
    assert.equal(await page.locator('#typeIntro img, #typeIntro p').count(), 0);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'enterStageButton');
    const before = await page.evaluate(() => localStorage.getItem('shiyi-art-theory-progress-v1'));
    await page.keyboard.press('1');
    await page.clock.runFor(30000);
    assert.equal(await page.evaluate(() => localStorage.getItem('shiyi-art-theory-progress-v1')).then(s => JSON.parse(s).attempts.length), JSON.parse(before).attempts.length);
    await page.keyboard.press('Enter');
    assert(await page.locator('#questionStage').isVisible());
    await page.clock.runFor(1000);
    await page.locator('.option-button').first().click();
    const duration = await page.evaluate(() => JSON.parse(localStorage.getItem('shiyi-art-theory-progress-v1')).attempts[0].durationMs);
    assert(duration >= 1000 && duration < 2000, '提示页停留不计入答题用时');

    const result = await page.evaluate(() => {
      const bank = window.SHIYI_QUESTION_BANK;
      const original = bank.questions.map(q => ({...q, stem:q.id + ' :: ' + q.stem}));
      const failures = [];
      function checkQueue(expected, mix) {
        const seen = [], types = [];
        let previous = null, stageSize = 0, stage = 0;
        while (!document.querySelector('#overviewView').classList.contains('is-visible')) {
          const intro = !document.querySelector('#typeIntro').hidden;
          if (intro) {
            stage += 1;
            stageSize = 0;
            document.querySelector('#enterStageButton').click();
          }
          const q = expected.find(q => q.stem === document.querySelector('#questionText').textContent);
          if (!q) throw new Error('未知题目');
          if (!previous && !intro) failures.push('缺少开场提示');
          if (previous && Boolean(previous.multiple) !== Boolean(q.multiple) && !intro) failures.push('缺少切换提示');
          if (!mix && previous && previous.multiple && !q.multiple) failures.push('章节顺序错误');
          if (mix && stageSize >= 5) failures.push('一轮超过5题');
          if (intro && document.querySelector('#enterStageButton').textContent !== (q.multiple ? '多选题' : '单选题')) failures.push('提示题型错误');
          seen.push(q.id);
          types.push(q.multiple ? 'M' : 'S');
          stageSize += 1;
          for (const i of q.answers) document.querySelectorAll('.option-button')[i].click();
          if (q.multiple) document.querySelector('#submitButton').click();
          if (document.querySelector('#answerStatus').textContent !== '✓') failures.push('答题失败');
          previous = q;
          document.querySelector('#nextButton').click();
          if (seen.length > expected.length) throw new Error('队列未结束');
        }
        if (seen.length !== expected.length || new Set(seen).size !== expected.length) failures.push('题目重复或遗漏');
        return {stage,types:types.join('')};
      }
      // Small unique fixtures make exact ordering and incomplete final batches unambiguous.
      function fixture(singles, multiples) {
        return Array.from({length:singles + multiples}, (_,i) => ({
          ...original.find(q => Boolean(q.multiple) === (i >= singles)),
          id:'fixture-' + i, stem:'fixture-' + i, chapter:1
        }));
      }
      const stages = [];
      for (const [s,m] of [[12,12],[7,3],[0,8],[8,0],[1,1]]) {
        const questions = fixture(s,m);
        bank.questions.splice(0,bank.questions.length,...questions);
        document.querySelector('[data-action="mix"]').click();
        stages.push(checkQueue(questions,true));
      }
      // Verify all real chapter questions are retained, with singles before multiples.
      bank.questions.splice(0,bank.questions.length,...original);
      for (const button of document.querySelectorAll('.map-node')) {
        const chapter = Number(button.querySelector('strong').textContent);
        button.click();
        checkQueue(original.filter(q => q.chapter === chapter),false);
      }
      return {failures,stages};
    });
    assert.deepEqual(result.failures, []);
    assert.deepEqual(result.stages, [
      {stage:6,types:'SSSSSMMMMMSSSSSMMMMMSSMM'},
      {stage:3,types:'SSSSSMMMSS'},
      {stage:2,types:'MMMMMMMM'},
      {stage:2,types:'SSSSSSSS'},
      {stage:2,types:'SM'}
    ]);
    await page.setViewportSize({width:390,height:844});
    await page.locator('[data-action="mix"]').first().click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.clock.runFor(2500);
    await page.screenshot({path:path.join(__dirname,'../type-intro-checked.png'),fullPage:true,animations:'disabled'});
    await page.locator('#enterStageButton').click();
    await page.locator('[data-view="overview"]').filter({hasText:'返回总览'}).first().click();
    assert(await page.locator('#overviewView').isVisible());
    await page.evaluate(() => {
      const bank = window.SHIYI_QUESTION_BANK;
      const multi = bank.questions.find(q => q.multiple);
      bank.questions.splice(0,bank.questions.length,multi);
      document.querySelector('[data-action="mix"]').click();
    });
    assert.equal(await page.locator('#typeIntro').innerText(), '多选题');
    await page.screenshot({path:path.join(__dirname,'../multiple-intro-checked.png'),fullPage:true,animations:'disabled'});
    assert.deepEqual(errors, []);
    console.log('PASS: 十二章先单后多、5题交替、题型提示、余题与单一题型、无重复遗漏、键盘进入、提示不计答题用时、纯文字提示与手机布局。');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
