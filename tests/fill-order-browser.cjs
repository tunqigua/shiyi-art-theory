const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:18767');
 const key='shiyi-art-theory-progress-v1';
 await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({attempts:[{questionId:'c01-f001',chapter:1,selectedIndex:['清吹','顾闳中','赏舞'],correct:false,durationMs:1000,at:'2026-11-05T10:00:00+08:00'}],questionStats:{'c01-f001':{attempts:1,wrongCount:1,lastCorrect:false,lastDurationMs:1000,bestMs:1000,review:{step:0,due:'2026-11-06',passedDay:null}}},favorites:['c01-f001'],dailyAnswers:{'2026-11-05':{correct:0,wrong:1}},dailyStudyMs:{'2026-11-05':1000}})),key);
 await page.reload();let s=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert(s.attempts[0].correct);assert.equal(s.questionStats['c01-f001'].wrongCount,0);assert(s.questionStats['c01-f001'].lastCorrect);assert(!s.questionStats['c01-f001'].review);assert.deepEqual(s.dailyAnswers['2026-11-05'],{correct:1,wrong:0});assert.deepEqual(s.favorites,['c01-f001']);
 await page.reload();assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),s);
 await page.evaluate(()=>{const qs=window.SHIYI_QUESTION_BANK.questions,q=qs.find(q=>q.id==='c01-f001');qs.splice(0,qs.length,q);document.querySelector('#fillMixButton').click();document.querySelector('[data-mix-range="all"]').click();document.querySelector('#enterStageButton').click();});
 for(const [i,value]of ['清吹','顾闳中','赏舞'].entries())await page.locator('.fill-input').nth(i).fill(value);
 await page.locator('#submitButton').click();assert.equal(await page.locator('#answerStatus').textContent(),'✓');assert.equal(await page.locator('.fill-input.is-correct').count(),3);assert.equal(await page.locator('.fill-answer-feedback.is-correct').count(),3);assert((await page.locator('#answerExplanation').textContent()).includes('不要求填写顺序'));assert.equal((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).questionStats['c01-f001'].wrongCount,0);
 assert.deepEqual(errors,[]);console.log('PASS: 乱序填空实测判对、红绿与解析一致、无新增错题、旧顺序错判修复且不重复累计、收藏与时长保留。');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
