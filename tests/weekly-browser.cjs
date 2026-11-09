const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:18765');
  const key='shiyi-art-theory-progress-v1';
  const old={attempts:[{questionId:'c01-s01',chapter:1,correct:false,durationMs:5000,selectedIndex:[0],at:'2026-11-02T04:00:00Z'},{questionId:'c02-f001',chapter:2,correct:true,durationMs:6000,selectedIndex:['阿尔都塞'],at:'2026-11-02T04:01:00Z'},{questionId:'c04-m10',chapter:4,correct:true,durationMs:7000,selectedIndex:[1,2,4],at:'2026-11-02T04:02:00Z'}],questionStats:{'c01-s01':{attempts:1,wrongCount:1,lastCorrect:false,lastDurationMs:5000,bestMs:5000},'c02-f001':{attempts:1,wrongCount:0,lastCorrect:true,lastDurationMs:6000,bestMs:6000},'c04-m10':{attempts:1,wrongCount:0,lastCorrect:true,lastDurationMs:7000,bestMs:7000}},favorites:['c01-s01','c02-f001','c04-m10'],dailyStudyMs:{'2026-11-02':18000},dailyAnswers:{'2026-11-02':{correct:2,wrong:1}},dailyGoal:45};
  await page.evaluate(({key,old})=>localStorage.setItem(key,JSON.stringify(old)),{key,old});await page.reload();
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  assert.equal(saved.attempts.length,3);assert.deepEqual(saved.favorites,old.favorites);assert.deepEqual(saved.dailyStudyMs,old.dailyStudyMs);assert.equal(saved.dailyGoal,45);
  assert.deepEqual(saved.questionStats['c02-f001'],old.questionStats['c02-f001']);assert.equal(saved.questionStats['c04-m10'].attempts,1);assert.equal(saved.questionStats['c04-m10'].wrongCount,1);
  assert.deepEqual(saved.dailyAnswers['2026-11-02'],{correct:1,wrong:2});assert.equal(saved.attempts[2].correct,false);
  await page.reload();assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),saved);
  const result=await page.evaluate(()=>{
   const full=window.SHIYI_QUESTION_BANK.questions.slice(),fills=full.filter(q=>q.type==='fill'),failures=[];
   function show(q,values){
    window.SHIYI_QUESTION_BANK.questions.splice(0,window.SHIYI_QUESTION_BANK.questions.length,q);
    document.querySelector('#fillMixButton').click();document.querySelector('[data-mix-range="all"]').click();document.querySelector('#enterStageButton').click();
    [...document.querySelectorAll('.fill-input')].forEach((input,i)=>{input.value=values[i];input.dispatchEvent(new Event('input',{bubbles:true}));});
    document.querySelector('#submitButton').click();
   }
   for(const q of fills){
    show(q,q.answers);if(document.querySelector('#answerStatus').textContent!=='✓')failures.push(q.id+':正确答案判错');
    if(q.study&&!document.querySelector('.knowledge-point')?.textContent)failures.push(q.id+':缺考点');
    if(q.id.startsWith('w26-')&&!document.querySelector('#answerExplanation').textContent.includes('易混点'))failures.push(q.id+':缺填写说明');
    show(q,q.answers.map(()=> '错误测试答案'));if(document.querySelector('#answerStatus').textContent!=='✕')failures.push(q.id+':错答判对');
   }
   window.SHIYI_QUESTION_BANK.questions.splice(0,window.SHIYI_QUESTION_BANK.questions.length,...full);
   return{failures,count:fills.length};
  });assert.deepEqual(result.failures,[]);assert.equal(result.count,650);
  await page.reload();await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{const q=window.SHIYI_QUESTION_BANK.questions.find(q=>q.id==='w26-c05-f08');window.SHIYI_QUESTION_BANK.questions.splice(0,window.SHIYI_QUESTION_BANK.questions.length,q);document.querySelector('#fillMixButton').click();document.querySelector('[data-mix-range="all"]').click();document.querySelector('#enterStageButton').click();});
  await page.locator('.fill-input').fill('园冶');await page.locator('#submitButton').click();
  assert.equal(await page.locator('#answerStatus').textContent(),'✓');assert(await page.locator('.knowledge-point').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(__dirname,'../outputs/weekly-fill-mobile-20261103.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: 650填空题正确/错误实测；新题考点、填写依据、手机布局正常；旧答题、错题、收藏、时长和目标保留，更正只重判相关记录且刷新不重复累计。');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
