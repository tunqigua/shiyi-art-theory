const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};
for(const file of ['questions','fill-questions','fill-utils','explanations'])vm.runInNewContext(fs.readFileSync('dist/'+file+'.js','utf8'),ctx);
const choices=ctx.window.SHIYI_QUESTION_BANK,fills=ctx.window.SHIYI_FILL_BANK;
const all=[...choices.questions,...fills.questions],byId=new Map(all.map(q=>[q.id,q]));
const manifest=JSON.parse(fs.readFileSync('data/chapter9-test-20261106.json','utf8'));
const rows=manifest.questions,added=rows.filter(r=>r.status==='added');
assert.equal(rows.length,35);assert.deepEqual(manifest.counts,{total:35,added:10,existing:24,pending:1});
assert.equal(new Set(rows.map(r=>r.id)).size,35);assert.equal(byId.size,1219);
assert.equal(added.length,10);assert.equal(rows.filter(r=>r.status==='existing').length,24);
assert.equal(added.filter(r=>r.kind==='s').length,5);assert.equal(added.filter(r=>r.kind==='m').length,1);assert.equal(added.filter(r=>r.kind==='fill').length,4);
for(const row of rows){
 assert(row.stem&&!/PAGE|金航|必赢/.test(row.stem+JSON.stringify(row.opts||{})),row.id);
 assert.equal(row.pdfPage,row.kind==='fill'||row.kind==='m'&&row.number>=9?2:1);
 if(row.status==='pending'){
  assert.equal(row.id,'w26-c09-s10');assert.equal(row.targets.length,0);assert(!byId.has(row.id));assert(row.reason&&row.verificationSources.length);continue;
 }
 assert.equal(row.targets.length,1);assert(byId.has(row.targets[0]));
 if(row.status==='existing'){assert(!byId.has(row.id),'重复题不创建编号：'+row.id);continue;}
 const q=byId.get(row.id);assert.equal(q.chapter,9);assert.equal(q.source.importId,row.id);assert.equal(q.source.pdfPage,row.pdfPage);
 assert(row.verificationSources.length&&row.verificationSources.every(s=>s.title&&s.scope&&s.url.startsWith('https://')),row.id);
 if(row.kind==='fill'){
  assert(q.study.point.includes('易混点')&&q.study.point.includes('记忆方法'),q.id);
  assert(ctx.window.SHIYI_FILL_UTILS.grade(q,q.answers).every(Boolean));
  for(const alias of q.aliases?.[0]||[])assert(ctx.window.SHIYI_FILL_UTILS.grade(q,[alias]).every(Boolean),q.id+':'+alias);
 }else{
  assert(ctx.window.SHIYI_EXPLANATIONS[q.id].point);assert(ctx.window.SHIYI_EXPLANATIONS[q.id].sources.length);
  assert.deepEqual(Array.from(q.answers),[...row.key].map(c=>c.charCodeAt(0)-65));
 }
}
const answers={s04:['六世纪'],s11:['朱自清'],s13:['《老人与海》'],s14:['《包身工》'],s15:['《岳阳楼记》'],m08:['准确性','鲜明性','生动性','形象性']};
for(const [suffix,values]of Object.entries(answers)){const q=byId.get('w26-c09-'+suffix);assert.deepEqual(Array.from(q.answers,i=>q.options[i]),values);}
for(const [suffix,value]of Object.entries({f07:'山居秋暝',f08:'郭沫若',f09:'英雄时代',f10:'剧本'}))assert.equal(byId.get('w26-c09-'+suffix).answers[0],value);
assert.equal(rows.find(r=>r.id==='w26-c09-s01').targets[0],'c09-f015');
assert.equal(rows.find(r=>r.id==='w26-c09-f02').targets[0],'c11-f020');
assert.equal(rows.find(r=>r.id==='w26-c09-m10').targets[0],'c04-m08');
assert.deepEqual(Array.from(byId.get('c09-s07').answers,i=>byId.get('c09-s07').options[i]),['八世纪']);
assert.equal(byId.get('c09-f020').answers[0],'公元前8世纪');
assert(!byId.get('w26-c09-s15').options[1].includes('往'));
assert.equal(rows.find(r=>r.id==='w26-c09-s15').opts.B,'《往桃花源记》');
assert.deepEqual(JSON.parse(JSON.stringify(fills.questions)),JSON.parse(fs.readFileSync('data/fill-source.json','utf8')).questions);
console.log('PASS: 第九章35题逐项核对，10新增、24去重、1未确认隔离；来源、6道选择答案、4道填空及别名、原题笔误与既有荷马时间答案均正确。');
