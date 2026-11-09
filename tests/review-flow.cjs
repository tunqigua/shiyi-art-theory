const assert=require('node:assert/strict');const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-11-09T10:00:00+08:00')});await page.goto(process.env.TEST_URL||'http://127.0.0.1:19880');
 const old=await page.evaluate(()=>{
  const t=window.SHIYI_TERMS,b=t.exportData(),selected=[b.bank.find(x=>x.chapter===1),b.bank.find(x=>x.chapter===8),b.bank.find(x=>x.chapter===12)];
  selected.forEach((q,i)=>b.records[q.id]=[{id:'old-'+i,chapter:q.chapter,name:q.name,color:['red','yellow','green'][i],at:'2026-11-07T02:00:00Z',due:i===2?'2026-11-20':'2026-11-09',stage:i===2?1:0,count:1}]);localStorage.setItem(t.KEY,JSON.stringify(b));return b;
 });await page.reload();
 await page.locator('#continueButton').click();await page.clock.runFor(400);await page.locator('#chapterGrid [data-kind="terms"][data-chapter="2"]').click();assert(await page.locator('#termCard').isVisible());assert.equal(await page.locator('#termCardChapter').textContent(),'第2章');assert(await page.locator('#termAnswer').isHidden());
 await page.locator('#termReveal').click();assert(await page.locator('#termAnswer').isVisible());await page.locator('[data-term-color="red"]').click();await page.locator('#termUndo').click();
 assert.deepEqual(await page.evaluate(()=>window.SHIYI_TERMS.exportData().records),old.records);await page.locator('#termBack').click();assert(await page.locator('#termLibrary').isVisible());
 await page.locator('#termSelect').selectOption('1');await page.locator('#termColorFilter').selectOption('red');assert.equal(await page.locator('#termHistory details').count(),1);await page.locator('#termHistory summary').click();assert(await page.locator('.term-record-answer').isVisible());
 await page.locator('#termLibrary .term-rules summary').click();await page.locator('#termRedDays').fill('2');await page.locator('#termSaveRules').click();assert((await page.locator('#termMessage').textContent()).includes('已保存'));assert(await page.locator('#termMessage').isVisible());assert.deepEqual(await page.evaluate(()=>window.SHIYI_TERMS.exportData().records),old.records);await page.locator('[data-mistake-view="review"]').click();assert.equal(await page.locator('.review-module').count(),4);assert.equal(await page.locator('[data-review-kind="terms"] strong').textContent(),'2');
 await page.locator('[data-review-kind="terms"]').click();assert(await page.locator('#termCard').isVisible());await page.locator('#termReveal').click();await page.locator('[data-term-color="green"]').click();
 const updated=await page.evaluate(()=>window.SHIYI_TERMS.exportData());const changed=Object.keys(updated.records).find(id=>updated.records[id].length===2);assert(changed);assert.equal(updated.records[changed][1].due,'2026-11-12');assert.deepEqual(updated.records[changed][0],old.records[changed][0]);
 await page.locator('#termBack').click();await page.reload();assert.deepEqual(await page.evaluate(()=>window.SHIYI_TERMS.exportData().records),updated.records);
 const result=await page.evaluate(()=>{
  const failures=[],counts=[];const norm=t=>t.replace('以上三个都不是','其他三个选项都不是');
  for(const kind of ['choice','fill','terms'])for(const range of ['first','last','all']){
   document.querySelector('.rail-item[data-view="overview"]').click();document.querySelector('#'+({choice:'choiceMixButton',fill:'fillMixButton',terms:'termMixButton'})[kind]).click();document.querySelector('[data-mix-range="'+range+'"]').click();
   const candidates=(kind==='terms'?window.SHIYI_TERMS.exportData().bank:window.SHIYI_QUESTION_BANK.questions.filter(q=>(q.type==='fill')===(kind==='fill'))).filter(q=>range==='all'||(range==='first'?q.chapter<=6:q.chapter>=7));
   const seen=new Set();let steps=0;
   while(steps<candidates.length+1){
    if(kind==='terms'){
     if(document.querySelector('#termName').textContent==='本轮完成')break;
     const ch=Number(document.querySelector('#termCardChapter').textContent.match(/\d+/)?.[0]);const name=document.querySelector('#termName').textContent;const q=candidates.find(q=>q.chapter===ch&&q.name===name);
     if(!q||seen.has(q.id)){failures.push(kind+range+':越界或重复');break;}seen.add(q.id);document.querySelector('#termSkip').click();
    }else{
     if(!document.querySelector('#practiceView').classList.contains('is-visible'))break;
     const stem=document.querySelector('#questionText').textContent.replace(/（\d+）(?=____)/g,'');const displayed=[...document.querySelectorAll('.option-button span')].map(b=>b.textContent).sort().join('|');const q=candidates.find(q=>q.stem===stem&&!seen.has(q.id)&&(kind==='fill'||q.options.map(norm).sort().join('|')===displayed));if(!q){failures.push(kind+range+':越界或重复');break;}seen.add(q.id);
     if(!document.querySelector('#typeIntro').hidden){failures.push(kind+range+':混练被提示中断');break;}
     if(kind==='fill'){[...document.querySelectorAll('.fill-input')].forEach((x,i)=>{x.value=q.answers[i];x.dispatchEvent(new Event('input'));});document.querySelector('#submitButton').click();}
     else{for(const text of q.answers.map(i=>norm(q.options[i]))){const button=[...document.querySelectorAll('.option-button')].find(b=>b.querySelector('span').textContent===text);if(button)button.click();}if(q.multiple)document.querySelector('#submitButton').click();}
     const first=document.querySelector('#answerExplanation').firstElementChild;if(first?.textContent!=='参考答案')failures.push(kind+range+':答案未置顶');document.querySelector('#nextButton').click();
    }steps++;
   }
   counts.push({kind,range,seen:seen.size,expected:candidates.length});if(seen.size!==candidates.length)failures.push(kind+range+':题量不符');
   if(kind==='terms')document.querySelector('#termBack').click();
  }return{failures,counts};
 });assert.deepEqual(result.failures,[]);console.log(JSON.stringify(result.counts));
 await page.locator('.rail-item[data-view="mistakes"]').click();await page.locator('[data-mistake-view="review"]').click();await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'outputs/review-flow-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: 三题型九种范围完整抽题、无重复越界、章节名词直达、旧记录/评分/撤销/颜色筛选/跨章到期/下次排期、答案置顶和手机布局。');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
