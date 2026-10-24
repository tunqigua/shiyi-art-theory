const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const key='shiyi-art-theory-progress-v1';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1500,height:1100},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-24T00:30:00+08:00')});
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8768');
  await page.evaluate(key=>{
   const attempts=Array.from({length:500},()=>({questionId:'c01-s01',chapter:1,correct:true,durationMs:1000,selectedIndex:[2],at:'2026-10-23T12:00:00+08:00'}));
   localStorage.setItem(key,JSON.stringify({attempts,questionStats:{},favorites:['c01-s01'],dailyStudyMs:{'2026-10-23':7200000}}));
  },key);
  await page.reload();
  await page.locator('.rail-item[data-view="records"]').click();
  assert((await page.locator('#recordsToday').textContent()).includes('2026年10月24日 · 星期六（北京时间）'));
  assert.equal(await page.locator('#todayLabel').textContent(),'2026年10月24日');
  assert.equal(await page.locator('#calendarMonth').textContent(),'2026年10月');
  assert.equal(await page.locator('.calendar-day').count(),31);
  assert.equal(await page.locator('.calendar-blank').count(),4);
  const historic=page.locator('[data-date="2026-10-23"]');
  assert.equal(await historic.locator('.calendar-duration').textContent(),'2.0小时');
  assert.equal(await historic.locator('.calendar-results').textContent(),'✓ 500✕ 0');
  assert.equal(await page.locator('[data-date="2026-10-24"]').getAttribute('aria-current'),'date');
  assert.equal(await page.locator('[data-date="2026-10-01"] .calendar-duration').textContent(),'未记录');
  assert.equal(await page.locator('[data-date="2026-10-25"] .calendar-duration').textContent(),'—');
  await page.locator('.study-calendar').screenshot({path:path.join(__dirname,'../calendar-desktop.png'),animations:'disabled'});
  await page.locator('#previousMonth').click();
  assert.equal(await page.locator('#calendarMonth').textContent(),'2026年9月');
  assert.equal(await page.locator('.calendar-day').count(),30);
  for(let i=0;i<9;i++)await page.locator('#previousMonth').click();
  assert.equal(await page.locator('#calendarMonth').textContent(),'2025年12月');
  await page.locator('#nextMonth').click();
  assert.equal(await page.locator('#calendarMonth').textContent(),'2026年1月');
  for(let i=0;i<23;i++)await page.locator('#nextMonth').click();
  assert.equal(await page.locator('#calendarMonth').textContent(),'2027年12月');
  for(let i=0;i<2;i++)await page.locator('#nextMonth').click();
  assert.equal(await page.locator('#calendarMonth').textContent(),'2028年2月');
  assert.equal(await page.locator('.calendar-day').count(),29);
  await page.locator('#calendarToday').click();
  assert.equal(await page.locator('#calendarMonth').textContent(),'2026年10月');
  await page.evaluate(()=>{
   const q=window.SHIYI_QUESTION_BANK.questions.find(q=>q.id==='c01-s01');
   window.SHIYI_QUESTION_BANK.questions.splice(0,window.SHIYI_QUESTION_BANK.questions.length,q);
   document.querySelector('[data-action="mix"]').click();
   document.querySelectorAll('.option-button')[q.answers[0]].click();
   document.querySelector('[data-action="mix"]').click();
   document.querySelectorAll('.option-button')[(q.answers[0]+1)%q.options.length].click();
  });
  await page.locator('.rail-item[data-view="records"]').click();
  assert.equal(await page.locator('[data-date="2026-10-24"] .calendar-results').textContent(),'✓ 1✕ 1');
  assert.equal(await historic.locator('.calendar-results').textContent(),'✓ 500✕ 0');
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).attempts.length,key),500);
  await page.reload();
  await page.locator('.rail-item[data-view="records"]').click();
  assert.equal(await historic.locator('.calendar-results').textContent(),'✓ 500✕ 0');
  assert.equal(await page.locator('[data-date="2026-10-24"] .calendar-results').textContent(),'✓ 1✕ 1');
  for(const width of [390,320]) {
   await page.setViewportSize({width,height:844});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`mobile overflow ${width}`);
   assert.equal(await page.locator('.calendar-day').count(),31);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.study-calendar').screenshot({path:path.join(__dirname,'../calendar-mobile.png'),animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: 北京日期、月历对齐、正确/错误逐日累计、500条截断后保留统计、翻月/跨年/闰年、返回今天、历史迁移、刷新及手机布局。');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
