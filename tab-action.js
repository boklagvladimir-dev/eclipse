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
