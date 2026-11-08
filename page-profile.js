// Serialized by chrome.scripting. Everything needed at runtime lives in this function.
function applyPageProfile(profile) {
 const key=Symbol.for('eclipse.page-profile.v1');
 if(globalThis[key])return globalThis[key](profile);
 if(!profile)return;
 let settings=profile;
 const DateNative=Date;
 const DateTimeFormat=Intl.DateTimeFormat;
 const dateProto=DateNative.prototype;
 const time=dateProto.getTime;
 let offsets;
 function offset(ms){
  const name=offsets.formatToParts(ms).find(part=>part.type==='timeZoneName').value;
  const match=/^GMT([+-])(\d\d):(\d\d)(?::(\d\d))?$/.exec(name);
  if(!match)return 0;
  const [,sign,hours,minutes,seconds='0']=match;
  return (sign==='-'?-1:1)*(Number(hours)*3600+Number(minutes)*60+Number(seconds))*1000;
 }
 function toInstant(local){
  if(!Number.isFinite(local))return NaN;
  const before=offset(local-86400000),after=offset(local+86400000);
  const earlier=local-before,later=local-after;
  if(offset(earlier)===before)return earlier;
  if(offset(later)===after)return later;
  return earlier; // Advance through a spring-forward gap, as Date does.
 }
 function shifted(date){
  const ms=time.call(date);
  return new DateNative(Number.isFinite(ms)?ms+offset(ms):ms);
 }
 function replace(object,name,value){
  Object.defineProperty(object,name,{...Object.getOwnPropertyDescriptor(object,name),value});
 }
 function defaultLocale(locales){
  return settings&&(locales===undefined||Intl.getCanonicalLocales(locales).length===0)?settings.locale:locales;
 }
 function dateOptions(options){
  if(!settings)return options;
  // An explicit timeZone, including an inherited one, takes precedence.
  const base=options===undefined?null:Object(options);
  if(options===null||base?.timeZone!==undefined)return options;
  return Object.defineProperty(Object.create(base),'timeZone',{value:settings.timezone});
 }
 for(const name of ['DateTimeFormat','NumberFormat','Collator','PluralRules','RelativeTimeFormat','ListFormat','DisplayNames','Segmenter','DurationFormat']){
  const original=Intl[name];
  if(!original)continue;
  const argsFor=([locales,options])=>[defaultLocale(locales),name==='DateTimeFormat'?dateOptions(options):options];
  replace(Intl,name,new Proxy(original,{
   apply:(target,receiver,args)=>Reflect.apply(target,receiver,argsFor(args)),
   construct:(target,args,newTarget)=>Reflect.construct(target,argsFor(args),newTarget)
  }));
 }
 for(const suffix of ['FullYear','Month','Date','Day','Hours','Minutes','Seconds','Milliseconds']){
  const getter=dateProto['get'+suffix],utcGetter=dateProto['getUTC'+suffix];
  replace(dateProto,'get'+suffix,function(){return settings?utcGetter.call(shifted(this)):getter.call(this);});
  const setter=dateProto['set'+suffix],utcSetter=dateProto['setUTC'+suffix];
  if(setter)replace(dateProto,'set'+suffix,function(...args){
   if(!settings)return Reflect.apply(setter,this,args);
   const local=Reflect.apply(utcSetter,shifted(this),args);
   return dateProto.setTime.call(this,toInstant(local));
  });
 }
 const getYear=dateProto.getYear,setYear=dateProto.setYear,nativeOffset=dateProto.getTimezoneOffset;
 replace(dateProto,'getYear',function(){return settings?this.getFullYear()-1900:getYear.call(this);});
 replace(dateProto,'setYear',function(year){
  if(!settings)return setYear.call(this,year);
  time.call(this);
  const number=+year;
  if(Number.isNaN(number))return this.setTime(NaN);
  const integer=Math.trunc(number);
  return this.setFullYear(integer>=0&&integer<=99?1900+integer:integer);
 });
 replace(dateProto,'getTimezoneOffset',function(){
  if(!settings)return nativeOffset.call(this);
  const ms=time.call(this);
  return Number.isFinite(ms)?(-offset(ms)/60000||0):NaN;
 });
 for(const name of ['toLocaleString','toLocaleDateString','toLocaleTimeString']){
  const original=dateProto[name];
  replace(dateProto,name,function(locales,options){
   return original.call(this,defaultLocale(locales),dateOptions(options));
  });
 }
 const nativeDateString=dateProto.toDateString,nativeTimeString=dateProto.toTimeString,nativeString=dateProto.toString;
 function localTimeString(date){
  const ms=time.call(date);
  const delta=offset(ms);
  const minutes=Math.trunc(Math.abs(delta)/60000);
  const pad=n=>String(n).padStart(2,'0');
  const zoneName=new DateTimeFormat('en',{timeZone:settings.timezone,timeZoneName:'long'})
   .formatToParts(ms).find(part=>part.type==='timeZoneName').value;
  return dateProto.toISOString.call(shifted(date)).slice(-13,-5)+' GMT'+(delta<0?'-':'+')+
   pad(Math.floor(minutes/60))+pad(minutes%60)+' ('+zoneName+')';
 }
 // Use UTC to render the already shifted wall time, regardless of the system zone.
 function wallString(date,part){
  const ms=time.call(date);
  if(!Number.isFinite(ms))return 'Invalid Date';
  const text=dateProto.toUTCString.call(shifted(date));
  const [,weekday,day,month,year]=/^(\w+), (\d+) (\w+) (-?\d+)/.exec(text);
  const dayText=weekday+' '+month+' '+day+' '+year;
  if(part==='date')return dayText;
  const timeText=localTimeString(date);
  return part==='time'?timeText:dayText+' '+timeText;
 }
 replace(dateProto,'toDateString',function(){return settings?wallString(this,'date'):nativeDateString.call(this);});
 replace(dateProto,'toTimeString',function(){return settings?wallString(this,'time'):nativeTimeString.call(this);});
 replace(dateProto,'toString',function(){return settings?wallString(this):nativeString.call(this);});
 const nativeParse=DateNative.parse;
 function parse(value){
  const text=`${value}`;
  // ISO date-only and explicit-zone timestamps already have defined native semantics.
  if(settings&&/^(?:\d{4}|[+-]\d{6})-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?$/.test(text)){
   return toInstant(nativeParse(text+'Z'));
  }
  return nativeParse(text);
 }
 replace(DateNative,'parse',parse);
 const PageDate=new Proxy(DateNative,{
  apply:(target,receiver,args)=>settings?wallString(new DateNative()):Reflect.apply(target,receiver,args),
  construct(target,args,newTarget){
   if(settings&&args.length>=2)args=[toInstant(DateNative.UTC(...args))];
   else if(settings&&typeof args[0]==='string')args=[parse(args[0])];
   return Reflect.construct(target,args,newTarget);
  }
 });
 replace(globalThis,'Date',PageDate);
 replace(dateProto,'constructor',PageDate);
 const navigatorProto=Object.getPrototypeOf(navigator);
 for(const name of ['language','languages']){
  const original=Object.getOwnPropertyDescriptor(navigatorProto,name);
  Object.defineProperty(navigatorProto,name,{...original,get(){
   const native=original.get.call(this);
   return settings?(name==='language'?settings.locale:settings.languages):native;
  }});
 }
 if(navigator.geolocation){
  const geoProto=Object.getPrototypeOf(navigator.geolocation);
  for(const name of ['getCurrentPosition','watchPosition']){
   const original=geoProto[name];
   replace(geoProto,name,function(success,error,options){
    if(!settings?.geoEnabled||typeof success!=='function')return Reflect.apply(original,this,arguments);
    // Let the browser enforce the site's permission, policy and secure context.
    return original.call(this,position=>{
     if(!settings?.geoEnabled){success(position);return;}
     const coords={latitude:settings.latitude,longitude:settings.longitude,accuracy:30,
      altitude:null,altitudeAccuracy:null,heading:null,speed:null};
     success({coords,timestamp:position.timestamp});
    },error,options);
   });
  }
 }
 function update(next){
  if(next){
   offsets=new DateTimeFormat('en',{timeZone:next.timezone,timeZoneName:'longOffset'});
   settings={...next,languages:Object.freeze([...next.languages])};
  }else settings=null;
  return {
   language:navigator.language,languages:[...navigator.languages],
   locale:new Intl.DateTimeFormat().resolvedOptions().locale,
   numberLocale:new Intl.NumberFormat().resolvedOptions().locale,
   timezone:new Intl.DateTimeFormat().resolvedOptions().timeZone
  };
 }
 Object.defineProperty(globalThis,key,{value:update});
 return update(profile);
}
