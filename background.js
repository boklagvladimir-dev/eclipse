importScripts('config.js');
importScripts('tab-action.js');
importScripts('page-profile.js');
if (chrome.debugger?.attach && chrome.storage.session && chrome.declarativeNetRequest?.updateDynamicRules && chrome.declarativeNetRequest?.updateSessionRules) {
const RULE=1001,DOMAIN_ALLOW=1002,TAB_ALLOW=1003;
const intentionalDetach=new Set();
let nativeRegionRestricted=false;
const cmd=(tabId,method,params={})=>chrome.debugger.sendCommand({tabId},method,params);
let queue=Promise.resolve();
const serial=fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;};
const eligible=t=>/^https?:\/\//.test(t.url||t.pendingUrl||'');
async function forgetTab(id){
 intentionalDetach.delete(id);
 await chrome.storage.session.remove(['identity:'+id,'tab:'+id,'page-profile:'+id]);
}
async function status(id,text,error=false,pageMode=false){
 try{await chrome.tabs.get(id);}catch(e){if(isMissingTab(e)){await forgetTab(id);return;}throw e;}
 const record={text,error,...(pageMode?{pageMode:true}:{})};
 const state=tabStateView(record,text!=='Выключено','https://state.invalid').color;
 try{
  await setTabAction('setBadgeText',{tabId:id,text:''});
  await setTabAction('setIcon',{tabId:id,path:Object.fromEntries([16,20,24,32,48].map(n=>[n,`icons/${state}-${n}.png`]))});
 }catch(e){if(isMissingTab(e)){await forgetTab(id);return;}throw e;}
 await chrome.storage.session.set({['tab:'+id]:record});
 try{await chrome.tabs.get(id);}catch(e){if(isMissingTab(e))await forgetTab(id);else throw e;}
}
async function syncRules(s,navigatingTab){
 const rules=s.enabled?[{id:RULE,priority:1,action:{type:'modifyHeaders',requestHeaders:[{header:'accept-language',operation:'set',value:acceptLanguage(s)}]},condition:{urlFilter:'|http'}}]:[];
 const sites=s.excludedSites||[];
 if(s.enabled&&sites.length)rules.push({id:DOMAIN_ALLOW,priority:10,action:{type:'allowAllRequests'},condition:{requestDomains:sites,resourceTypes:['main_frame']}});
 // Per-tab allow rules also cover already-loaded pages and their third-party frames/resources.
 const tabs=sites.length?await chrome.tabs.query({}):[];
 const ids=tabs.filter(tab=>isExcludedSite(tab.id===navigatingTab?.id?navigatingTab.url:tab.url,sites)).map(tab=>tab.id);
 await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:[RULE,DOMAIN_ALLOW],addRules:rules});
 await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[TAB_ALLOW],addRules:s.enabled&&ids.length?[{id:TAB_ALLOW,priority:20,action:{type:'allow'},condition:{tabIds:ids,urlFilter:'|http'}}]:[]});
}
async function runPageProfile(id,profile){
 const details={world:'MAIN',injectImmediately:true,func:applyPageProfile,args:[profile]};
 let results;
 try{results=await chrome.scripting.executeScript({...details,target:{tabId:id,allFrames:true}});}
 catch(e){
  if(isMissingTab(e))throw e;
  // A protected child frame can prevent injection into the entire frame tree.
  results=await chrome.scripting.executeScript({...details,target:{tabId:id}});
 }
 return results.find(frame=>frame.frameId===0)?.result;
}
async function clearPageProfile(id){
 const key='page-profile:'+id;
 if(!(await chrome.storage.session.get(key))[key])return;
 try{if(eligible(await chrome.tabs.get(id)))await runPageProfile(id,null);}
 catch(e){if(!isMissingTab(e))throw e;}
 await chrome.storage.session.remove(key);
}
async function usePageProfile(id,s){
 // Store this first so a partial application can still be cleared.
 await chrome.storage.session.set({['page-profile:'+id]:true});
 const profile={locale:s.locale,languages:s.languages,timezone:s.timezone,
  geoEnabled:s.geoEnabled,latitude:s.latitude,longitude:s.longitude};
 const page=await runPageProfile(id,profile);
 if(!page||comparisonRows(page,s).some(([,actual,expected])=>actual!==expected)){
  throw Error('Не удалось подтвердить подмену языка и часового пояса на странице');
 }
 await status(id,'Применено',false,true);
}
async function detachTab(id,text){
 await clearPageProfile(id);
 const key='identity:'+id;
 if((await chrome.storage.session.get(key))[key]){
  intentionalDetach.add(id);
  try{await chrome.debugger.detach({tabId:id});}
  catch(e){intentionalDetach.delete(id);if(!isMissingTab(e)&&!/not attached|not connected/i.test(e.message))throw e;}
  await chrome.storage.session.remove(key);
 }
 await status(id,text);
}
// Capture the browser's real UA and Client Hints once per attachment; retain across profile changes.
const identityExpression=`(async()=>{const d=navigator.userAgentData;return {userAgent:navigator.userAgent,platform:navigator.platform,userAgentMetadata:d?{...d.toJSON(),...await d.getHighEntropyValues(['architecture','bitness','model','platformVersion','fullVersionList','wow64'])}:undefined};})()`;
async function apply(tab,s){
 if(!eligible(tab)){await status(tab.id,'Недоступно');return;}
 if(isExcludedSite(tab.url||tab.pendingUrl,s.excludedSites)){await detachTab(tab.id,'Исключено');return;}
 const id=tab.id, key='identity:'+id;
 let owned=false;
 try{
  if(nativeRegionRestricted){await usePageProfile(id,s);return;}
  const targets=await chrome.debugger.getTargets();
  let ours=(await chrome.storage.session.get(key))[key];
  const attached=targets.some(t=>t.tabId===id&&t.attached);
  if(ours&&!attached){await chrome.storage.session.remove(key);ours=null;}
  if(ours){
   try{await cmd(id,'Runtime.evaluate',{expression:'1',returnByValue:true});owned=true;}
   catch(e){await chrome.storage.session.remove(key);throw Error('Вкладка занята DevTools или другим расширением: '+e.message);}
  }
  if(!ours){
   if(attached)throw Error('Вкладка занята DevTools или другим расширением');
   await chrome.debugger.attach({tabId:id},'1.3');
   owned=true;
   await chrome.storage.session.set({[key]:{attaching:true}});
   const r=await cmd(id,'Runtime.evaluate',{expression:identityExpression,awaitPromise:true,returnByValue:true});
   if(!r.result?.value?.userAgent)throw Error('Не удалось прочитать параметры браузера');
   await chrome.storage.session.set({[key]:r.result.value});
  }
  const identity=(await chrome.storage.session.get(key))[key];
  await cmd(id,'Emulation.setTimezoneOverride',{timezoneId:s.timezone});
  await cmd(id,'Emulation.setLocaleOverride',{locale:s.locale});
  await cmd(id,'Emulation.setUserAgentOverride',{...identity,acceptLanguage:s.languages.join(',')});
  if(s.geoEnabled)await cmd(id,'Emulation.setGeolocationOverride',{latitude:s.latitude,longitude:s.longitude,accuracy:30});
  else await cmd(id,'Emulation.clearGeolocationOverride');
  await status(id,'Применено');
 }catch(e){
  // Do not leave a partially configured debugger session running.
  if(owned){intentionalDetach.add(id);await chrome.debugger.detach({tabId:id}).catch(()=>intentionalDetach.delete(id));}
  await chrome.storage.session.remove(key);
  if(/(?:Timezone|Locale) override is only available to trusted clients/.test(e.message)){
   nativeRegionRestricted=true;
   try{await usePageProfile(id,s);return;}
   catch(pageError){await status(id,pageError.message,true);return;}
  }
  await status(id,e.message,true);
 }
}
async function detachAll(){
 const data=await chrome.storage.session.get(null);
 for(const key of Object.keys(data).filter(k=>k.startsWith('identity:'))){
  const id=Number(key.slice(9));
  intentionalDetach.add(id);
  await chrome.debugger.detach({tabId:id}).catch(()=>{});
  await chrome.storage.session.remove(key);
  await status(id,'Выключено');
 }
}
async function sync(preferredTabId){
 const s=validate(await chrome.storage.local.get(DEFAULT));
 await syncRules(s);
 if(!s.enabled){await detachAll();for(const tab of await chrome.tabs.query({}))await detachTab(tab.id,'Выключено');return;}
 const tabs=await chrome.tabs.query({});
 tabs.sort((a,b)=>Number(b.id===preferredTabId)-Number(a.id===preferredTabId));
 for(const tab of tabs)await apply(tab,s);
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(!['save','state','check','site-exclusion'].includes(m?.type))return;
 serial(async()=>{
  try{
  if(m.type==='site-exclusion'){
   const tab=await chrome.tabs.get(m.tabId),hostname=siteHostname(tab.url);
   if(!hostname||hostname!==m.hostname||typeof m.excluded!=='boolean')throw Error('The current site has changed. Reopen Eclipse.');
   const s=validate(await chrome.storage.local.get(DEFAULT));
   // Removing a parent-domain exception also restores this subdomain.
   const sites=m.excluded?[...s.excludedSites,hostname]:s.excludedSites.filter(site=>hostname!==site&&!hostname.endsWith('.'+site));
   await chrome.storage.local.set({excludedSites:normalizeExcludedSites(sites)});
   try{await sync(tab.id);}catch(e){await status(tab.id,e.message,true).catch(console.error);throw e;}
   return {ok:true};
  }
  if(m.type!=='save'){
   const tab=await chrome.tabs.get(m.tabId),s=validate(await chrome.storage.local.get(DEFAULT));
   const key='tab:'+tab.id,identity=(await chrome.storage.session.get('identity:'+tab.id))['identity:'+tab.id];
   const before=(await chrome.storage.session.get(key))[key];
   const targets=s.enabled&&eligible(tab)?await chrome.debugger.getTargets():[];
   const pageMode=(await chrome.storage.session.get('page-profile:'+tab.id))['page-profile:'+tab.id];
   if(!s.enabled)await detachTab(tab.id,'Выключено');
   else if(!eligible(tab))await status(tab.id,'Недоступно');
   else if(isExcludedSite(tab.url,s.excludedSites))await detachTab(tab.id,'Исключено');
   else if(pageMode){nativeRegionRestricted=true;await apply(tab,s);}
   else if(!before||!identity||!targets.some(t=>t.tabId===tab.id&&t.attached))await apply(tab,s);
   else{
    // An attached target may belong to another debugger after a stale session.
    try{await cmd(tab.id,'Runtime.evaluate',{expression:'1',returnByValue:true});}
    catch(e){await chrome.storage.session.remove('identity:'+tab.id);throw e;}
   }
   // The background owns both toolbar and popup status, including diagnostics.
   if(m.type==='check'&&isExcludedSite(tab.url,s.excludedSites))return {ok:true,excluded:true,settings:s};
   if(m.type==='check'&&eligible(tab)){
    const results=await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:()=>({language:navigator.language,languages:[...navigator.languages],locale:new Intl.DateTimeFormat().resolvedOptions().locale,numberLocale:new Intl.NumberFormat().resolvedOptions().locale,timezone:new Intl.DateTimeFormat().resolvedOptions().timeZone})});
    const page=results[0]?.result;if(!page)throw Error('Нет результата проверки вкладки');
    const rows=comparisonRows(page,s),passes=rows.filter(r=>r[1]===r[2]).length;
    const active=(await chrome.storage.session.get('identity:'+tab.id))['identity:'+tab.id];
    const fallback=(await chrome.storage.session.get('page-profile:'+tab.id))['page-profile:'+tab.id];
    if(s.enabled&&(active||fallback)){
     if(active)await cmd(tab.id,'Runtime.evaluate',{expression:'1',returnByValue:true});
     await status(tab.id,passes===rows.length?'Применено':'Проверка: '+passes+'/'+rows.length,passes!==rows.length,Boolean(fallback));
    }
    return {ok:true,page,settings:s};
   }
   return {ok:true,state:(await chrome.storage.session.get(key))[key]};
  }
  const stored=await chrome.storage.local.get(DEFAULT);
  const s=validate({...m.settings,excludedSites:stored.excludedSites});
  await chrome.storage.local.set(s);
  await sync(m.tabId);
  return {ok:true};
  }catch(e){
   if(['state','check'].includes(m.type)&&Number.isInteger(m.tabId))await status(m.tabId,e.message,true).catch(console.error);
   throw e;
  }
 }).then(reply,e=>reply({ok:false,error:e.message}));
 return true;
});
chrome.runtime.onInstalled.addListener(()=>serial(sync).catch(console.error));
chrome.runtime.onStartup.addListener(()=>serial(sync).catch(console.error));
function applyTab(id,url){return serial(async()=>{
 const s=validate(await chrome.storage.local.get(DEFAULT));
 if(s.enabled){
  const tab=await chrome.tabs.get(id);if(url)tab.url=url;
  if(s.excludedSites.length)await syncRules(s,tab);
  await apply(tab,s);
 }
}).catch(e=>{if(!isMissingTab(e))console.error(e);});}
chrome.tabs.onCreated.addListener(t=>applyTab(t.id,t.url||t.pendingUrl));
chrome.tabs.onUpdated.addListener((id,change)=>{if(change.url||change.status==='complete')return applyTab(id,change.url);});
chrome.webNavigation.onBeforeNavigate.addListener(d=>{if(d.frameId===0)return applyTab(d.tabId,d.url);});
chrome.webNavigation.onCommitted?.addListener(d=>{
 if(nativeRegionRestricted)return applyTab(d.tabId,d.frameId===0?d.url:undefined);
});
chrome.debugger.onDetach.addListener((source,reason)=>{
 if(!source.tabId)return;
 if(intentionalDetach.delete(source.tabId))return;
 serial(async()=>{
  await chrome.storage.session.remove('identity:'+source.tabId);
  await status(source.tabId,'Отладчик отключён: '+reason,true);
 }).catch(console.error);
});
chrome.tabs.onRemoved.addListener(id=>serial(async()=>{await forgetTab(id);const s=validate(await chrome.storage.local.get(DEFAULT));if(s.excludedSites.length)await syncRules(s);}).catch(console.error));

} else {
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m?.type==='save')reply({ok:false,error:'Браузер не предоставляет необходимые API: Debugger, storage.session, declarativeNetRequest. Нужен современный браузер Chromium.'});
 });
}
