const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const key = 'shiyi-art-theory-progress-v1';
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  const page = await browser.newPage({viewport:{width:1200,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date(2026,9,23,23,59,50)});
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8768');
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({
   attempts:[{questionId:'c05-s25',chapter:5,correct:false,durationMs:60000,selectedIndex:[2],at:new Date(2026,9,22,12).toISOString()}],
   questionStats:{'c05-s25':{attempts:1,wrongCount:1,lastCorrect:false,lastDurationMs:60000,bestMs:60000}},favorites:['c05-s25']
  })),key);
  await page.reload();
  let state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  assert.equal(state.attempts[0].correct,true);
  assert.equal(state.questionStats['c05-s25'].wrongCount,0);
  assert.deepEqual(state.favorites,['c05-s25']);
  assert.equal(state.dailyStudyMs['2026-10-22'],60000);
  assert.deepEqual(state.dailyAnswers['2026-10-22'],{correct:1,wrong:0});
  await page.reload();
  assert.equal(await page.locator('#mistakeNavCount').textContent(),'0');
  await page.clock.setSystemTime(new Date(2026,9,23,23,59,50));
  await page.evaluate(()=>{
   const q=window.SHIYI_QUESTION_BANK.questions.find(q=>q.id==='c05-s25');
   window.SHIYI_QUESTION_BANK.questions.splice(0,window.SHIYI_QUESTION_BANK.questions.length,q);
   document.querySelector('[data-action="mix"]').click();document.querySelector('#enterStageButton').click();
  });
  await page.clock.runFor(20000);
  const layout=await page.locator('#questionCard').boundingBox();
  assert(layout.width>1000,'答题区应填满桌面宽度');
  assert(layout.height>600,'答题区应利用可用高度');
  await page.locator('.option-button').nth(3).click();
  assert.equal(await page.locator('#answerStatus').textContent(),'✕');
  assert.equal(await page.locator('.option-button.is-correct').count(),1);
  assert.equal(await page.locator('.option-button.is-wrong').count(),1);
  const colors=await page.evaluate(()=>({filter:getComputedStyle(document.body).filter,green:getComputedStyle(document.querySelector('.is-correct b')).backgroundColor,red:getComputedStyle(document.querySelector('.is-wrong b')).backgroundColor}));
  assert.equal(colors.filter,'none');
  const rgb=s=>s.match(/\d+/g).map(Number);
  assert(rgb(colors.green)[1]>rgb(colors.green)[0]);
  assert(rgb(colors.red)[0]>rgb(colors.red)[1]);
  await page.screenshot({path:path.join(__dirname,'../feedback-checked.png'),fullPage:true});
  await page.evaluate(()=>document.querySelector('.rail-item[data-view="records"]').click());
  state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  assert(Math.abs(state.dailyStudyMs['2026-10-23']-10000)<1000);
  assert(Math.abs(state.dailyStudyMs['2026-10-24']-10000)<1000);
  assert.deepEqual(state.dailyAnswers['2026-10-24'],{correct:0,wrong:1});
  const beforePause=state.dailyStudyMs['2026-10-24'];
  await page.clock.runFor(60000);
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).dailyStudyMs['2026-10-24'],key),beforePause);
  assert((await page.locator('#recordsToday').textContent()).includes('10月24日'));
  await page.locator('.rail-item[data-view="mistakes"]').click();
  assert((await page.locator('.correct-answer').textContent()).includes('C · 现代主义建筑'));
  assert((await page.locator('#mistakeList').textContent()).includes('核对更正'));
  await page.locator('#mistakeList button').click();
  await page.locator('#enterStageButton').click();
  await page.clock.runFor(5000);
  await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:true});
   document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(60000);
  await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:false});
   document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  await page.locator('.rail-item[data-view="records"]').click();
  const afterPause=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).dailyStudyMs['2026-10-24'],key);
  assert(Math.abs(afterPause-beforePause-10000)<1000);
  await page.reload();
  await page.locator('.rail-item[data-view="records"]').click();
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).dailyStudyMs['2026-10-22'],key),60000);
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(__dirname,'../records-checked.png'),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: 更正答案迁移及错题名录、收藏保留、红绿实色、每日小时、跨午夜分摊、后台与离开暂停、刷新持久化、手机日期表。');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

