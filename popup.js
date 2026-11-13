const el=id=>document.getElementById(id);
const fieldIds=['timezone','locale','languages','geoEnabled','latitude','longitude'];
let currentTab,customProfiles={},lastIP,enabled=false,applying=false,excluding=false;
const defaults={enabled:false,preset:'custom',timezone:'UTC',locale:'en-US',languages:['en-US','en'],latitude:0,longitude:0,geoEnabled:false,excludedSites:[]};
function readSettings(){return {enabled,preset:el('preset').value,timezone:el('timezone').value.trim(),locale:el('locale').value.trim(),languages:readLanguageList(),geoEnabled:el('geoEnabled').checked,latitude:Number(el('latitude').value),longitude:Number(el('longitude').value)};}
function render(s){if('enabled' in s)enabled=!!s.enabled;for(const id of fieldIds){if(!(id in s))continue;const e=el(id);if(e.type==='checkbox')e.checked=s[id];else e.value=Array.isArray(s[id])?s[id].join(', '):s[id];}if(s.preset)el('preset').value=s.preset;el('simpleLanguage').value=el('locale').value;window.updateZonePreview();window.updateLanguagePreview();summary();}
function summary(){el('profileSummary').textContent=`${el('locale').value} · ${el('timezone').value}${el('geoEnabled').checked?` · ${el('latitude').value}, ${el('longitude').value}`:''}`;}
function dirty(){el('status').textContent=t('unsaved');summary();}
function profileOptions(selected){
 const p=el('preset');p.replaceChildren(new Option(t('custom'),'custom'));
 for(const [id,s] of Object.entries(REGION_PROFILES)){const name=new Intl.DisplayNames([uiLang],{type:'language'}).of(s.locale);p.add(new Option(`${name} · ${s.timezone.split('/').pop().replaceAll('_',' ')}`,id));}
 for(const [id,s] of Object.entries(customProfiles))p.add(new Option('★ '+s.name,id));
 p.value=[...p.options].some(x=>x.value===selected)?selected:'custom';
}
function syncBasicLanguage(){el('simpleLanguage').value=el('locale').value;summary();}
let stateRender=0;
async function showState(){
 const renderId=++stateRender;
 [currentTab]=await chrome.tabs.query({active:true,currentWindow:true});
 if(!currentTab?.id)return;
 const id=currentTab.id,s=await chrome.storage.local.get(defaults),state=(await chrome.storage.session.get('tab:'+id))['tab:'+id];
 if(renderId!==stateRender)return;
 if(!applying)enabled=!!s.enabled;
 const view=applying?{color:'grey',label:'pending'}:tabStateView(state,s.enabled,currentTab.url);
 renderPower(view);
 const hostname=siteHostname(currentTab.url);
 el('excludeSite').disabled=!hostname||applying||excluding;
 if(!excluding)el('excludeSite').checked=isExcludedSite(currentTab.url,s.excludedSites);
 el('excludedHostname').textContent=hostname;


 el('stateDot').style.background=STATE_COLORS[view.color];
 el('stateDot').dataset.color=view.color;
 el('stateText').textContent=t(view.label);
 el('stateText').title=state?.error?state.text:'';
 el('stateDetail').textContent=state?.error?state.text:state?.pageMode?t('pageMode'):'';
}
function renderPower(view){
 const button=el('enabled');
 button.setAttribute('aria-pressed',String(enabled));
 button.setAttribute('aria-busy',String(applying));
 button.dataset.state=view.color;
 el('powerLabel').textContent=t(applying?'pending':enabled?'disableAction':'enableAction');
 button.disabled=applying||excluding;
}
async function saveSettings(){
 const settings=readSettings();
 applying=true;el('save').disabled=true;el('enabled').disabled=true;
 el('status').textContent=t('pending');
 try{
  await showState();
  const r=await chrome.runtime.sendMessage({type:'save',tabId:currentTab?.id,settings});
  if(!r?.ok)throw Error(r?.error||t('failed'));
  el('status').textContent=t('saved');
 }catch(e){el('status').textContent=e.message;}
 finally{applying=false;el('save').disabled=false;await showState();}
}
el('enabled').addEventListener('click',async()=>{
 if(applying)return;
 enabled=!enabled;
 await saveSettings();
});
chrome.storage.onChanged?.addListener((changes,area)=>{
 if((area==='session'&&changes['tab:'+currentTab?.id])||(area==='local'&&(changes.enabled||changes.excludedSites)))return showState().catch(e=>el('status').textContent=e.message);
});
el('excludeSite').addEventListener('change',async()=>{
 if(applying||excluding)return;
 const tab=currentTab,hostname=siteHostname(tab?.url),excluded=el('excludeSite').checked;
 if(!hostname)return;
 excluding=true;el('excludeSite').disabled=true;el('enabled').disabled=true;el('save').disabled=true;
 el('status').textContent=t('pending');
 try{
  const r=await chrome.runtime.sendMessage({type:'site-exclusion',tabId:tab.id,hostname,excluded});
  if(!r?.ok)throw Error(r?.error||t('failed'));
  el('status').textContent='';
 }catch(e){el('status').textContent=e.message;}
 finally{excluding=false;el('save').disabled=false;await showState();}
});
el('uiLanguage').value=uiChoice;el('uiLanguage').addEventListener('change',()=>{localStorage.setItem('uiLanguage',el('uiLanguage').value);location.reload();});
el('mode').value=localStorage.getItem('mode')||'simple';
function mode(){el('advancedSettings').hidden=el('mode').value!=='advanced';localStorage.setItem('mode',el('mode').value);}
el('mode').addEventListener('change',mode);mode();
for(const section of document.querySelectorAll('details')){section.open=localStorage.getItem(section.id)==='open';section.addEventListener('toggle',()=>localStorage.setItem(section.id,section.open?'open':'closed'));}
for(const item of languageItems)el('simpleLanguage').add(new Option(`${new Intl.DisplayNames([uiLang],{type:'language'}).of(item.code)} · ${item.code}`,item.code));
el('simpleLanguage').addEventListener('change',()=>{chooseLanguage(el('simpleLanguage').value);dirty();});
el('preset').addEventListener('change',()=>{const id=el('preset').value,s=REGION_PROFILES[id]||customProfiles[id];if(s)render({...s,preset:id,geoEnabled:s.geoEnabled??true});dirty();});
for(const id of fieldIds)el(id).addEventListener('input',()=>{if(id!=='enabled'){el('preset').value='custom';syncBasicLanguage();}dirty();});
// Picker buttons change the locale without changing region fields.
for(const id of ['languageResults','quickLanguages','languageOrder','zoneResults'])el(id).addEventListener('click',()=>{syncBasicLanguage();dirty();});
el('save').addEventListener('click',saveSettings);
el('reload').addEventListener('click',async()=>{try{if(currentTab?.id)await chrome.tabs.reload(currentTab.id);}catch(e){el('status').textContent=isMissingTab(e)?t('unsupported'):e.message;}});
el('storeProfile').addEventListener('click',async()=>{try{const name=el('profileName').value.trim();if(!name)throw Error(t('nameRequired'));const settings=readSettings();const id='user:'+crypto.randomUUID();customProfiles[id]={...settings,name};await chrome.storage.local.set({customProfiles});profileOptions(id);el('status').textContent=t('profileSaved');}catch(e){el('status').textContent=e.message;}});
el('deleteProfile').addEventListener('click',async()=>{const id=el('preset').value;if(!id.startsWith('user:'))return;delete customProfiles[id];await chrome.storage.local.set({customProfiles});profileOptions('custom');});
let ipRequest=null;
function checkIP(){
 if(ipRequest)return ipRequest;
 el('ipCountry').hidden=true;el('ipFlag').hidden=true;el('ipCountryName').textContent='';
 const out=el('ipResult');out.textContent='IP · '+t('checking');out.dataset.state='pending';el('detectIP').disabled=true;
 ipRequest=(async()=>{
  try{
   const response=await fetch('https://ipwho.is/',{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const d=await response.json();if(d.success!==true||typeof d.ip!=='string')throw Error(d.message||'Invalid IP response');
   lastIP=d;
   const code=String(d.country_code||'').toLowerCase();
   let country=typeof d.country==='string'?d.country:'';
   if(/^[a-z]{2}$/.test(code)&&code!=='xx')try{const localized=new Intl.DisplayNames([uiLang],{type:'region'}).of(code.toUpperCase());if(localized&&localized!==code.toUpperCase())country=localized;}catch{}
   el('ipCountryName').textContent=country||t('ipCountryUnknown');el('ipCountry').hidden=false;
   if(code!=='xx'&&Object.prototype.hasOwnProperty.call(COUNTRY_FLAG_INDEX,code)){
    el('ipFlag').style.backgroundPosition='0 -'+(COUNTRY_FLAG_INDEX[code]*30)+'px';el('ipFlag').hidden=false;
   }
   out.dataset.state='success';out.textContent=`IP: ${d.ip}\n${t('ipLocation')}: ${d.city||country||t('ipCountryUnknown')}\n${d.timezone?.id||''}`;
  }catch(e){lastIP=undefined;out.dataset.state='error';out.textContent=t('ipFailed')+' · '+e.message;}
  finally{el('detectIP').disabled=false;ipRequest=null;}
 })();
 return ipRequest;
}
el('detectIP').addEventListener('click',checkIP);
async function checkPage(){
 const panel=el('diagnostics');panel.textContent=t('checking');
 try{
  [currentTab]=await chrome.tabs.query({active:true,currentWindow:true});if(!/^https?:\/\//.test(currentTab?.url||''))throw Error(t('unsupported'));
  const result=await chrome.runtime.sendMessage({type:'check',tabId:currentTab.id});
  if(!result?.ok)throw Error(result?.error||t('failed'));
  if(result.excluded){panel.textContent=t('excluded');await showState();return;}
  const p=result.settings,rows=comparisonRows(result.page,p);
  const passes=rows.filter(x=>x[1]===x[2]).length;
  panel.textContent=`${p.enabled?'':t('off')+'\n'}${passes}/${rows.length}\n`+rows.map(([name,actual,expected])=>`${actual===expected?'✓':'✕'} ${name}: ${actual}${actual===expected?'':` → ${expected}`}`).join('\n')+'\n\n'+t('checkNote');await showState();
 }catch(e){panel.textContent=e.message;}
}
el('diagnose').addEventListener('click',async()=>{el('diagnose').disabled=true;await Promise.allSettled([checkIP(),checkPage()]);el('diagnose').disabled=false;});
globalThis.popupReady=(async()=>{localizeUI();const s=await chrome.storage.local.get({...defaults,customProfiles:{}});customProfiles=s.customProfiles||{};const legacy={fi:'fi-FI','fi-ru':'custom',de:'de-DE',it:'it-IT',ru:'ru-RU'};s.preset=legacy[s.preset]||s.preset;profileOptions(s.preset);render(s);[currentTab]=await chrome.tabs.query({active:true,currentWindow:true});if(currentTab?.id){const r=await chrome.runtime.sendMessage({type:'state',tabId:currentTab.id});if(!r?.ok)el('status').textContent=r?.error||t('failed');}await showState();})().catch(e=>el('status').textContent=e.message);
