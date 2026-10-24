const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '../dist/app.js'), 'utf8');
const render = app.slice(app.indexOf('  function renderStudyDates()'), app.indexOf('  function changeCalendarMonth('));
class Element {
 constructor() { this.children=[]; this.dataset={}; this.attributes={}; }
 set innerHTML(value) { this.children=[]; }
 setAttribute(key,value) { this.attributes[key]=value; }
 appendChild(child) { this.children.push(child); }
 append(...children) { this.children.push(...children); }
}
const nodes = {};
const state = {dailyStudyMs:{'2026-10-21':59999,'2026-10-22':60000,'2026-10-23':7200000}, dailyAnswers:{}};
const context = vm.createContext({state,calendarMonth:null,todayKey:()=> '2026-10-24',byId:id=>nodes[id]||(nodes[id]=new Element()),document:{createElement:()=>new Element()}});
vm.runInContext(render,context);
const day = key => nodes.calendarGrid.children.find(node=>node.dataset.date===key);
const red = key => day(key).className.includes('is-under-minute');
vm.runInContext('renderStudyDates()',context);
assert(red('2026-10-01'));
assert(red('2026-10-21'));
assert(!red('2026-10-22'));
assert(!red('2026-10-23'));
assert(red('2026-10-24'));
assert(!red('2026-10-25'));
state.dailyStudyMs['2026-10-24']=59999;
vm.runInContext('renderStudyDates()',context);
assert(red('2026-10-24'));
state.dailyStudyMs['2026-10-24']=60000;
vm.runInContext('renderStudyDates()',context);
assert(!red('2026-10-24'));
assert(day('2026-10-24').className.includes('is-today'));
const css=fs.readFileSync(path.join(__dirname,'../dist/styles.css'),'utf8');
assert(css.includes('.calendar-day.is-under-minute { background: #fff0ee;'));
console.log('PASS: 未记录、0秒、59999毫秒标红；60000毫秒及以上恢复正常；未来不标红。');
