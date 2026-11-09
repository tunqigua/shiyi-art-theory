const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};
for(const name of ['questions','fill-questions','fill-utils','explanations'])vm.runInNewContext(fs.readFileSync('dist/'+name+'.js','utf8'),ctx);
const choices=ctx.window.SHIYI_QUESTION_BANK.questions,fills=ctx.window.SHIYI_FILL_BANK.questions,all=[...choices,...fills];
const manifest=JSON.parse(fs.readFileSync('data/chapter9-test-20261106.json'));
const norm=s=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}_]/gu,'');
assert.deepEqual(manifest.counts,{total:35,added:10,restored:15,existing:9,pending:1});
assert.equal(manifest.questions.length,35);
for(const row of manifest.questions){
 if(row.status==='pending'){assert.equal(row.id,'w26-c09-s10');assert(!all.some(q=>q.id===row.id));continue;}
 const targets=row.targets.map(id=>all.find(q=>q.id===id));assert(targets.length&&targets.every(Boolean),row.id);
 const matches=targets.filter(q=>q.chapter===9&&(q.type==='fill')===(row.kind==='fill')&&norm(q.stem)===norm(row.correctedStem||row.stem));
 assert(matches.length,row.id+': 本章完整题干或题型缺失');
 if(row.kind==='fill'){
  assert(matches.some(q=>ctx.window.SHIYI_FILL_UTILS.grade(q,row.correctedAnswers||row.answers||q.answers).every(Boolean)),row.id);
 }else{
  const expected=Object.values(row.correctedOptions||row.opts).map(norm).sort();
  assert(matches.some(q=>q.multiple===(row.kind==='m')&&JSON.stringify(q.options.map(norm).sort())===JSON.stringify(expected)),row.id+': 选项集合变化');
  for(const q of matches)assert(ctx.window.SHIYI_EXPLANATIONS[q.id]?.point,q.id);
  if(row.key)assert(matches.some(q=>q.answers.map(i=>q.options[i]).map(norm).sort().join('|')===[...row.key].map(k=>norm(row.opts[k])).sort().join('|')),row.id+': 答案错配');
 }
}
assert(all.find(q=>q.id==='w26-c09-m10')?.chapter===9);
assert(all.find(q=>q.id==='w26-c09-f02')?.chapter===9);
assert(all.find(q=>q.id==='c04-m08')&&all.find(q=>q.id==='c11-f020'));
console.log('PASS: 第九章35题逐项核对，34题在本章保留题型、完整题干、全部选项与空位；15个不同版本恢复，1题未确认继续隔离。');
