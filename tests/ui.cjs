const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
class Element{constructor(){this.value='';this.checked=false;this.children=[];this.style={};this.events={};this.dataset={};this.type='';this.disabled=false;}addEventListener(n,f){(this.events[n]??=[]).push(f)}async fire(n){for(const f of this.events[n]||[])await f({type:n})}replaceChildren(...x){this.children=x}append(...x){this.children.push(...x)}add(x){this.children.push(x)}get options(){return this.children}setAttribute(){} }
const html=read('popup.html'),els={};for(const m of html.matchAll(/<[^>]+id="([^"]+)"[^>]*>/g)){const e=new Element();e.id=m[1];e.type=m[0].match(/type="([^"]+)"/)?.[1]||'';els[e.id]=e;}
const translated=[...html.matchAll(/data-i18n="([^"]+)"/g)].map(m=>{const e=new Element();e.dataset.i18n=m[1];return e});
const defaultsFromTest={enabled:false,locale:'en-US',languages:['en-US','en'],timezone:'UTC'};
let local={},session={},failIP=false,request,stateListener;
const storage={get:async d=>d===null?{...local}:{...d,...local},set:async d=>Object.assign(local,d)};
const ctx=vm.createContext({Intl,Date,Set,console,URL,AbortSignal,crypto:require('node:crypto').webcrypto,globalThis:null,Option:class extends Element{constructor(text,value){super();this.textContent=text;this.value=value}},Event:class{constructor(type){this.type=type}},navigator:{language:'en-US'},localStorage:{getItem:()=>null,setItem:()=>{}},location:{reload:()=>{}},window:{},document:{documentElement:{},getElementById:id=>els[id],createElement:()=>new Element(),querySelectorAll:s=>s==='details'?Object.values(els).filter(e=>e.id.startsWith('section-')):translated},fetch:async(url,args)=>{request={url,args};if(failIP)throw Error('offline');return {ok:true,json:async()=>({success:true,ip:'203.0.113.8',country:'Finland',city:'Helsinki',timezone:{id:'Europe/Helsinki'}})}},chrome:{i18n:{getUILanguage:()=> 'fi-FI'},storage:{onChanged:{addListener:fn=>stateListener=fn},local:storage,session:{get:async k=>({[k]:session[k]}),set:async s=>Object.assign(session,s)}},tabs:{query:async()=>[{id:1,url:'https://example.com'}],reload:async()=>{}},runtime:{sendMessage:async m=>{if(m.type==='check')return {ok:true,settings:{...defaultsFromTest,...local},page:{language:'en-US',languages:['en-US','en'],locale:'en-US',numberLocale:'en-US',timezone:'UTC'}};Object.assign(local,m.settings);return {ok:true}}},action:{setIcon:(d,cb)=>cb()},scripting:{executeScript:async()=>[{result:{language:'en-US',languages:['en-US','en'],locale:'en-US',numberLocale:'en-US',timezone:'UTC'}}]}}});ctx.globalThis=ctx;
for(const e of Object.values(els))e.dispatchEvent=event=>e.fire(event.type);
for(const f of ['i18n.js','zones.js','zone-picker.js','languages.js','language-picker.js','regions.js','profiles.js','tab-action.js','popup.js'])vm.runInContext(read(f),ctx);
const run=s=>vm.runInContext(s,ctx);
(async()=>{
 await ctx.popupReady;
 assert.equal(run('uiLang'),'fi');assert.equal(ctx.document.documentElement.lang,'fi');assert.equal(els.advancedSettings.hidden,true);
 for(const code of ['fi-FI','it-IT','ru-RU','en-US','de-DE','fr-FR','ja-JP','zh-Hans-CN'])assert(run('!!REGION_PROFILES['+JSON.stringify(code)+']'),code);
 els.preset.value='fi-FI';await els.preset.fire('change');assert.equal(els.locale.value,'fi-FI');assert.equal(els.timezone.value,'Europe/Helsinki');assert.equal(els.geoEnabled.checked,true);
 const lat=els.latitude.value;els.simpleLanguage.value='it-IT';await els.simpleLanguage.fire('change');assert.equal(els.locale.value,'it-IT');assert.equal(els.timezone.value,'Europe/Helsinki');assert.equal(els.latitude.value,lat);
 els.mode.value='advanced';await els.mode.fire('change');assert.equal(els.advancedSettings.hidden,false);
 els.profileName.value='Travel';await els.storeProfile.fire('click');assert.equal(Object.keys(local.customProfiles).length,1);
 await run('checkIP()');assert(els.ipResult.textContent.includes('203.0.113.8'));assert.equal(request.url,'https://ipwho.is/');assert.equal(request.args.credentials,'omit');assert(!JSON.stringify(request).includes('example.com'));
 failIP=true;await run('checkIP()');assert(els.ipResult.textContent.includes('offline'));
 await run('checkPage()');assert(els.diagnostics.textContent.includes('5/5'));
 local.enabled=true;session['tab:1']={text:'Применено',error:false};await stateListener({'tab:1':{}},'session');assert.equal(els.stateDot.style.background,'#00e52b');
 session['tab:1']={text:'CDP test failure',error:true};await stateListener({'tab:1':{}},'session');assert.equal(els.stateDot.style.background,'#f52235');assert.equal(els.stateDetail.textContent,'CDP test failure');
 session['tab:1']={text:'Применено',error:false};await stateListener({'tab:1':{}},'session');assert.equal(els.stateDot.style.background,'#00e52b');assert.equal(els.stateDetail.textContent,'');
 delete session['tab:1'];await stateListener({'tab:1':{}},'session');assert.equal(els.stateDot.style.background,'#9298a4');assert.equal(els.stateText.textContent,run("t('pending')"));
 for(const key of translated.map(e=>e.dataset.i18n))for(const l of ['ru','en','de','fi','it'])assert(run(`!!UI_TEXT.${l}[${JSON.stringify(key)}]`),key);
 console.log('PASS: UI initialization, system language, 5 translations, '+run('Object.keys(REGION_PROFILES).length')+' region profiles, simple/advanced, independent language, custom profile, IP response/privacy/offline and tab diagnostics');
})().catch(e=>{console.error(e);process.exitCode=1});
