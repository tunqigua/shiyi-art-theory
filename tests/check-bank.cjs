const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ctx = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'dist/questions.js'),'utf8'),ctx);
const bank = JSON.parse(JSON.stringify(ctx.window.SHIYI_QUESTION_BANK));
const source = JSON.parse(fs.readFileSync(path.join(root,'data/source-questions.json'),'utf8'));
const originals = [...source.questions,...source.pending.filter(q=>q.stem)];
assert.equal(originals.length,499);
assert.equal(bank.questions.length,498);
assert.equal(source.questions.length,481);
assert.equal(bank.pending.length,20);
assert.deepEqual(Array.from({length:12},(_,i)=>originals.filter(q=>q.chapter===i+1).length),[24,9,13,32,38,91,89,74,35,34,25,35]);
assert.equal(new Set(bank.questions.map(q=>q.id)).size,bank.questions.length);
const seen = new Set();
for (const q of bank.questions) {
  const s = source.questions.find(s=>s.chapter===q.chapter && s.kind===q.source.kind && s.number===q.source.number);
  assert(s,q.id);
  seen.add(s);
  const labels = Object.keys(s.opts).sort();
  assert.deepEqual(labels,'ABCDEFG'.slice(0,labels.length).split(''),q.id);
  assert.deepEqual(q.options,labels.map(k=>s.opts[k]),q.id);
  const groups = s.key.startsWith('(') ? [...s.key.slice(1,-1)] : s.key.split('/');
  const key = groups[(q.source.part||1)-1];
  assert.deepEqual(q.answers,[...key].map(k=>k.charCodeAt(0)-65),q.id);
  assert(q.answers.length>0 && q.answers.every(a=>Number.isInteger(a)&&a>=0&&a<q.options.length),q.id);
  assert.equal(q.multiple,s.kind==='m',q.id);
  assert.equal(q.stem.split('（').length,q.stem.split('）').length,q.id);
  assert(!/https?:|金航|51020268|[a-z]/.test(q.stem+q.options.join('')),q.id);
  assert(q.options.every(x=>x.length>0),q.id);
}
assert.equal(seen.size,481);
for(const q of bank.pending.filter(q=>q.stem)) {
  const matching=bank.questions.filter(x=>x.chapter===q.chapter&&x.source.kind===q.kind&&x.source.number===q.number);
  assert(matching.length===0 || q.reason.includes('重复题号'),q.reason);
}
console.log('PASS: 499原题无遗漏，498练习项逐项答案与来源一致，20待核对项不误入判分。');
