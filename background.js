importScripts('config.js');
importScripts('tab-action.js');
if (chrome.debugger?.attach && chrome.storage.session && chrome.declarativeNetRequest?.updateDynamicRules) {
const RULE=1001;
const intentionalDetach=new Set();
const cmd=(tabId,method,params={})=>chrome.debugger.sendCommand({tabId},method,params);
let queue=Promise.resolve();
const serial=fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;};
const eligible=t=>/^https?:\/\//.test(t.url||t.pendingUrl||'');
async function forgetTab(id){
 intentionalDetach.delete(id);
 await chrome.storage.session.remove(['identity:'+id,'tab:'+id]);
}
async function status(id,text,error=false){
 try{await chrome.tabs.get(id);}catch(e){if(isMissingTab(e)){await forgetTab(id);return;}throw e;}
 await chrome.storage.session.set({['tab:'+id]:{text,error}});
 const state=error?'red':text==='Применено'?'green':'grey';
 try{
  await setTabAction('setBadgeText',{tabId:id,text:''});
  await setTabAction('setIcon',{tabId:id,path:Object.fromEntries([16,20,24,32,48].map(n=>[n,`icons/${state}-${n}.png`]))});
 }catch(e){if(isMissingTab(e)){await forgetTab(id);return;}throw e;}
}
async function syncRules(s){
 await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:[RULE],addRules:s.enabled?[{id:RULE,priority:1,action:{type:'modifyHeaders',requestHeaders:[{header:'accept-language',operation:'set',value:acceptLanguage(s)}]},condition:{urlFilter:'|http'}}]:[]});
}
// Capture the browser's real UA and Client Hints once per attachment; retain across profile changes.
const identityExpression=`(async()=>{const d=navigator.userAgentData;return {userAgent:navigator.userAgent,platform:navigator.platform,userAgentMetadata:d?{...d.toJSON(),...await d.getHighEntropyValues(['architecture','bitness','model','platformVersion','fullVersionList','wow64'])}:undefined};})()`;
async function apply(tab,s){
 if(!eligible(tab)){await status(tab.id,'Недоступно');return;}
 const id=tab.id, key='identity:'+id;
 try{
  const targets=await chrome.debugger.getTargets();
  const ours=(await chrome.storage.session.get(key))[key];
  if(!ours){
   if(targets.some(t=>t.tabId===id&&t.attached))throw Error('Вкладка занята DevTools или другим расширением');
   await chrome.debugger.attach({tabId:id},'1.3');
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
  const owns=(await chrome.storage.session.get(key))[key];
  if(owns){intentionalDetach.add(id);await chrome.debugger.detach({tabId:id}).catch(()=>{});}
  await chrome.storage.session.remove(key);
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
async function sync(){
 const s=validate(await chrome.storage.local.get(DEFAULT));
 await syncRules(s);
 if(!s.enabled){await detachAll();for(const tab of await chrome.tabs.query({}))await status(tab.id,'Выключено');return;}
 for(const tab of await chrome.tabs.query({}))await apply(tab,s);
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m?.type!=='save')return;
 serial(async()=>{
  const s=validate(m.settings);
  await chrome.storage.local.set(s);
  await sync();
  return {ok:true};
 }).then(reply,e=>reply({ok:false,error:e.message}));
 return true;
});
chrome.runtime.onInstalled.addListener(()=>serial(sync).catch(console.error));
chrome.runtime.onStartup.addListener(()=>serial(sync).catch(console.error));
function applyTab(id){return serial(async()=>{
 const s=validate(await chrome.storage.local.get(DEFAULT));
 if(s.enabled)await apply(await chrome.tabs.get(id),s);
}).catch(e=>{if(!isMissingTab(e))console.error(e);});}
chrome.tabs.onCreated.addListener(t=>applyTab(t.id));
chrome.webNavigation.onBeforeNavigate.addListener(d=>{if(d.frameId===0)applyTab(d.tabId);});
chrome.debugger.onDetach.addListener((source,reason)=>{
 if(!source.tabId)return;
 if(intentionalDetach.delete(source.tabId))return;
 chrome.storage.session.remove('identity:'+source.tabId);
 status(source.tabId,'Отладчик отключён: '+reason,true).catch(()=>{});
});
chrome.tabs.onRemoved.addListener(id=>serial(()=>forgetTab(id)).catch(console.error));

} else {
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m?.type==='save')reply({ok:false,error:'Браузер не предоставляет необходимые API: Debugger, storage.session, declarativeNetRequest. Нужен современный браузер Chromium.'});
 });
}
