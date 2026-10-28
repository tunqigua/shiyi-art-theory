const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');const path=require('node:path');
const ctx={window:{}};const dir=path.join(__dirname,'../dist');
for(const f of ['questions.js','fill-questions.js','fill-utils.js'])vm.runInNewContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx);
const b=JSON.parse(JSON.stringify(ctx.window.SHIYI_FILL_BANK));const u=ctx.window.SHIYI_FILL_UTILS;
assert.equal(b.questions.length,564);assert.equal(b.pending.length,20);assert.equal(new Set(b.questions.map(q=>q.id)).size,b.questions.length);
for(const q of b.questions){
 assert.equal(q.type,'fill');assert.equal((q.stem.match(/____/g)||[]).length,q.answers.length,q.id);
 assert(q.answers.every(a=>typeof a==='string'&&a.length&&!/简答|名词解释|^[A-G]+$/.test(a)),q.id);
 assert(u.grade(q,q.answers).every(Boolean),q.id);
 assert(u.grade(q,q.answers.map(a=>'错误测试答案')).every(x=>!x),q.id);
 assert(u.grade(q,q.answers.map(a=>' 《'+a+'》 ')).every(Boolean),q.id);
 if(q.answers.length>1){const values=q.answers.slice();values[0]='错误测试答案';assert(!u.grade(q,values)[0]);assert(u.grade(q,values).slice(1).every(Boolean));}
 assert(q.source.pdfPage>=1&&q.source.pdfPage<=45);assert(q.source.answerPdfPage>=46&&q.source.answerPdfPage<=54);
 assert(!b.pending.some(p=>p.chapter===q.chapter&&p.number===q.source.number),q.id);
}
assert.deepEqual(Array.from({length:12},(_,i)=>b.questions.filter(q=>q.chapter===i+1).length),[29,35,28,45,39,71,31,43,22,49,83,89]);
assert.equal(b.questions.find(q=>q.id==='c11-f035').answers[0],'文化涵义');assert.equal(b.questions.find(q=>q.id==='c11-f085').answers[0],'言志');
const qs=[...ctx.window.SHIYI_QUESTION_BANK.questions,...b.questions];const backup={format:'shiyi-backup',version:1,state:{attempts:[],questionStats:{},favorites:[],dailyGoal:30}};
assert(u.validateBackup(backup,qs));assert.throws(()=>u.validateBackup({format:'shiyi-backup',version:1,state:{attempts:[],questionStats:{},favorites:['invalid']}},qs));
for(const invalid of [null,{}, {format:'shiyi-question-bank'}, {...backup,state:{...backup.state,dailyGoal:-1}}, {...backup,state:{...backup.state,dailyStudyMs:{'bad-date':2}}}, {...backup,state:{...backup.state,attempts:[{questionId:qs[0].id,correct:'false'}]}}])assert.throws(()=>u.validateBackup(invalid,qs));
console.log(`PASS: ${b.questions.length}填空题逐空正确/错误/标点判分，12章覆盖、错位答案对应、${b.pending.length}项隔离与备份校验。`);
