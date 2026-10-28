// 将人工编写的原题解析关联到拆空后的练习项，不改动题目或判分。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const context = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'dist/questions.js'), 'utf8'), context);
const bank = context.window.SHIYI_QUESTION_BANK;
const notes = {};
const references = JSON.parse(fs.readFileSync(path.join(root, 'data/explanation-sources.json'), 'utf8'));
for (const line of fs.readFileSync(path.join(root, 'data/explanation-notes.txt'), 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [ids, point, contrasts] = line.split('|');
  assert(point && contrasts !== undefined, '解析格式：' + ids);
  const options = {};
  for (const entry of contrasts.split(';').filter(Boolean)) {
    const match = entry.match(/^([A-G]+):(.+)$/);
    assert(match, '选项格式：' + ids + ' ' + entry);
    for (const letter of match[1]) {
      assert(!options[letter], '重复选项：' + ids + letter);
      options[letter] = match[2];
    }
  }
  for (const id of ids.split(',')) {
    assert(!notes[id], '重复解析：' + id);
    const sources = references.filter(source => source.ids.includes(id)).map(({title, url, scope}) => ({title, url, scope}));
    const correction = bank.corrections.find(item => item.id === id);
    if (correction) sources.push({title: '题库勘误核对资料', url: correction.url, scope: correction.note});
    notes[id] = {point, options, sources};
  }
}
const used = new Set();
let excluded = 0;
for (const q of bank.questions) {
  const id = q.id.replace(/-[1-9]$/, '');
  const note = notes[id];
  assert(note, '缺少本题考点：' + q.id);
  used.add(id);
  q.options.forEach((option, i) => {
    if (q.answers.includes(i)) return;
    const letter = String.fromCharCode(65 + i);
    assert(note.options[letter], '缺少非应选项辨析：' + q.id + ' ' + letter + option);
    excluded++;
  });
}
assert.equal(used.size, Object.keys(notes).length, '存在未使用的解析');
fs.writeFileSync(path.join(root, 'dist/explanations.js'),
  '// 由 scripts/build-explanations.cjs 从人工解析生成。\nwindow.SHIYI_EXPLANATIONS = ' + JSON.stringify(notes, null, 2) + ';\n');
console.log(`PASS: ${used.size}道原题、${bank.questions.length}个练习项、${excluded}个非应选项均有解析。`);
