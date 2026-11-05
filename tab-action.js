// Site exceptions apply to the selected hostname and its subdomains.
function siteHostname(url){
 try{const u=new URL(url);return /^https?:$/.test(u.protocol)?u.hostname.toLowerCase():'';}catch{return '';}
}
function isExcludedSite(url,sites=[]){
 const host=siteHostname(url);return !!host&&sites.some(site=>host===site||host.endsWith('.'+site));
}
function normalizeExcludedSites(sites){
 if(!Array.isArray(sites)||sites.length>500)throw Error('Invalid site exception list');
 return [...new Set(sites.map(site=>{
  if(typeof site!=='string'||!site||/[\s/?#@]/.test(site))throw Error('Invalid site exception');
  const host=siteHostname('https://'+site);
  if(!host||host!==site.toLowerCase())throw Error('Invalid site exception');
  return host;
 }))];
}
// Read callback errors while Chrome still exposes runtime.lastError.
function setTabAction(method, details) {
 return new Promise((resolve,reject)=>{
  chrome.action[method](details,()=>{
   const error=chrome.runtime.lastError;
   if(error)reject(new Error(error.message));
   else resolve();
  });
 });
}
function isMissingTab(error) {
 return /No tab with (?:id|given id)|Invalid tab ID/i.test(error?.message||'');
}
const STATE_COLORS={green:'#2b973c',red:'#972b2b',grey:'#9298a4'};
function tabStateView(record,enabled,url){
 if(!enabled)return {color:'grey',label:'off'};
 if(!/^https?:\/\//.test(url||''))return {color:'grey',label:'unsupported'};
 if(!record)return {color:'grey',label:'pending'};
 if(record.text==='Исключено')return {color:'grey',label:'excluded'};
 if(record.error)return {color:'red',label:'failed'};
 if(record.text==='Применено')return {color:'green',label:'working'};
 return {color:'grey',label:'pending'};
}
function comparisonRows(d,p){
 const zone=x=>new Intl.DateTimeFormat('en',{timeZone:x}).resolvedOptions().timeZone;
 return [['navigator.language',d.language,p.locale],['navigator.languages',d.languages.join(', '),p.languages.join(', ')],['Intl.DateTimeFormat',d.locale,p.locale],['Intl.NumberFormat',d.numberLocale,p.locale],['timeZone',zone(d.timezone),zone(p.timezone)]];
}
