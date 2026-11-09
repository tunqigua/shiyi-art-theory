const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={window:{}};for(const f of ['questions','fill-questions','fill-utils','explanations'])vm.runInNewContext(fs.readFileSync('dist/'+f+'.js','utf8'),c);
const choices=c.window.SHIYI_QUESTION_BANK.questions,fills=c.window.SHIYI_FILL_BANK.questions,all=[...choices,...fills];
const rows=JSON.parse(fs.readFileSync('data/weekly-tests-20261103.json')).questions;
const report=JSON.parse(fs.readFileSync('data/weekly-recheck-20261109.json'));
const norm=s=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}_]/gu,'').replaceAll('逝水','似水');
const opts=q=>q.options.map(norm).sort().join('|');
assert.equal(rows.length,190);assert.equal(all.length,1276);assert.equal(report.restored.length,57);
for(const row of rows){
 const matches=all.filter(q=>q.chapter===row.chapter && (row.kind==='fill'?q.type==='fill':q.type!=='fill'&&q.multiple===(row.kind==='m')) && norm(q.stem)===norm(row.correctedStem||row.stem) && (row.kind==='fill'||opts(q)===opts(row)));
 assert(matches.length>0,row.id+': 缺少本单元的完整试卷版本');
 if(row.kind==='fill'){
  const expected=row.correctedAnswers||row.answers;
  assert(matches.some(q=>q.answers.length===expected.length && c.window.SHIYI_FILL_UTILS.grade(q,expected).every(Boolean)),row.id+': 填空答案或空位不对应');
 }else{
  const expected=[...row.key].map(k=>norm(row.options[k.charCodeAt(0)-65])).sort();
  assert(matches.some(q=>JSON.stringify(q.answers.map(i=>norm(q.options[i])).sort())===JSON.stringify(expected)),row.id+': 选项内容与答案错配');
  for(const q of matches){
   const note=c.window.SHIYI_EXPLANATIONS[q.id];assert(note?.point,q.id);
   q.options.forEach((value,i)=>{if(!q.answers.includes(i))assert(note.options[String.fromCharCode(65+i)],q.id+': 缺少干扰项辨析');});
  }
 }
}
for(const item of report.restored){assert(all.find(q=>q.id===item.id)?.chapter===item.chapter,item.id);}
const get=id=>all.find(q=>q.id===id);
assert.equal(get('w26-c02-m03').chapter,2);
assert.deepEqual(Array.from(get('w26-c02-m03').answers),[0,1,3,4]);
assert.equal(get('w26-c02-m01').options[4],'克罗齐');
assert.equal(get('w26-c02-m02').options[4],'谷鲁斯');
assert(get('c03-m04')&&get('c02-m01')&&get('c02-m03'));
console.log('PASS: 全部190道试卷题在本单元保留完整题面、全部选项或空位，答案按内容对应；57个不同版本恢复，第二章多选1—3题完整。');
