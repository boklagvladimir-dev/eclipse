const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function harness(closeAt){
 const session={},hooks={},calls=[],logs=[];let alive=closeAt!=='before',lastError,readError=false,unchecked=0;
 const event=name=>({addListener:fn=>hooks[name]=fn});
 function action(name,details,callback){
  calls.push(name);
  if(closeAt===name)alive=false;
  if(!alive||closeAt==='invalidIcon'&&name==='setIcon'){
   lastError={message:alive?'Could not load icon':`No tab with id: ${details.tabId}.`};readError=false;
  }
  callback();
  if(lastError&&!readError)unchecked++;
  lastError=undefined;
 }
 const runtime={onMessage:event('message'),onInstalled:event('installed'),onStartup:event('startup')};
 Object.defineProperty(runtime,'lastError',{get(){readError=true;return lastError;}});
 const chrome={runtime,storage:{local:{get:async defaults=>({...defaults})},session:{get:async key=>key===null?{...session}:{[key]:session[key]},set:async data=>{Object.assign(session,data);if(closeAt==='storage'&&data['tab:7'])alive=false;},remove:async keys=>{for(const key of [keys].flat())delete session[key];}}},action:{setBadgeText:(details,cb)=>action('setBadgeText',details,cb),setIcon:(details,cb)=>action('setIcon',details,cb)},tabs:{query:async()=>[{id:7,url:'https://example.com'}],get:async id=>{if(!alive)throw Error(`No tab with id: ${id}.`);return {id,url:'https://example.com'};},onCreated:event('created'),onUpdated:event('updated'),onRemoved:event('removed')},scripting:{executeScript:async()=>[]},declarativeNetRequest:{updateDynamicRules:async()=>{},updateSessionRules:async()=>{}},webNavigation:{onBeforeNavigate:event('nav')}};
 const ctx=vm.createContext({URL,chrome,console:{error:e=>logs.push(e)}});ctx.importScripts=file=>vm.runInContext(source(file),ctx);
 vm.runInContext(source('background.js'),ctx);
 return {ctx,hooks,session,calls,logs,get unchecked(){return unchecked;}};
}
(async()=>{
 for(const stage of ['before','storage','setBadgeText','setIcon']){
  const h=harness(stage);await h.hooks.installed();
  assert.equal(h.unchecked,0,stage+': callback error must be read');
  assert.equal(h.session['tab:7'],undefined,stage+': no stale state');
  assert.equal(h.logs.length,0,stage+': closed tab is normal');
  if(stage==='before')assert.deepEqual(h.calls,[]);
 }
 const live=harness();await live.hooks.installed();assert.deepEqual(live.calls,['setBadgeText','setIcon']);assert.equal(live.session['tab:7'].text,'Выключено');
 live.session['page-profile:7']={userAgent:'test'};await live.hooks.removed(7);assert.equal(live.session['page-profile:7'],undefined);assert.equal(live.session['tab:7'],undefined);
 // A real asset failure must still be reported, rather than swallowed.
 const bad=harness('invalidIcon');await bad.hooks.installed();assert.equal(bad.unchecked,0);assert.equal(bad.logs.length,1);assert.match(bad.logs[0].message,/Could not load icon/);
 console.log('PASS: tab closes before lookup, after storage, during badge/icon callback; lastError consumed; live icons; removal cleanup; real icon errors preserved');
})().catch(e=>{console.error(e);process.exitCode=1;});
