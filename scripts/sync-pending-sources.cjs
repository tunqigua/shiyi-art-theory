const fs=require('node:fs'),vm=require('node:vm');const ctx={window:{}};
for(const name of ['questions.js','fill-questions.js','explanations.js'])vm.runInNewContext(fs.readFileSync('dist/'+name,'utf8'),ctx);
const choice=ctx.window.SHIYI_QUESTION_BANK,fill=ctx.window.SHIYI_FILL_BANK,explanations=ctx.window.SHIYI_EXPLANATIONS;
const log=JSON.parse(fs.readFileSync('data/pending-resolutions-20261106.json','utf8'));
const source=JSON.parse(fs.readFileSync('data/source-questions.json','utf8'));
source.resolvedPending=log.items.filter(r=>r.restored.type!=='fill').map(r=>r.original);
source.pending=choice.pending;
for(const r of log.items.filter(r=>r.restored.type!=='fill')){
 const q=r.restored,code=q.id.replace(/-[1-9]$/,'');if(source.questions.some(row=>(row.code||`c${String(row.chapter).padStart(2,'0')}-${row.kind}${String(row.number).padStart(2,'0')}`)===code))continue;
 const base=code==='c09-s21'?{...q.restoredFrom,stem:'长篇小说《安娜·卡列尼娜》的结构属于（　）。柳青的小说《创业史》属于（　）。库尔特·冯尼格的意识流小说《第五号屠场》属于（　）。'}:q.restoredFrom;
 source.questions.push({code,chapter:q.chapter,kind:q.multiple?'m':'s',number:q.source.number,page:q.source.page||q.source.pdfPage,stem:base.stem,opts:Object.fromEntries(q.options.map((text,i)=>[String.fromCharCode(65+i),text])),key:code==='c09-s21'?'(BCD)':q.answers.map(i=>String.fromCharCode(65+i)).join(''),originalKey:base.originalKey,source:q.source,reviewNotice:q.reviewNotice});
}
fs.writeFileSync('data/source-questions.json',JSON.stringify(source,null,2)+'\n');
const fillSource=JSON.parse(fs.readFileSync('data/fill-source.json','utf8'));fillSource.questions=fill.questions;fillSource.resolvedPending=log.items.filter(r=>r.restored.type==='fill').map(r=>r.original);fillSource.pending=fill.pending;fillSource.version=fill.version;fs.writeFileSync('data/fill-source.json',JSON.stringify(fillSource,null,2)+'\n');
const weekly=JSON.parse(fs.readFileSync('data/weekly-tests-20261103.json','utf8'));
for(const row of weekly.questions.filter(row=>row.status==='pending')){
 const resolution=log.items.find(r=>r.id===row.id);if(!resolution)continue;row.previousStatus='pending';row.status='restored';row.targets=[resolution.id];row.resolution=resolution.restored.reviewNotice;
}
fs.writeFileSync('data/weekly-tests-20261103.json',JSON.stringify(weekly,null,2)+'\n');
const notes=fs.readFileSync('data/explanation-notes.txt','utf8');const existing=new Set(notes.split('\n').flatMap(line=>line.split('|')[0].split(',')));
const refs=JSON.parse(fs.readFileSync('data/explanation-sources.json','utf8'));let append='';
for(const r of log.items.filter(r=>r.restored.type!=='fill')){
 const id=r.id.replace(/-[1-9]$/,'');if(existing.has(id))continue;existing.add(id);const note=explanations[id];
 append+=id+'|'+note.point+'|'+Object.entries(note.options).map(([letter,text])=>letter+':'+text).join(';')+'\n';
 for(const ref of note.sources)refs.push({...ref,ids:[id]});
}
fs.writeFileSync('data/explanation-notes.txt',notes.trimEnd()+'\n'+append);
fs.writeFileSync('data/explanation-sources.json',JSON.stringify(refs,null,2)+'\n');
console.log({sourceQuestions:source.questions.length,choice:choice.questions.length,fill:fill.questions.length,weeklyRestored:weekly.questions.filter(r=>r.status==='restored').length});
