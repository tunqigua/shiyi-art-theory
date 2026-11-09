const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:18768');
 const result=await page.evaluate(()=>{
  const bank=window.SHIYI_QUESTION_BANK,original=bank.questions.slice(),questions=original.filter(q=>q.type!=='fill'),failures=[];
  const shown=t=>t.replace('以上三个都不是','其他三个选项都不是');
  const buttons=()=>[...document.querySelectorAll('.option-button')];
  const text=b=>b.querySelector('span').textContent;
  const store=()=>JSON.parse(localStorage.getItem('shiyi-art-theory-progress-v1'));
  for(const q of questions){
   const snapshot=JSON.stringify(q);
   function start(){bank.questions.splice(0,bank.questions.length,q);document.querySelector('.chapter-kinds [data-kind="choice"][data-chapter="'+q.chapter+'"]').click();document.querySelector('#enterStageButton').click();return buttons().map(text);}
   const first=start();
   if(JSON.stringify([...first].sort())!==JSON.stringify(q.options.map(shown).sort()))failures.push(q.id+':缺失或重复选项');
   const answerTexts=q.answers.map(i=>shown(q.options[i]));
   for(const value of answerTexts)buttons().find(b=>text(b)===value).click();
   if(q.multiple){const selected=buttons().find(b=>text(b)===answerTexts[0]);selected.click();selected.click();document.querySelector('#submitButton').click();}
   if(document.querySelector('#answerStatus').textContent!=='✓')failures.push(q.id+':正确内容判错');
   if(JSON.stringify(store().attempts[0].selectedIndex)!==JSON.stringify([...q.answers].sort()))failures.push(q.id+':记录编号被改变');
   if(buttons().filter(b=>b.classList.contains('is-correct')).map(text).sort().join('|')!==answerTexts.sort().join('|'))failures.push(q.id+':高亮错误');
   const analysis=[...document.querySelectorAll('.option-analysis h3')].map(h=>h.textContent);
   first.forEach((value,i)=>{if(!analysis[i]?.startsWith(String.fromCharCode(65+i)+' · '+value))failures.push(q.id+':解析排列不对应');});
   const second=start();if(first.join('|')===second.join('|'))failures.push(q.id+':重复出题顺序相同');
   const wrong=q.multiple?[q.answers[0]]:[(q.answers[0]+1)%q.options.length];
   if(q.multiple&&q.answers.length===1)wrong.push((q.answers[0]+1)%q.options.length);
   wrong.forEach(i=>buttons().find(b=>text(b)===shown(q.options[i])).click());if(q.multiple)document.querySelector('#submitButton').click();
   if(document.querySelector('#answerStatus').textContent!=='✕')failures.push(q.id+':错误内容判对');
   const expectedWrong=wrong.filter(i=>!q.answers.includes(i)).map(i=>shown(q.options[i])).sort();
   if(buttons().filter(b=>b.classList.contains('is-wrong')).map(text).sort().join('|')!==expectedWrong.join('|'))failures.push(q.id+':错选高亮不对应');
   if(JSON.stringify(q)!==snapshot)failures.push(q.id+':原题被改动');
  }
  bank.questions.splice(0,bank.questions.length,...original);return{failures,count:questions.length};
 });assert.deepEqual(result.failures,[]);assert.equal(result.count,632);
 await page.reload();
 const multi=await page.evaluate(()=>{const qs=window.SHIYI_QUESTION_BANK.questions,q=qs.find(q=>q.options?.length===7);qs.splice(0,qs.length,q);document.querySelector('.chapter-kinds [data-kind="choice"][data-chapter="'+q.chapter+'"]').click();document.querySelector('#enterStageButton').click();return JSON.parse(JSON.stringify(q));});
 const texts=await page.locator('.option-button span').allTextContents();for(const i of multi.answers)await page.keyboard.press(String(texts.indexOf(multi.options[i])+1));
 await page.keyboard.press('Enter');assert.equal(await page.locator('#answerStatus').textContent(),'✓');
 assert.deepEqual(errors,[]);console.log('PASS: 632题随机排列、重复换位、内容判分、原编号记录、红绿与解析映射、原题不变，7选项多选键盘提交正常。');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
