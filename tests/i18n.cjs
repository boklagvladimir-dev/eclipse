const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','i18n.js'),'utf8');
function load(system,choice='auto'){
 const ctx=vm.createContext({localStorage:{getItem:()=>choice},chrome:{i18n:{getUILanguage:()=>system}},navigator:{language:system},document:{documentElement:{},querySelectorAll:()=>[]}});
 vm.runInContext(source+';this.texts=UI_TEXT;this.lang=uiLang;localizeUI();',ctx);return ctx;
}
const base=load('en-US');assert.equal(Object.keys(base.texts).length,12);
for(const [lang,dict] of Object.entries(base.texts))for(const key of Object.keys(base.texts.en))assert.equal(typeof dict[key],'string',lang+':'+key);
for(const [system,expected] of [['pt-BR','pt-BR'],['pt-PT','pt-BR'],['zh-CN','zh-CN'],['zh-Hans-CN','zh-CN'],['zh-SG','zh-CN'],['zh-TW','en'],['fr-CA','fr'],['es-MX','es'],['ja-JP','ja'],['ar-SA','ar'],['fa-IR','fa'],['xx-XX','en']])assert.equal(load(system).lang,expected,system);
for(const lang of Object.keys(base.texts)){
 const c=load('en-US',lang);assert.equal(c.lang,lang);assert.equal(c.document.documentElement.dir,['ar','fa'].includes(lang)?'rtl':'ltr');
}
console.log('PASS: 12 complete UI dictionaries, explicit language selection, regional language detection, Chinese script fallback and Arabic/Persian RTL');
