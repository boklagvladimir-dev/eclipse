const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
class El{constructor(){this.value='';this.checked=false;this.children=[];this.style={};this.events={};}addEventListener(n,f){this.events[n]=f}replaceChildren(){this.children=[]}append(...x){this.children.push(...x)}setAttribute(){} }
const ids=['locale','languages','preset','languageSearch','languageCount','languageResults','quickLanguages','englishFallback','languageOrder','languagePreview','timezone','latitude'];const els=Object.fromEntries(ids.map(k=>[k,new El()]));els.englishFallback.checked=true;els.timezone.value='Europe/Berlin';els.latitude.value='52.52';
const ctx=vm.createContext({Intl,Date,Set,console,window:{},document:{getElementById:id=>els[id],createElement:()=>new El()}});
for(const f of ['languages.js','language-picker.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
const run=x=>vm.runInContext(x,ctx);
for(const [q,code] of [['финский','fi-FI'],['Italian','it-IT'],['italiano','it-IT'],['итальянский швейцария','it-CH'],['de-CH','de-CH']])assert(run('filterLanguages('+JSON.stringify(q)+').some(i=>i.code==='+JSON.stringify(code)+')'),q);
run("chooseLanguage('fi-FI')");assert.equal(els.locale.value,'fi-FI');assert.equal(els.languages.value,'fi-FI, fi, en-US, en');assert.equal(els.timezone.value,'Europe/Berlin');assert.equal(els.latitude.value,'52.52');
run("chooseLanguage('it-IT')");assert.equal(els.languages.value,'it-IT, it, en-US, en');
els.englishFallback.checked=false;run("chooseLanguage('it-CH')");assert.equal(els.languages.value,'it-CH, it');
run("addLanguage('fi-FI')");run("addLanguage('fi-FI')");assert.equal(els.languages.value,'it-CH, it, fi-FI');
els.languageOrder.children[1].children[1].events.click();assert.equal(els.locale.value,'it');assert.equal(els.languages.value,'it, it-CH, fi-FI');
els.languageOrder.children[2].children[3].events.click();assert.equal(els.languages.value,'it, it-CH');
run("chooseLanguage('zh-Hant-TW')");assert.equal(els.languages.value,'zh-Hant-TW, zh-Hant, zh');
els.locale.value='zz-ZZ';els.languages.value='zz-ZZ';ctx.window.updateLanguagePreview();assert(els.languagePreview.textContent.includes('не поддерживается'));
assert(els.quickLanguages.children[0].textContent.includes('финский'));assert(els.quickLanguages.children[1].textContent.includes('итальянский'));
console.log('PASS: '+run('languageItems.length')+' supported locale variants; Finnish/Italian quick selection; RU/EN/native search; ordering; deduplication; fallback; unchanged timezone/coordinates; unsupported locale warning');
