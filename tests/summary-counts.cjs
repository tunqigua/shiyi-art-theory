const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-11-06T23:59:00+08:00')});await page.goto(process.env.TEST_URL||'http://127.0.0.1:18768');
 const total=await page.evaluate(()=>window.SHIYI_QUESTION_BANK.questions.length);
 assert.equal(await page.locator('#bankStatus').innerText(),total+' / '+total);
 const key='shiyi-art-theory-progress-v1';
 const ids=await page.evaluate(key=>{
  const ids=window.SHIYI_QUESTION_BANK.questions.filter(q=>q.type!=='fill').slice(0,24).map(q=>q.id);
  const questionStats=Object.fromEntries(ids.map(id=>[id,{attempts:2,wrongCount:0,lastCorrect:true,lastDurationMs:1000,bestMs:1000,lastAt:'2026-11-06T10:00:00+08:00'}]));
  const attempts=ids.flatMap(id=>[1,2].map(()=>({questionId:id,chapter:1,correct:true,durationMs:1000,selectedIndex:[],at:'2026-11-06T10:00:00+08:00'})));
  localStorage.setItem(key,JSON.stringify({attempts,questionStats,favorites:[]}));return ids;
 },key);await page.reload();
 assert.equal(await page.locator('#todayDone').innerText(),'48');assert.equal(await page.locator('#todayDistinct').innerText(),'24');assert.equal(await page.locator('#bankStatus').innerText(),(total-24)+' / '+total);
 await page.evaluate(key=>{const state=JSON.parse(localStorage.getItem(key));state.dailyAnswers['2026-11-06']={correct:560,wrong:40};state.attempts=state.attempts.slice(0,20);localStorage.setItem(key,JSON.stringify(state));},key);await page.reload();
 assert.equal(await page.locator('#todayDone').innerText(),'600');assert.equal(await page.locator('#todayDistinct').innerText(),'24');assert.equal(await page.locator('#todayAccuracy').innerText(),'93%');
 await page.evaluate(({key,id})=>{
  const bank=window.SHIYI_QUESTION_BANK;const chapter=bank.questions.find(q=>q.id===id).chapter;
  for(let n=0;n<2;n++){document.querySelector('.chapter-kinds [data-kind="choice"][data-chapter="'+chapter+'"]').click();document.querySelector('#enterStageButton').click();const q=bank.questions.find(q=>q.chapter===chapter&&q.stem===document.querySelector('#questionText').textContent);q.answers.forEach(i=>document.querySelector('.option-button[data-option-index="'+i+'"]').click());if(q.multiple)document.querySelector('#submitButton').click();}
 },{key,id:ids[0]});
 assert.equal(await page.locator('#todayDone').innerText(),'602');assert.equal(await page.locator('#todayDistinct').innerText(),'24');
 await page.reload();assert.equal(await page.locator('#todayDone').innerText(),'602');assert.equal(await page.locator('#bankStatus').innerText(),(total-24)+' / '+total);
 const valid=await page.evaluate(key=>window.SHIYI_FILL_UTILS.validateBackup({format:'shiyi-backup',version:1,state:JSON.parse(localStorage.getItem(key))},window.SHIYI_QUESTION_BANK.questions),key);assert(valid);
 await page.screenshot({path:'outputs/summary-counts-desktop.png',fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'outputs/summary-counts-mobile.png',fullPage:true,animations:'disabled'});
 await page.clock.setSystemTime(new Date('2026-11-07T00:01:00+08:00'));await page.clock.runFor(15000);assert.equal(await page.locator('#todayDone').innerText(),'0');await page.reload();assert.equal(await page.locator('#todayDone').innerText(),'0');assert.equal(await page.locator('#todayDistinct').innerText(),'0');
 await page.evaluate(({key,ids})=>{const s=JSON.parse(localStorage.getItem(key));delete s.dailyQuestionIds;delete s.dailyQuestionIdsEstimated;s.dailyAnswers['2026-11-07']={correct:500,wrong:1};localStorage.setItem(key,JSON.stringify(s));},{key,ids});await page.reload();assert.equal(await page.locator('#todayDistinct').innerText(),'≥ 0');
 assert.deepEqual(errors,[]);console.log('PASS: 未学/总量、24题重复48次、超过500条、正确率、刷新与备份、跨天归零、缺失历史提示、手机布局。');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
