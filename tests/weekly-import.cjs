const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx={window:{}};
for(const f of ['questions.js','fill-questions.js','explanations.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'dist',f),'utf8'),ctx);
const choices=ctx.window.SHIYI_QUESTION_BANK,fill=ctx.window.SHIYI_FILL_BANK;
const rows=JSON.parse(fs.readFileSync(path.join(root,'data/weekly-tests-20261103.json'),'utf8')).questions;
const all=[...choices.questions,...fill.questions],ids=new Map(all.map(q=>[q.id,q]));
assert.equal(rows.length,190);assert.equal(rows.filter(q=>q.kind!=='fill').length,131);assert.equal(rows.filter(q=>q.kind==='fill').length,59);
assert.equal(rows.filter(q=>q.status==='added').length,98);assert.equal(rows.filter(q=>q.status==='existing').length,85);assert.equal(rows.filter(q=>q.status==='pending').length,7);
assert.equal(all.length,1177);assert.equal(ids.size,1177);
assert.equal(choices.questions.filter(q=>!q.id.startsWith('w26-')).length,515);
assert.equal(fill.questions.filter(q=>!q.id.startsWith('w26-')).length,564);
for(const row of rows){
 if(row.status==='pending'){assert(!ids.has(row.id));assert([...choices.pending,...fill.pending].some(p=>p.source?.importId===row.id));continue;}
 for(const id of row.targets){
  assert(ids.has(id),row.id+' -> '+id);
  const q=ids.get(id);
  if(row.status==='added'){
   assert.equal(q.source.importId,row.id);
   if(q.type==='fill')assert(q.study?.point&&q.study.point.length>15,q.id);
   else assert(ctx.window.SHIYI_EXPLANATIONS[q.id]?.point,q.id);
  }else assert(q.additionalSources.some(s=>s.importId===row.id),row.id);
 }
}
assert.equal(ids.get('w26-c05-m10').answers.join(','),'0,1,2,4');
assert.equal(ids.get('c04-m10').answers.join(','),'1,2,3,4');
assert(ids.get('c04-m10').answerRevision);
assert.equal(ids.get('c06-f064').answers[0],'张璪');
assert.equal(ids.get('w26-c05-f08').answers[0],'园冶');
assert.equal(ids.get('c04-f031').id,'c04-f031');assert(!ids.get('c04-f031').stem.includes('西斯廷教堂'));
console.log('PASS: 190题逐项去向明确，98新增、85关联、7隔离；全部1079个旧练习编号保留，1177个练习无重复编号，关键勘误正确。');
