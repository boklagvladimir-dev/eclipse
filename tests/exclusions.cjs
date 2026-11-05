const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const hooks={},local={},session={},attached=new Set(),commands=[],icons={};
const tabs=new Map([[1,{id:1,url:'https://example.com/account'}],[2,{id:2,url:'https://sub.example.com/home'}],[3,{id:3,url:'https://other.test/'}]]);
let dynamic,sessionRules,scriptRuns=0;
const event=name=>({addListener:fn=>hooks[name]=fn});
const chrome={
 storage:{local:{get:async defaults=>({...defaults,...local}),set:async values=>Object.assign(local,values)},session:{get:async key=>key===null?{...session}:{[key]:session[key]},set:async values=>Object.assign(session,values),remove:async keys=>{for(const key of [keys].flat())delete session[key]}}},
 tabs:{get:async id=>{if(!tabs.has(id))throw Error('No tab with id: '+id);return {...tabs.get(id)}},query:async()=>[...tabs.values()].map(t=>({...t})),onCreated:event('created'),onUpdated:event('updated'),onRemoved:event('removed')},
 debugger:{getTargets:async()=>[...tabs.keys()].map(tabId=>({tabId,attached:attached.has(tabId)})),attach:async({tabId})=>attached.add(tabId),detach:async({tabId})=>attached.delete(tabId),sendCommand:async({tabId},method,params)=>{commands.push({tabId,method});assert(attached.has(tabId));if(method==='Runtime.evaluate')return {result:{value:params.expression==='1'?1:{userAgent:'Original browser UA',platform:'Linux'}}};},onDetach:event('detach')},
 action:{setIcon:({tabId,path},callback)=>{icons[tabId]=path[16];callback()},setBadgeText:(data,callback)=>callback()},
 declarativeNetRequest:{updateDynamicRules:async rules=>{for(const r of rules.addRules)assert(!('tabIds' in r.condition));dynamic=rules},updateSessionRules:async rules=>sessionRules=rules},
 scripting:{executeScript:async()=>{scriptRuns++;return [{result:{language:local.locale,languages:local.languages,locale:local.locale,numberLocale:local.locale,timezone:local.timezone}}]}},
 runtime:{onMessage:event('message'),onInstalled:event('installed'),onStartup:event('startup')},webNavigation:{onBeforeNavigate:event('navigate')}
};
const ctx=vm.createContext({URL,chrome,console});ctx.importScripts=file=>vm.runInContext(read(file),ctx);vm.runInContext(read('background.js'),ctx);
const message=m=>new Promise(resolve=>hooks.message(m,{},resolve));
const exclude=(id,excluded,hostname='example.com')=>message({type:'site-exclusion',tabId:id,hostname,excluded});
(async()=>{
 const base=vm.runInContext('({...DEFAULT,enabled:true})',ctx);
 assert.equal((await message({type:'save',settings:base})).ok,true);assert.equal(attached.size,3);
 assert.equal((await exclude(1,true)).ok,true);
 assert.deepEqual([...local.excludedSites],['example.com']);assert(!attached.has(1));assert(!attached.has(2));assert(attached.has(3));
 assert.equal(session['identity:1'],undefined);assert.equal(session['identity:2'],undefined);assert.equal(session['tab:1'].text,'Исключено');assert.equal(icons[1],'icons/grey-16.png');assert.equal(icons[3],'icons/green-16.png');
 const domainAllow=dynamic.addRules.find(r=>r.action.type==='allowAllRequests');assert.deepEqual([...domainAllow.condition.requestDomains],['example.com']);assert.deepEqual([...domainAllow.condition.resourceTypes],['main_frame']);
 assert(domainAllow.priority>dynamic.addRules.find(r=>r.id===1001).priority);
 assert.deepEqual([...sessionRules.addRules[0].condition.tabIds],[1,2]);assert.equal(sessionRules.addRules[0].action.type,'allow');assert(sessionRules.addRules[0].priority>1);
 const before=commands.length;assert.equal((await message({type:'state',tabId:1})).ok,true);assert.equal(commands.length,before);
 const check=await message({type:'check',tabId:1});assert.equal(check.excluded,true);assert.equal(scriptRuns,0);assert.equal(icons[1],'icons/grey-16.png');
 // Saving profile changes must preserve site exceptions even if the popup omits the list.
 assert.equal((await message({type:'save',settings:{...base,excludedSites:[]}})).ok,true);assert.deepEqual([...local.excludedSites],['example.com']);assert(!attached.has(1));
 // Restarts retain the exclusion and do not reattach to excluded tabs.
 await hooks.startup();assert(!attached.has(1));assert(attached.has(3));
 // A before-navigate event must use its destination, not the tab API's old URL.
 await hooks.navigate({tabId:3,frameId:0,url:'https://example.com/new'});assert(!attached.has(3));assert.equal(session['tab:3'].text,'Исключено');assert([...sessionRules.addRules[0].condition.tabIds].includes(3));
 tabs.set(3,{id:3,url:'https://example.com/new'});
 await hooks.navigate({tabId:3,frameId:0,url:'https://other.test/back'});assert(attached.has(3));assert.equal(icons[3],'icons/green-16.png');assert(![...sessionRules.addRules[0].condition.tabIds].includes(3));
 tabs.set(3,{id:3,url:'https://other.test/back'});
 // A stale popup must not add an exception for a different site.
 assert.equal((await exclude(3,true)).ok,false);assert.equal(icons[3],'icons/green-16.png');assert.deepEqual([...local.excludedSites],['example.com']);
 // Removing the parent exception from a subdomain restores all affected tabs immediately.
 assert.equal((await exclude(2,false,'sub.example.com')).ok,true);assert.equal(local.excludedSites.length,0);assert.equal(attached.size,3);assert.equal(dynamic.addRules.length,1);assert.equal(sessionRules.addRules.length,0);
 // Exclusions may be set while globally off and must survive a later enable.
 await message({type:'save',settings:{...base,enabled:false}});await exclude(1,true);assert.equal(attached.size,0);assert.equal(dynamic.addRules.length,0);
 await message({type:'save',settings:base});assert(!attached.has(1));assert(attached.has(3));
 tabs.delete(1);await hooks.removed(1);assert.equal(session['tab:1'],undefined);assert.deepEqual([...sessionRules.addRules[0].condition.tabIds],[2]);
 for(const [url,expected] of [['https://notexample.com',false],['https://example.com.evil.test',false],['https://sub.example.com',true],['chrome://settings',false]])assert.equal(vm.runInContext('isExcludedSite('+JSON.stringify(url)+',["example.com"])',ctx),expected,url);
 console.log('PASS: persisted domain/subdomain exceptions, per-tab headers, debugger detach/restore, other-site isolation, navigation destinations, restart, profile-save preservation, stale popup rejection, diagnostics and tab cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
