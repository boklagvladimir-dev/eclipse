const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class El{constructor(){this.value='';this.children=[];this.style={};this.events={};}addEventListener(n,f){this.events[n]=f}replaceChildren(){this.children=[]}append(x){this.children.push(x)}dispatchEvent(e){this.events[e.type]?.(e)}}
const els=Object.fromEntries(['zonePreview','timezone','zoneCount','zoneResults','zoneSearch','preset'].map(k=>[k,new El()]));els.timezone.value='Europe/Berlin';
const ctx=vm.createContext({Intl,Date,Set,console,window:{},Event:class {constructor(t){this.type=t}},document:{getElementById:id=>els[id],createElement:()=>new El()}});
for(const f of ['zones.js','zone-picker.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8'),ctx);
function evalx(x){return vm.runInContext(x,ctx)}
assert(evalx('zoneItems.length')>400);
for(const [q,z] of [['Москва','Europe/Moscow'],['Berlin','Europe/Berlin'],['UTC+3','Europe/Moscow'],['UTC+05:30','Asia/Kolkata'],['Пушкин','Europe/Moscow']]){
 const actual=evalx('filterZones('+JSON.stringify(q)+').map(x=>x.zone)');
 assert(actual.includes(z)||z==='Asia/Kolkata'&&actual.includes('Asia/Calcutta'),q);
}
assert.equal(evalx("filterZones('xyz-no-such-zone').length"),0);
assert.equal(evalx("zoneInfo('Europe/Berlin',new Date('2026-01-15')).offset"),'UTC+01:00');
assert.equal(evalx("zoneInfo('Europe/Berlin',new Date('2026-07-15')).offset"),'UTC+02:00');
els.zoneSearch.value='Berlin';els.zoneSearch.events.input();assert.equal(els.zoneResults.children.length,1);els.zoneResults.children[0].events.click();assert.equal(els.timezone.value,'Europe/Berlin');
els.timezone.value='Invalid/Zone';ctx.window.updateZonePreview();assert(els.zonePreview.textContent.includes('Введите'));
console.log('PASS: '+evalx('zoneItems.length')+' accepted zones; Russian/English/UTC search, half-hour offsets, DST, selection, invalid identifier preview');
