const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.goto(process.env.TEST_URL||'http://127.0.0.1:18768');
 assert.equal(await page.locator('[data-action="mix"]').count(),0);
 assert(!(await page.locator('body').innerText()).includes('疯狂混'));
 await page.locator('#chapterMap [data-kind="choice"]').first().click();
 assert(await page.locator('#typeIntro').isVisible());assert.equal(await page.locator('#typeIntro').innerText(),'单选题');
 assert.equal(await page.locator('#typeIntro img, #typeIntro p').count(),0);
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'enterStageButton');
 await page.keyboard.press('1');await page.clock.runFor(30000);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('shiyi-art-theory-progress-v1')).attempts.length),0);
 await page.keyboard.press('Enter');await page.clock.runFor(1000);await page.locator('.option-button').first().click();
 const duration=await page.evaluate(()=>JSON.parse(localStorage.getItem('shiyi-art-theory-progress-v1')).attempts[0].durationMs);assert(duration>=1000&&duration<2000);
 const failures=await page.evaluate(()=>{
  const bank=window.SHIYI_QUESTION_BANK,full=bank.questions.slice();
  const original=full.filter(q=>q.type!=='fill').map(q=>({...q,stem:q.id+' :: '+q.stem}));
  bank.questions.splice(0,bank.questions.length,...original);
  const failures=[];
  for(const button of document.querySelectorAll('#chapterMap [data-kind="choice"]')){
   const chapter=Number(button.dataset.chapter),expected=original.filter(q=>q.chapter===chapter),seen=[];
   button.click();let previous=null;
   while(!document.querySelector('#overviewView').classList.contains('is-visible')){
    const intro=!document.querySelector('#typeIntro').hidden;
    if(intro)document.querySelector('#enterStageButton').click();
    const q=expected.find(q=>q.stem===document.querySelector('#questionText').textContent);
    if(!q)throw Error('未知题目');
    if(!previous&&!intro)failures.push('缺少开场提示');
    if(previous&&previous.multiple&&!q.multiple)failures.push('章节顺序错误');
    if(previous&&Boolean(previous.multiple)!==Boolean(q.multiple)&&!intro)failures.push('缺少题型切换提示');
    if(intro&&document.querySelector('#enterStageButton').textContent!==(q.multiple?'多选题':'单选题'))failures.push('提示题型错误');
    q.answers.forEach(i=>document.querySelector('.option-button[data-option-index="'+i+'"]').click());
    if(q.multiple)document.querySelector('#submitButton').click();
    if(document.querySelector('#answerStatus').textContent!=='✓')failures.push('判分错误');
    seen.push(q.id);previous=q;document.querySelector('#nextButton').click();
    if(seen.length>expected.length)throw Error('队列没有结束');
   }
   if(seen.length!==expected.length||new Set(seen).size!==expected.length)failures.push('题目重复或遗漏');
  }
  bank.questions.splice(0,bank.questions.length,...full);return failures;
 });assert.deepEqual(failures,[]);
 await page.locator('#fillMixButton').click();await page.locator('[data-mix-range="all"]').click();assert(await page.locator('#typeIntro').isHidden());
 assert.equal(await page.locator('#practiceTitle').innerText(),'填空混练');assert(await page.locator('.fill-input').first().isVisible());
 await page.locator('#questionStage .back-button').click();await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('.rail-nav .rail-item').count(),4);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'outputs/no-mix-mobile.png',fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);console.log('PASS: 疯狂混入口移除，十二章先单后多与题型提示、无重复遗漏、提示不计答题时间、填空练习和手机导航正常。');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
