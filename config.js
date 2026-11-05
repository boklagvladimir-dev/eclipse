const DEFAULT = {enabled:false,preset:'custom',timezone:'UTC',locale:'en-US',languages:['en-US','en'],latitude:0,longitude:0,geoEnabled:false};
function validate(s) {
  new Intl.DateTimeFormat('en',{timeZone:s.timezone});
  const locale=Intl.getCanonicalLocales(s.locale)[0];
  if(!locale || !Array.isArray(s.languages) || !s.languages.length || s.languages.length>10) throw Error('Нужны основной язык и от 1 до 10 языков');
  const languages=[...new Set(s.languages.map(x=>Intl.getCanonicalLocales(x)[0]))];
  if(!Intl.DateTimeFormat.supportedLocalesOf([locale],{localeMatcher:'lookup'}).length || !Intl.NumberFormat.supportedLocalesOf([locale],{localeMatcher:'lookup'}).length)throw Error('Основной язык не поддерживается форматировщиками этого браузера');
  if(languages.some(x=>!x))throw Error('Пустой язык');
  if(locale!==languages[0])throw Error('Основной язык должен совпадать с первым языком списка');
  if(!Number.isFinite(s.latitude)||Math.abs(s.latitude)>90||!Number.isFinite(s.longitude)||Math.abs(s.longitude)>180)throw Error('Некорректные координаты');
  return {...s,enabled:!!s.enabled,geoEnabled:!!s.geoEnabled,locale,languages};
}
function acceptLanguage(s) {return s.languages.map((x,i)=>i?`${x};q=${(1-i*.1).toFixed(1)}`:x).join(',');}
