const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};
for(const file of ['questions.js','explanations.js','fill-questions.js','fill-utils.js','fill-feedback.js'])vm.runInNewContext(fs.readFileSync('dist/'+file,'utf8'),ctx);
const w=ctx.window, fills=w.SHIYI_FILL_BANK.questions, all=[...w.SHIYI_QUESTION_BANK.questions,...fills];
const feedback=w.SHIYI_FILL_FEEDBACK.create(all,w.SHIYI_EXPLANATIONS);
const q=fills.find(q=>q.id==='c01-f001');
const rows=feedback(q,['顾恺之','清吹','赏舞']);
assert(rows[0].matches.some(m=>m.context.includes('以形写神')),'识别画家对应的历史考点');
assert.equal(rows[1].misplaced[0],3);assert.equal(rows[2].misplaced[0],2);
assert(!rows[0].correct);
assert(feedback(q,q.answers).every(r=>r.correct));
assert.equal(feedback(q,['不在题库中的答案','赏舞','清吹'])[0].matches.length,0);
assert(feedback(q,[' 《顾恺之》 ','赏舞','清吹'])[0].matches.length>0,'标点与空格规范化检索');
const alias=fills.find(q=>q.aliases?.some(a=>a?.length));
const values=alias.answers.slice(),slot=alias.aliases.findIndex(a=>a?.length);values[slot]=alias.aliases[slot][0];assert(feedback(alias,values)[slot].correct,'有效别名不误判');
for(const question of fills){
 assert.equal((w.SHIYI_FILL_FEEDBACK.complete(question).match(/【/g)||[]).length,question.answers.length);
 assert(feedback(question,question.answers).every(r=>r.correct));
}
console.log('PASS: 答案归属、画家易混、错位空格、别名、未知输入，以及全部589题正确答案与串句。');
