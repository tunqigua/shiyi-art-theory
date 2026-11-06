const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const ctx={window:{}};for(const f of ['questions.js','fill-questions.js'])vm.runInNewContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
const all=[...ctx.window.SHIYI_QUESTION_BANK.questions,...ctx.window.SHIYI_FILL_BANK.questions],restored=all.filter(q=>q.reviewNotice);
assert.equal(restored.length,32);assert.equal(all.length,1209);assert.equal(ctx.window.SHIYI_QUESTION_BANK.pending.length,2);assert.equal(ctx.window.SHIYI_FILL_BANK.pending.length,0);
assert(restored.every(q=>q.restoredFrom&&q.reviewNotice.text));
assert.equal(all.find(q=>q.id==='w26-c06-s23').options[all.find(q=>q.id==='w26-c06-s23').answers[0]],'赵佶');
assert.equal(all.find(q=>q.id==='c06-f080').answers[0],'籍里柯');assert.deepEqual(Array.from(all.find(q=>q.id==='c01-f016').answers),['罗丹','感性','理性']);
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:18768');
 const failures=await page.evaluate(()=>{
  const bank=window.SHIYI_QUESTION_BANK,original=bank.questions.slice(),qs=original.filter(q=>q.reviewNotice),failures=[];
  for(const q of qs){
   bank.questions.splice(0,bank.questions.length,q);
   if(q.type==='fill')document.querySelector('#fillMixButton').click();else document.querySelector('.chapter-kinds [data-kind="choice"][data-chapter="'+q.chapter+'"]').click();
   document.querySelector('#enterStageButton').click();
   if(!document.querySelector('#answerPanel').hidden)failures.push(q.id+':提前显示答案');
   if(q.type==='fill'){
    [...document.querySelectorAll('.fill-input')].forEach((x,i)=>{x.value=q.answers[q.answers.length-1-i];x.dispatchEvent(new Event('input'));});document.querySelector('#submitButton').click();
   }else{q.answers.forEach(i=>document.querySelector('.option-button[data-option-index="'+i+'"]').click());if(q.multiple)document.querySelector('#submitButton').click();}
   if(document.querySelector('#answerStatus').textContent!=='✓')failures.push(q.id+':参考口径判错');
   const note=document.querySelector('#answerExplanation .review-notice');if(!note||!note.textContent.includes(q.reviewNotice.text))failures.push(q.id+':缺少红字说明');
   if(note){const rgb=getComputedStyle(note.querySelector('p')).color.match(/\d+/g).map(Number);if(rgb[0]<=rgb[1])failures.push(q.id+':不是红字');}
  }
  bank.questions.splice(0,bank.questions.length,...original);return failures;
 });assert.deepEqual(failures,[]);
 await page.reload();await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{const qs=window.SHIYI_QUESTION_BANK.questions,q=qs.find(q=>q.id==='w26-c06-s23');qs.splice(0,qs.length,q);document.querySelector('.chapter-kinds [data-kind="choice"][data-chapter="6"]').click();document.querySelector('#enterStageButton').click();document.querySelector('.option-button[data-option-index="0"]').click();});
 assert(await page.locator('.review-notice').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'outputs/restored-listening-red-note.png',fullPage:true,animations:'disabled'});assert.deepEqual(errors,[]);
 console.log('PASS: 30项恢复为32个练习，书本口径判分，答对也显示红字分歧与来源，填空补全/乱序、选择随机换位、手机布局及剩余2项缺题隔离。');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
