const assert=require('node:assert/strict');const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:19879');
 const key='shiyi-art-theory-progress-v1',at='2026-11-08T03:00:00Z';
 const cases=[['c10-f025',['意识','潜意识','无意识'],true,false],['c10-f025',['意识','前意识','无意识'],false,true],['c06-f009',['凸版','凹版','平板'],true,false],['c06-f009',['凸版','凹版','平版'],false,true],['c12-m03',[0,1,2,3],true,false],['c12-m03',[0,1,2],false,true],['c01-s01',[2],true,true]];
 const state={attempts:cases.map(([questionId,selectedIndex,correct])=>({questionId,selectedIndex,correct,at,durationMs:5000})),questionStats:{},favorites:['c10-f025','c12-m03','c01-s01'],dailyStudyMs:{'2026-11-08':35000},dailyAnswers:{'2026-11-08':{correct:4,wrong:3}},dailyGoal:77};
 for(const[id,,correct]of cases){const s=state.questionStats[id]||(state.questionStats[id]={attempts:0,wrongCount:0,lastCorrect:correct,lastAt:at});s.attempts++;if(!correct)s.wrongCount++;}
 await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state});await page.reload();
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 assert.equal(saved.attempts.length,7);saved.attempts.forEach((a,i)=>{assert.equal(a.correct,cases[i][3]);assert.deepEqual(a.selectedIndex,cases[i][1]);});
 assert.deepEqual(saved.favorites,state.favorites);assert.deepEqual(saved.dailyStudyMs,state.dailyStudyMs);assert.equal(saved.dailyGoal,77);
 assert.deepEqual(saved.dailyAnswers,state.dailyAnswers);for(const id of ['c10-f025','c06-f009','c12-m03'])assert.equal(saved.questionStats[id].wrongCount,1);
 await page.reload();assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),saved);
 for(const id of ['c12-m03','c07-s51','w26-c09-m07']){
  await page.evaluate(id=>{const b=window.SHIYI_QUESTION_BANK,q=b.questions.find(q=>q.id===id);b.questions.splice(0,b.questions.length,q);document.querySelector('.chapter-kinds [data-kind="choice"][data-chapter="'+q.chapter+'"]').click();document.querySelector('#enterStageButton').click();for(const i of q.answers)document.querySelector('[data-option-index="'+i+'"]')?.click();if(q.multiple)document.querySelector('#submitButton').click();},id);
  assert.equal(await page.locator('#answerStatus').textContent(),'✓');
  if(id!=='w26-c09-m07')assert(await page.locator('.review-notice').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.reload();
 }
 assert(await page.locator('#termsView').count());assert(await page.locator('#termRandom').count());assert.deepEqual(errors,[]);
 console.log('PASS: 选择与填空勘误双向重判、原始作答/收藏/时长/目标保留，刷新幂等，争议红字及第九章补题手机显示正常，名词解释入口保留。');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
