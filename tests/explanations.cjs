const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8765');
    const result = await page.evaluate(() => {
      const questions = window.SHIYI_QUESTION_BANK.questions.slice();
      const failures = [];
      let excluded = 0;
      for (const q of questions) {
        function answer(indices) {
          window.SHIYI_QUESTION_BANK.questions.splice(0, window.SHIYI_QUESTION_BANK.questions.length, q);
          document.querySelector('[data-action="mix"]').click();
          document.querySelector('#enterStageButton').click();
          const buttons = document.querySelectorAll('.option-button');
          for (const i of indices) buttons[i].click();
          if (q.multiple) document.querySelector('#submitButton').click();
        }
        answer(q.answers);
        const panel = document.querySelector('#answerPanel');
        if (panel.hidden || panel.classList.contains('is-wrong')) failures.push(q.id + ':正确状态');
        const rows = [...panel.querySelectorAll('.option-analysis')];
        if (rows.length !== q.options.length) failures.push(q.id + ':缺选项');
        rows.forEach((row, i) => {
          if (!row.querySelector('h3').textContent.includes(q.options[i])) failures.push(q.id + ':选项错位');
          if (!q.answers.includes(i)) {
            excluded++;
            if (!row.querySelector('.option-reason').textContent.includes('知识归属与排除理由：')) failures.push(q.id + ':缺辨析');
          }
        });
        if (!panel.querySelector('.knowledge-point')?.textContent) failures.push(q.id + ':缺考点');
        if (!panel.querySelector('.question-source')?.textContent.includes('题集第' + q.source.page + '页')) failures.push(q.id + ':缺原题出处');
        if (q.source.part && !panel.querySelector('.knowledge-location').textContent.includes('第' + q.source.part + '空')) failures.push(q.id + ':拆空提示');
        const correctText = panel.querySelector('#answerExplanation').textContent;
        const wrong = q.multiple && q.answers.length > 1 ? [q.answers[0]] : [(q.answers[0] + 1) % q.options.length];
        answer(wrong);
        if (!panel.classList.contains('is-wrong')) failures.push(q.id + ':错误状态');
        if (panel.querySelector('#answerExplanation').textContent !== correctText) failures.push(q.id + ':答错后解析不完整');
      }
      window.SHIYI_QUESTION_BANK.questions.splice(0, window.SHIYI_QUESTION_BANK.questions.length, ...questions);
      return {failures, questions:questions.length, excluded};
    });
    assert.deepEqual(result.failures, []);
    assert.equal(result.questions, 515);
    assert.equal(result.excluded, 1293);
    async function show(id, correct) {
      await page.evaluate(({id, correct}) => {
        const q = window.SHIYI_QUESTION_BANK.questions.find(q => q.id === id);
        window.SHIYI_QUESTION_BANK.questions.splice(0, window.SHIYI_QUESTION_BANK.questions.length, q);
        document.querySelector('[data-action="mix"]').click();
        document.querySelector('#enterStageButton').click();
        for (const i of correct ? q.answers : [(q.answers[0] + 1) % q.options.length]) document.querySelectorAll('.option-button')[i].click();
        if (q.multiple) document.querySelector('#submitButton').click();
      }, {id, correct});
    }
    await show('c06-m31', false);
    assert.equal(await page.locator('#answerPanel a').count(), 2);
    const red = await page.locator('#answerPanel').evaluate(el => getComputedStyle(el).borderTopColor);
    assert.equal(red, await page.evaluate(() => getComputedStyle(document.querySelector('#answerStatus')).color));
    await page.screenshot({path:'explanation-wrong.png',fullPage:true,animations:'disabled'});
    await page.reload();
    await page.setViewportSize({width:390,height:844});
    await show('c01-s02', true);
    const green = await page.locator('#answerPanel').evaluate(el => getComputedStyle(el).borderTopColor);
    assert.notEqual(red, green);
    assert.equal(green, await page.evaluate(() => getComputedStyle(document.querySelector('#answerStatus')).color));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:'explanation-correct-mobile.png',fullPage:true,animations:'disabled'});
    await page.locator('#nextButton').click();
    assert(await page.locator('#overviewView').isVisible());
    assert.deepEqual(errors, []);
    console.log('PASS: 515题答对/答错均显示完整解析，1293个非应选项有辨析，拆空、出处链接、红绿框、手机布局和下一题正常。');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode=1;});
