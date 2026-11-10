const assert=require('node:assert/strict');const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch({headless:true});try{
 const p=await b.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:19880');
 await p.locator('#choiceMixButton').click();assert.equal(await p.locator('#mixFromChapter option').count(),12);assert.equal(await p.locator('#mixToChapter option').count(),12);
 await p.locator('#mixFromChapter').selectOption('8');await p.locator('#mixToChapter').selectOption('3');await p.locator('#customMixRange button').click();assert(await p.locator('#mixScope').isVisible());assert((await p.locator('#mixRangeError').textContent()).includes('不能早于'));
 await p.locator('#mixFromChapter').selectOption('6');await p.locator('#mixToChapter').selectOption('7');await p.locator('#customMixRange button').focus();await p.keyboard.press('Enter');
 assert.equal(await p.evaluate(()=>document.activeElement.id),'questionText');assert.equal(await p.locator('#questionText').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
 await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.classList.contains('option-button')),true);assert.notEqual(await p.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'none');
 const result=await p.evaluate(()=>{
  const errors=[],counts=[],normalize=t=>t.replace('以上三个都不是','其他三个选项都不是');
  for(const kind of ['choice','fill','terms'])for(const [from,to]of [[5,5],[6,7],[12,12]]){
   document.querySelector('.rail-item[data-view="overview"]').click();document.querySelector('#'+{choice:'choiceMixButton',fill:'fillMixButton',terms:'termMixButton'}[kind]).click();document.querySelector('#mixFromChapter').value=from;document.querySelector('#mixToChapter').value=to;document.querySelector('#customMixRange').requestSubmit();
   const qs=(kind==='terms'?window.SHIYI_TERMS.exportData().bank:window.SHIYI_QUESTION_BANK.questions.filter(q=>(q.type==='fill')===(kind==='fill'))).filter(q=>q.chapter>=from&&q.chapter<=to);const seen=new Set();
   for(let n=0;n<=qs.length;n++){
    if(kind==='terms'){
     if(document.querySelector('#termName').textContent==='本轮完成')break;
     const ch=Number(document.querySelector('#termCardChapter').textContent.match(/\d+/)?.[0]),name=document.querySelector('#termName').textContent,q=qs.find(q=>q.chapter===ch&&q.name===name&&!seen.has(q.id));if(!q){errors.push(kind+from+':越界或重复');break;}seen.add(q.id);document.querySelector('#termSkip').click();
    }else{
     if(!document.querySelector('#practiceView').classList.contains('is-visible'))break;
     const stem=document.querySelector('#questionText').textContent.replace(/（\d+）(?=____)/g,''),opts=[...document.querySelectorAll('.option-button span')].map(x=>x.textContent).sort().join('|');const q=qs.find(q=>q.stem===stem&&!seen.has(q.id)&&(kind==='fill'||q.options.map(normalize).sort().join('|')===opts));if(!q){errors.push(kind+from+':越界或重复');break;}seen.add(q.id);
     if(getComputedStyle(document.querySelector('#questionText')).outlineStyle!=='none')errors.push('题干仍有焦点框');
     if(kind==='fill'){[...document.querySelectorAll('.fill-input')].forEach((x,i)=>{x.value=q.answers[i];x.dispatchEvent(new Event('input'));});document.querySelector('#submitButton').click();}else{q.answers.forEach(i=>[...document.querySelectorAll('.option-button')].find(b=>b.querySelector('span').textContent===normalize(q.options[i])).click());if(q.multiple)document.querySelector('#submitButton').click();}
     if(document.querySelector('#answerStatus').textContent!=='✓')errors.push('正确答案判错');document.querySelector('#nextButton').click();
    }
   }
   counts.push({kind,from,to,seen:seen.size,expected:qs.length});if(seen.size!==qs.length)errors.push(kind+from+':题量不符');
   if(kind==='terms'){document.querySelector('#termAgain').click();const chapter=Number(document.querySelector('#termCardChapter').textContent.match(/\d+/)?.[0]);if(chapter<from||chapter>to)errors.push('再来一轮丢失范围');document.querySelector('#termBack').click();}
  }return{errors,counts};
 });assert.deepEqual(result.errors,[]);console.log(JSON.stringify(result.counts));
 await p.locator('.rail-item[data-view="overview"]').click();await p.setViewportSize({width:390,height:844});await p.locator('#termMixButton').click();assert(await p.evaluate(()=>document.querySelector('#mixScope').scrollWidth<=document.querySelector('#mixScope').clientWidth));await p.screenshot({path:'outputs/custom-mix-mobile-20261110.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS: 三种题型自选范围、同章/跨6至7章/第12章边界、完整随机队列无重复越界、非法范围阻止、名词再练保留范围、题干无框且键盘控件焦点保留、手机布局。');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
