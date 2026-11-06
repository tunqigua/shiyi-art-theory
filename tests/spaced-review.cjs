const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const key = 'shiyi-art-theory-progress-v1';
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  const page = await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-11-06T10:00:00+08:00')});
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:18766');
  const ids = await page.evaluate(key=>{
   const bank=window.SHIYI_QUESTION_BANK.questions;
   const ids=[bank.find(q=>q.type!=='fill'&&!q.multiple).id,bank.find(q=>q.multiple).id,bank.find(q=>q.type==='fill').id];
   const questionStats=Object.fromEntries(ids.map(id=>[id,{attempts:1,wrongCount:1,lastCorrect:false,lastDurationMs:1000,bestMs:1000,lastAt:'2026-11-01T10:00:00+08:00'}]));
   localStorage.setItem(key,JSON.stringify({attempts:[],questionStats,favorites:[ids[0]],dailyGoal:35})); return ids;
  },key);
  await page.reload();
  const stats=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  const nav=()=>page.locator('.rail-item[data-view="mistakes"]').click();
  const start=kind=>page.locator(`[data-review-kind="${kind}"]`).click();
  const answer=async(id,correct=true)=>page.evaluate(({id,correct})=>{
   const q=window.SHIYI_QUESTION_BANK.questions.find(q=>q.id===id);
   if(q.type==='fill') {
    [...document.querySelectorAll('.fill-input')].forEach((x,i)=>{x.value=correct?q.answers[i]:'wrong';x.dispatchEvent(new Event('input'));});
    document.querySelector('#submitButton').click();
   } else {
    const values=correct?q.answers:(!q.multiple?[(q.answers[0]+1)%q.options.length]:[q.answers[0]]);
    values.forEach(i=>document.querySelectorAll('.option-button')[i].click());
    if(q.multiple)document.querySelector('#submitButton').click();
   }
  },{id,correct});
  const next=()=>page.locator('#nextButton').click();
  let state=await stats();
  ids.forEach(id=>assert.deepEqual(state.questionStats[id].review,{step:0,due:'2026-11-06',passedDay:null}));
  assert.deepEqual(state.favorites,[ids[0]]);assert.equal(state.dailyGoal,35);
  await nav();
  assert.equal(await page.locator('.review-module').count(),3);
  assert.deepEqual(await page.locator('.review-module strong').allTextContents(),['1','1','1']);
  await page.screenshot({path:'outputs/spaced-review-desktop.png',fullPage:true,animations:'disabled'});
  await start('single'); assert(await page.locator('#typeIntro').isHidden()); assert(await page.locator('#answerPanel').isHidden());
  await answer(ids[0],false);await next();assert(await page.locator('#practiceView').isVisible(),'错题应再次出现');
  await answer(ids[0]);await next();assert(await page.locator('#mistakesView').isVisible());
  assert.deepEqual((await stats()).questionStats[ids[0]].review,{step:1,due:'2026-11-07',passedDay:'2026-11-06'});
  await start('single');await answer(ids[0]);await next();
  assert.equal((await stats()).questionStats[ids[0]].review.due,'2026-11-07','提前巩固不改期');
  for(const [date,expected,step] of [['2026-11-07','2026-11-10',2],['2026-11-10','2026-11-17',3],['2026-11-17','2026-12-01',4],['2026-12-01','2026-12-31',5],['2026-12-31','2027-03-01',6],['2027-03-01','2027-05-30',7],['2027-05-30','2027-08-28',7]]) {
   await page.clock.setSystemTime(new Date(date+'T10:00:00+08:00'));await nav();await start('single');await answer(ids[0]);await next();
   const r=(await stats()).questionStats[ids[0]].review;assert.equal(r.due,expected);assert.equal(r.step,step);
  }
  await start('single');await answer(ids[0],false);await next();await answer(ids[0]);await next();
  assert.equal((await stats()).questionStats[ids[0]].review.step,1,'再次答错从头排期');
  await start('multiple');await answer(ids[1]);assert.equal(await page.locator('#answerStatus').textContent(),'✓');await next();
  await start('fill');assert(await page.locator('.fill-input').first().isVisible());await answer(ids[2],false);await next();await answer(ids[2]);assert.equal(await page.locator('#answerStatus').textContent(),'✓');await next();
  const backupOK=await page.evaluate(key=>{
   const state=JSON.parse(localStorage.getItem(key));
   const data={format:'shiyi-backup',version:1,state};
   window.SHIYI_FILL_UTILS.validateBackup(data,window.SHIYI_QUESTION_BANK.questions);
   Object.values(state.questionStats)[0].review.due='2026-02-30';
   try{window.SHIYI_FILL_UTILS.validateBackup(data,window.SHIYI_QUESTION_BANK.questions);return false;}catch(e){return true;}
  },key);assert(backupOK);
  const saved=await stats();await page.reload();assert.deepEqual((await stats()).questionStats,saved.questionStats);
  await nav();await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'outputs/spaced-review-mobile.png',fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: 三类直达、旧错题保留、错题轮回、全周期与跨年、提前复习不改期、再错重置、判分与解析、刷新及备份持久化、手机布局。');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
