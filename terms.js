(function(root){
'use strict';
const KEY='shiyi-art-theory-terms-v1';
const DEFAULT_RULES={red:1,yellow:3,green:[3,7,30]};
const day=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
function validate(data){
 const fail=()=>{throw Error('名词解释备份格式不正确');};
 if(!object(data)||data.version!==1||!Array.isArray(data.bank)||!object(data.records)||!object(data.rules))fail();
 const ids=new Set();data.bank.forEach(t=>{if(!object(t)||typeof t.id!=='string'||!t.id||ids.has(t.id)||!Number.isInteger(t.chapter)||t.chapter<1||t.chapter>12||typeof t.name!=='string'||!t.name||typeof t.answer!=='string'||!t.answer)fail();ids.add(t.id);});
 if(!Array.isArray(data.rules.green)||data.rules.green.length!==3||![data.rules.red,data.rules.yellow,...data.rules.green].every(n=>Number.isInteger(n)&&n>=1&&n<=3650))fail();
 Object.entries(data.records).forEach(([id,h])=>{if(!ids.has(id)||!Array.isArray(h))fail();const attempts=new Set();h.forEach((r,i)=>{if(!object(r)||typeof r.id!=='string'||attempts.has(r.id)||!['red','yellow','green'].includes(r.color)||!Number.isFinite(Date.parse(r.at))||!validDay(r.due)||!Number.isInteger(r.stage)||r.stage<0||r.stage>3||r.count!==i+1||r.chapter!==data.bank.find(t=>t.id===id).chapter||typeof r.name!=='string')fail();attempts.add(r.id);});});return data;
}
function schedule(history,color,at,rules=DEFAULT_RULES){
 const last=history.at(-1);const stage=color==='green'?Math.min(last?.color==='green'?last.stage+1:1,3):0;
 const days=color==='green'?rules.green[stage-1]:rules[color];return{stage,due:addDays(day(new Date(at)),days)};
}
function shuffle(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function dueQueue(bank,records,today=day()){
 return shuffle(bank.filter(t=>records[t.id]?.at(-1)?.due<=today)).sort((a,b)=>{
 const x=records[a.id].at(-1),y=records[b.id].at(-1);
 return Number(y.due<today)-Number(x.due<today)||Number(y.color==='red')-Number(x.color==='red')||x.due.localeCompare(y.due);
 });
}
root.SHIYI_TERMS={KEY,day,addDays,validate,schedule,dueQueue,DEFAULT_RULES};
if(typeof document==='undefined')return;
let data,storageError=false;
try {const raw=localStorage.getItem(KEY);data=raw?validate(JSON.parse(raw)):{version:1,bank:[],records:{},rules:JSON.parse(JSON.stringify(DEFAULT_RULES))};}catch(e){storageError=true;data={version:1,bank:[],records:{},rules:JSON.parse(JSON.stringify(DEFAULT_RULES))};}
// Stable chapter/name IDs keep existing histories when published answers are corrected or terms are added.
const merged=new Map(data.bank.map(t=>[t.id,t]));root.SHIYI_TERMS_BANK.terms.forEach(t=>merged.set(t.id,t));data.bank=[...merged.values()];
function persist(){if(storageError)throw Error('名词记录无法读取，请先导出原始记录再恢复备份，避免覆盖。');localStorage.setItem(KEY,JSON.stringify(data));}
try{persist();}catch(e){storageError=true;}
const $=id=>document.getElementById(id),history=t=>data.records[t.id]||[],latest=t=>history(t).at(-1),labels={red:'红色 · 不会／遗漏较多',yellow:'黄色 · 部分记住／需要巩固',green:'绿色 · 基本掌握／主要要点完整'};
let chapter=1,round=null,shown=false,undo=null;
function saveChange(change){const before=JSON.stringify(data);try{change();persist();return true;}catch(e){data=JSON.parse(before);$('termMessage').textContent='未保存：'+e.message;return false;}}
function stats(id){const items=data.bank.filter(t=>t.chapter===id);return{total:items.length,attempted:items.filter(t=>latest(t)).length};}
function refresh(){
 const items=data.bank.filter(t=>t.chapter===chapter),counts={red:0,yellow:0,green:0};items.forEach(t=>{if(latest(t))counts[latest(t).color]++;});
 $('termChapter').textContent='第'+chapter+'章 · '+root.SHIYI_QUESTION_BANK.chapters.find(c=>c.id===chapter).subtitle;
 $('termStats').textContent=`本章总数 ${items.length} · 未学习 ${items.filter(t=>!latest(t)).length} · 最近红 ${counts.red}／黄 ${counts.yellow}／绿 ${counts.green} · 今日到期 ${items.filter(t=>latest(t)?.due<=day()).length}（含逾期）`;
 $('termDue').textContent='今日到期复习（全部章节 '+dueQueue(data.bank,data.records).length+'）';
 const list=$('termHistory');list.replaceChildren();const groups=new Map();const filtered=items.filter(t=>{const last=latest(t),color=$('termColorFilter').value,status=$('termStatusFilter').value;return(color==='all'||last?.color===color)&&(status==='all'||(status==='unseen'?!last:status==='due'?last?.due<=day():last?.due>day()));});filtered.forEach(t=>{const last=latest(t);const group=last?(last.due<=day()?'今日到期（含逾期）':'待复习 · '+last.due):'未学习';if(!groups.has(group))groups.set(group,[]);groups.get(group).push(t);});[...groups].sort((a,b)=>{const rank=k=>k.startsWith('今日')?0:k==='未学习'?2:1;return rank(a[0])-rank(b[0])||a[0].localeCompare(b[0]);}).forEach(([group,terms])=>{const heading=document.createElement('h3');heading.textContent=group+'（'+terms.length+'）';list.append(heading);terms.forEach(t=>{const row=document.createElement('details'),summary=document.createElement('summary'),last=latest(t);row.dataset.color=last?.color||'unseen';summary.textContent=t.name+' · '+(last?labels[last.color]+' · 下次 '+last.due:'未学习');row.append(summary);
 const meta=document.createElement('p');meta.textContent='复习次数：'+history(t).length+'；来源：教材第'+t.source?.page+'页。最新颜色仅代表最近一次表现。';row.append(meta);const answer=document.createElement('p');answer.className='term-record-answer';answer.textContent='参考答案：'+t.answer;row.append(answer);const retry=document.createElement('button');retry.textContent='复习此名词';retry.onclick=()=>start('single','all',t);row.append(retry);
 const ul=document.createElement('ul');history(t).slice().reverse().forEach(r=>{const li=document.createElement('li');li.textContent=new Date(r.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+'（北京时间） · '+labels[r.color]+' · 第'+r.count+'次 · 下次 '+r.due;ul.append(li);});row.append(ul);list.append(row);});});
 if(!filtered.length)list.textContent=items.length?'当前筛选下暂无名词':'名词解释待录入';
 $('termUndo').disabled=!undo;
}
function render(){
 refresh();if(round)$('termsView').insertBefore($('termMessage'),$('termCard'));else $('termHome').append($('termMessage'));$('termHome').hidden=!!round;$('termCard').hidden=!round;$('termBack').hidden=!round;$('termsView').classList.toggle('term-focus',!!round);document.body.classList.toggle('term-practicing',!!round);shown=false;$('termAnswer').hidden=true;$('termGrades').hidden=true;$('termReveal').hidden=true;$('termSkip').hidden=true;$('termAgain').hidden=true;
 const q=round?.queue[round.index];$('termSource').textContent='';$('termCardChapter').textContent=q?'第'+q.chapter+'章':'';
 $('termProgress').textContent=round?`本轮已评分 ${round.scored} / ${round.queue.length} · 已跳过 ${round.skipped} · 待抽 ${Math.max(0,round.queue.length-round.index)}`:'';
 if(!round){$('termName').textContent='名词解释待录入';return;}
 if(!q){$('termName').textContent=round.queue.length?'本轮完成':'今日暂无到期名词';$('termMessage').textContent=round.skipped?'已跳过的题未完成，未产生评分或改变日期。':'本轮结束，由你决定是否再来一轮。';$('termAgain').hidden=!round.queue.length;return;}
 $('termName').textContent=q.name;$('termAnswer').textContent=q.answer;$('termReveal').hidden=false;$('termSkip').hidden=false;
 $('termSource').textContent='教材第'+q.source?.page+'页 · '+q.source?.file;
}
function start(mode,range='all',only=null){if(root.SHIYI_TERMS.onPractice)root.SHIYI_TERMS.onPractice();const queue=only?[only]:mode==='due'?dueQueue(data.bank,data.records):shuffle(data.bank.filter(t=>mode==='mix'?(range==='all'||(range==='first'?t.chapter<=6:t.chapter>=7)):t.chapter===chapter));round={mode,range,only,queue,index:0,scored:0,skipped:0,token:crypto.randomUUID()};$('termMessage').textContent='';render();if(!queue.length&&mode!=='due')$('termName').textContent='名词解释待录入';}
function open(id){chapter=id;round=null;shown=false;undo=null;$('termSelect').value=String(id);$('termMessage').textContent='';render();}
$('termBack').onclick=()=>{if(root.SHIYI_TERMS.onReturn)return root.SHIYI_TERMS.onReturn();round=null;shown=false;render();};
root.SHIYI_TERMS=Object.assign(root.SHIYI_TERMS,{open,stats,practice:id=>{open(id);start('chapter');},mix:range=>{undo=null;start('mix',range);},startReview:()=>{undo=null;start('due');},reviewSummary:()=>{const studied=data.bank.filter(t=>latest(t));const future=studied.map(t=>latest(t).due).filter(d=>d>day()).sort();return{studied:studied.length,due:studied.filter(t=>latest(t).due<=day()).length,next:future[0]};},exportData:()=>JSON.parse(JSON.stringify(data)),restore:value=>{validate(value);localStorage.setItem(KEY,JSON.stringify(value));},raw:()=>localStorage.getItem(KEY)});
root.SHIYI_QUESTION_BANK.chapters.forEach(c=>{const option=document.createElement('option');option.value=c.id;option.textContent=c.title+' · '+c.subtitle;$('termSelect').append(option);});
['termColorFilter','termStatusFilter'].forEach(id=>$(id).onchange=refresh);
$('termSelect').onchange=()=>open(Number($('termSelect').value));$('termRandom').onclick=()=>start('chapter');$('termDue').onclick=()=>start('due');$('termAgain').onclick=()=>start(round.mode,round.range,round.only);
$('termReveal').onclick=()=>{if(!round?.queue[round.index])return;shown=true;$('termAnswer').hidden=false;$('termGrades').hidden=false;$('termReveal').hidden=true;};
$('termSkip').onclick=()=>{if(!round?.queue[round.index])return;round.skipped++;round.index++;round.token=crypto.randomUUID();render();};
document.querySelectorAll('[data-term-color]').forEach(button=>button.onclick=()=>{
 if(!shown||!round?.queue[round.index])return;const q=round.queue[round.index],token=round.token;const h=history(q);if(h.some(r=>r.id===token))return;
 const at=new Date().toISOString(),color=button.dataset.termColor,r={id:token,chapter:q.chapter,name:q.name,color,at,count:h.length+1,...schedule(h,color,at,data.rules)};
 const before=JSON.parse(JSON.stringify(round));if(!saveChange(()=>{data.records[q.id]=h.concat(r);}))return;
 undo={id:q.id,token,round:before};round.scored++;round.index++;round.token=crypto.randomUUID();$('termMessage').textContent='已保存：'+q.name+' · '+labels[color]+' · 下次 '+r.due;render();
});
$('termUndo').onclick=()=>{if(!undo)return;const saved=undo;if(!saveChange(()=>{const h=data.records[saved.id];if(h?.at(-1)?.id!==saved.token)throw Error('记录已变化，不能撤销');h.pop();if(!h.length)delete data.records[saved.id];}))return;round=saved.round;round.token=crypto.randomUUID();undo=null;render();$('termMessage').textContent='已撤销刚才评分，复习日期与次数已恢复。';};
const fields=['termRedDays','termYellowDays','termGreen1','termGreen2','termGreen3'];const vals=[data.rules.red,data.rules.yellow,...data.rules.green];fields.forEach((id,i)=>$(id).value=vals[i]);
$('termSaveRules').onclick=()=>{const v=fields.map(id=>Number($(id).value));if(!v.every(n=>Number.isInteger(n)&&n>=1&&n<=3650)){$('termMessage').textContent='周期请输入1–3650天的整数';return;}if(saveChange(()=>data.rules={red:v[0],yellow:v[1],green:v.slice(2)}))$('termMessage').textContent='周期已保存，从后续实际评分日起使用；已有到期日期保留。';};
let statsDay=day();
setInterval(()=>{if(statsDay!==day()&&$('termsView').classList.contains('is-visible')){statsDay=day();refresh();}},15000);
if(storageError)$('termMessage').textContent='名词记录无法读取或保存。请先备份原始记录；当前禁止覆盖已有数据。';
})(typeof window==='undefined'?globalThis:window);
