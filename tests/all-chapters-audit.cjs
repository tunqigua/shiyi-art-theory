const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={window:{}};for(const n of ['questions','fill-questions','fill-utils','explanations'])vm.runInNewContext(fs.readFileSync('dist/'+n+'.js','utf8'),c);
const bank=c.window.SHIYI_QUESTION_BANK,fills=c.window.SHIYI_FILL_BANK.questions,all=[...bank.questions,...fills],get=id=>all.find(q=>q.id===id);
const report=JSON.parse(fs.readFileSync('data/all-chapters-audit-20261109.json'));
assert.equal(all.length,1291);assert.equal(new Set(all.map(q=>q.id)).size,1291);
assert.equal(report.preservedQuestionIds.length,1276);
for(const id of report.preservedQuestionIds)assert(get(id),'旧题编号丢失：'+id);
for(const row of report.chapterCounts){assert.equal(bank.questions.filter(q=>q.chapter===row.chapter).length,row.choices);assert.equal(fills.filter(q=>q.chapter===row.chapter).length,row.fills);}
assert.equal(get('c04-f007').answers[0],'波德莱尔');assert.equal(get('c10-f032').answers[1],'波德莱尔');
assert.equal(get('c06-f009').answers[2],'平版');assert.equal(get('c08-f005').answers[0],'谭鑫培');
for(const id of ['c04-f007','c10-f032','c06-f009','c08-f005']){assert(get(id).originalAnswers);assert(get(id).fillAnswerRevision);}
assert(c.window.SHIYI_FILL_UTILS.grade(get('c10-f025'),['意识','前意识','无意识']).every(Boolean));
assert(!c.window.SHIYI_FILL_UTILS.grade(get('c10-f025'),['意识','潜意识','无意识']).every(Boolean));
assert.deepEqual(Array.from(get('c12-m03').answers),[0,1,2]);
assert(c.window.SHIYI_EXPLANATIONS['c12-m03'].options.D.includes('颠倒'));
assert(get('c12-m03').reviewNotice);
for(const id of ['c07-s51','c08-m02','c08-m09','c10-f035','c12-f038'])assert(get(id).reviewNotice,id);
assert(get('c08-f029').study.point.includes('不在1895年12月28日'));
assert(get('c08-f052').stem.includes('三色特艺彩色'));
assert(get('c11-f054').stem.includes('魏晋时期'));
assert(get('c01-f021').stem.includes('作品36')&&get('c10-f028').stem.includes('作品73'));
for(const id of ['c06-f080','c07-f015'])assert(c.window.SHIYI_FILL_UTILS.grade(get(id),[get(id).aliases[0][0]]).every(Boolean),id);
assert.deepEqual(JSON.parse(JSON.stringify(c.window.SHIYI_FILL_BANK)),JSON.parse(fs.readFileSync('data/fill-source.json')));
for(const q of fills)for(let i=0;i<q.answers.length;i++)for(const alias of q.aliases?.[i]||[]){const input=Array.from(q.answers);input[i]=alias;assert(c.window.SHIYI_FILL_UTILS.grade(q,input).every(Boolean),q.id+': '+alias);}
console.log('PASS: 十二章1291题结构一致，原1276个编号全部保留，5项填空答案勘误和第十二章整项语义判分正确，争议提示与15个补回版本可追溯。');
