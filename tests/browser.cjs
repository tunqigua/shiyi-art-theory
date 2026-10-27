const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1400,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8765');
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/questions.js'),'utf8'),context);
  const bank=JSON.parse(JSON.stringify(context.window.SHIYI_QUESTION_BANK));
  assert.equal(await page.locator('.map-node').count(),12);
  assert.equal(await page.locator('#pendingQuestions article').count(),bank.pending.length);
  assert.equal(await page.locator('#correctedQuestions article').count(),16);
  await page.screenshot({path:path.join(__dirname,'../overview-checked.png'),fullPage:true,animations:'disabled'});
  const results=await page.evaluate(bank=>{
   const failures=[];
   const store=()=>JSON.parse(localStorage.getItem('shiyi-art-theory-progress-v1'));
   for(const q of bank.questions) {
    window.SHIYI_QUESTION_BANK.questions.splice(0,window.SHIYI_QUESTION_BANK.questions.length,q);
    document.querySelector('[data-action="mix"]').click();document.querySelector('#enterStageButton').click();
    const options=[...document.querySelectorAll('.option-button')];
    if(options.length!==q.options.length) failures.push(q.id+':选项数量');
    for(let i=0;i<options.length;i++)if(options[i].querySelector('span').textContent!==q.options[i])failures.push(q.id+':选项文字');
    const before=store()?.questionStats[q.id]?.attempts||0;
    for(const i of [...q.answers].reverse())options[i].click();
    if(q.multiple) {
     if(!document.querySelector('#answerPanel').hidden)failures.push(q.id+':过早提交');
     options[q.answers[0]].click();options[q.answers[0]].click();
     document.querySelector('#submitButton').click();
    }
    if(document.querySelector('#answerStatus').textContent!=='✓')failures.push(q.id+':正确答案判错');
    document.querySelector('#submitButton').click();options[0].click();
    if(store().questionStats[q.id].attempts!==before+1)failures.push(q.id+':重复记录');
    document.querySelector('[data-action="mix"]').click();document.querySelector('#enterStageButton').click();
    const wrong=q.multiple ? [q.answers[0]] : [(q.answers[0]+1)%q.options.length];
    if(q.multiple && q.answers.length===1)wrong.push((q.answers[0]+1)%q.options.length);
    for(const i of wrong)document.querySelectorAll('.option-button')[i].click();
    if(q.multiple)document.querySelector('#submitButton').click();
    if(document.querySelector('#answerStatus').textContent!=='✕')failures.push(q.id+':错误答案判对');
    const correct=[...document.querySelectorAll('.option-button')].flatMap((b,i)=>b.classList.contains('is-correct')?[i]:[]);
    if(JSON.stringify(correct)!==JSON.stringify(q.answers))failures.push(q.id+':正确高亮错位');
    if(document.querySelector('#nextButton').disabled)failures.push(q.id+':下一题被锁');
   }
   window.SHIYI_QUESTION_BANK.questions.splice(0,window.SHIYI_QUESTION_BANK.questions.length,...bank.questions);
   return {failures,stats:Object.keys(store().questionStats).length};
  },bank);
  assert.deepEqual(results.failures,[]);
  assert.equal(results.stats,bank.questions.length);
  const multi=bank.questions.find(q=>q.options.length===7);
  await page.evaluate(q=>{window.SHIYI_QUESTION_BANK.questions.splice(0,window.SHIYI_QUESTION_BANK.questions.length,q);document.querySelector('[data-action="mix"]').click();document.querySelector('#enterStageButton').click();},multi);
  assert(await page.locator('#submitButton').isDisabled());
  for(const i of multi.answers)await page.keyboard.press(String(i+1));
  assert(await page.locator('#answerPanel').isHidden());
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#answerStatus').textContent(),'✓');
  await page.keyboard.press('Enter');
  assert(await page.locator('#overviewView').isVisible());
  await page.reload();
  await page.locator('.rail-item[data-view="records"]').click();
  assert.equal(await page.locator('#allAttempts').textContent(),'500');
  assert.equal(await page.locator('#mistakeNavCount').textContent(),String(bank.questions.length));
  assert((await page.locator('#recordsToday').textContent()).includes('月'));
  assert(await page.locator('.calendar-day.is-today').count());
  await page.locator('.rail-item[data-view="overview"]').click();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'选择章节',exact:true}).click();
  assert.equal(await page.locator('.chapter-button').count(),12);
  await page.locator('.chapter-button').last().click();
  await page.locator('#enterStageButton').click();
  assert(await page.locator('#questionText').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(__dirname,'../mobile-checked.png'),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: '+bank.questions.length+'道练习项全部实测正确/错误答案、多选切换与提交、正确高亮、重复提交保护、保存恢复、十二章和移动端。');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

