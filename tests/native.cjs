const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const hooks={},local={},session={},calls=[];let restricted=false,pageProfile=null,pageCalls=0;let attached=false,fail=false,rule,pageMismatch=false,foreign=false,currentURL='https://example.com';const icons=[];
const event=n=>({addListener:f=>hooks[n]=f});
const chrome={storage:{local:{get:async d=>({...d,...local}),set:async s=>Object.assign(local,s)},session:{get:async k=>k===null?{...session}:{[k]:session[k]},set:async s=>Object.assign(session,s),remove:async k=>{for(const x of [k].flat())delete session[x]}}},debugger:{getTargets:async()=>[{tabId:1,attached}],attach:async()=>{attached=true},detach:async()=>{attached=false},sendCommand:async(t,m,p)=>{calls.push([m,p]);if(!attached||foreign)throw Error('Debugger is not attached to the tab');if(restricted&&m==='Emulation.setTimezoneOverride')throw Error('{"code":-32000,"message":"Timezone override is only available to trusted clients"}');if(fail&&m==='Emulation.setLocaleOverride')throw Error('CDP failure');if(m==='Runtime.evaluate'&&p.expression==='1')return {result:{value:1}};if(m==='Runtime.evaluate')return {result:{value:{userAgent:'Original UA',platform:'Win32',userAgentMetadata:{brands:[],platform:'Windows',mobile:false}}}};},onDetach:event('detach')},action:{setIcon:(d,cb)=>{icons.push(d.path[16]);cb()},setBadgeText:(d,cb)=>cb(),setBadgeBackgroundColor:async()=>{}},declarativeNetRequest:{updateDynamicRules:async r=>{rule=r},updateSessionRules:async()=>{}},tabs:{query:async()=>[{id:1,url:currentURL}],get:async id=>({id,url:currentURL}),onCreated:event('created'),onUpdated:event('updated'),onRemoved:event('removed')},scripting:{executeScript:async details=>{if(details.args){pageProfile=details.args[0];pageCalls++;return [{frameId:0,result:pageProfile&&{language:pageProfile.locale,languages:pageProfile.languages,locale:pageProfile.locale,numberLocale:pageProfile.locale,timezone:pageProfile.timezone}}];}return [{result:{language:pageMismatch?'fr-FR':local.locale,languages:local.languages,locale:local.locale,numberLocale:local.locale,timezone:local.timezone}}];}},webNavigation:{onBeforeNavigate:event('nav')},runtime:{onMessage:event('message'),onInstalled:event('installed'),onStartup:event('startup')}};
const ctx=vm.createContext({URL,chrome,console});ctx.importScripts=p=>vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8'),ctx);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../background.js'),'utf8'),ctx);
const request=m=>new Promise(resolve=>hooks.message(m,{},resolve));
const save=settings=>request({type:'save',settings});
(async()=>{
 const base=vm.runInContext('({...DEFAULT,enabled:true})',ctx);
 assert.equal((await save(base)).ok,true);assert(attached);
 assert.equal(calls.find(x=>x[0]==='Emulation.setUserAgentOverride')[1].acceptLanguage,'en-US,en');
 assert.equal(calls.find(x=>x[0]==='Emulation.setUserAgentOverride')[1].userAgent,'Original UA');
 assert.equal(rule.addRules[0].action.requestHeaders[0].value,'en-US,en;q=0.9');
 // A stale stored identity must not prevent reconnection.
 attached=false;assert.equal((await save(base)).ok,true);assert(attached);assert.equal(session['tab:1'].error,false);
 // Failed diagnostics and a later successful check must update the same state/icon.
 pageMismatch=true;assert.equal((await request({type:'check',tabId:1})).ok,true);assert.equal(session['tab:1'].error,true);assert.equal(icons.at(-1),'icons/red-16.png');
 pageMismatch=false;assert.equal((await request({type:'check',tabId:1})).ok,true);assert.equal(session['tab:1'].error,false);assert.equal(icons.at(-1),'icons/green-16.png');
 assert.equal((await save({...base,locale:'ru-RU'})).ok,false);
 assert.equal(local.locale,'en-US');
 assert.equal((await save({...base,languages:['bad\r\nheader']})).ok,false);
 await save({...base,geoEnabled:false});assert(calls.some(x=>x[0]==='Emulation.clearGeolocationOverride'));
 await save({...base,enabled:false});assert(!attached);assert.equal(rule.addRules.length,0);
 fail=true;await save(base);assert(!attached);assert.equal(session['tab:1'].error,true);
 fail=false;attached=true;await save(base);assert(session['tab:1'].text.includes('занята'));
 attached=false;currentURL='chrome://newtab/';await save(base);assert.equal(session['tab:1'].text,'Недоступно');assert.equal(icons.at(-1),'icons/grey-16.png');
 currentURL='https://example.com';await hooks.updated(1,{status:'complete'});assert(attached);assert.equal(session['tab:1'].error,false);assert.equal(icons.at(-1),'icons/green-16.png');
 // A foreign debugger cannot inherit an old green identity record.
 foreign=true;assert.equal((await request({type:'state',tabId:1})).ok,false);assert.equal(session['tab:1'].error,true);assert.equal(icons.at(-1),'icons/red-16.png');assert.equal(session['identity:1'],undefined);assert(attached);
 foreign=false;attached=false;restricted=true;
 const finnish={...base,locale:'fi-FI',languages:['fi-FI','en'],timezone:'Europe/Helsinki'};
 assert.equal((await save(finnish)).ok,true);
 assert.equal(attached,false);
 assert.equal(pageProfile.timezone,'Europe/Helsinki');
 assert.equal(session['tab:1'].pageMode,true);
 assert.equal(icons.at(-1),'icons/green-16.png');
 const priorPageCalls=pageCalls;
 assert.equal((await request({type:'check',tabId:1})).ok,true);
 assert(pageCalls>priorPageCalls);
 assert.equal(session['tab:1'].pageMode,true);
 assert.equal((await request({type:'site-exclusion',tabId:1,hostname:'example.com',excluded:true})).ok,true);
 assert.equal(pageProfile,null);
 assert.equal(session['tab:1'].text,'Исключено');
 assert.equal((await request({type:'site-exclusion',tabId:1,hostname:'example.com',excluded:false})).ok,true);
 assert.equal(pageProfile.locale,'fi-FI');
 assert.equal((await save({...finnish,enabled:false})).ok,true);
 assert.equal(pageProfile,null);
 assert.equal(session['page-profile:1'],undefined);
 console.log('PASS: trusted-client refusal, fallback diagnostics, exclusion, re-enable and cleanup');
 console.log('PASS: stale-session reconnection, diagnostic red-to-green recovery, new-tab navigation, foreign debugger detection; '+
 'native commands, headers, cleanup and validation');
 console.log('PASS: native commands, UA preservation, weighted headers, locale validation, invalid language rejection, geo reset, disable cleanup, CDP error cleanup, debugger conflict');
})().catch(e=>{console.error(e);process.exitCode=1});
