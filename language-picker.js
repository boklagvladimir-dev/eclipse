const langEl=id=>document.getElementById(id);
const languageNamesRU=new Intl.DisplayNames([typeof uiLang==='undefined'?'ru':uiLang],{type:'language'});
const languageNamesRussian=new Intl.DisplayNames(['ru'],{type:'language'});
const languageNamesEN=new Intl.DisplayNames(['en'],{type:'language'});
const normalizeLanguageQuery=x=>x.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/_/g,'-');
function isLocaleSupported(code){
 try{return Intl.DateTimeFormat.supportedLocalesOf([code],{localeMatcher:'lookup'}).length>0&&Intl.NumberFormat.supportedLocalesOf([code],{localeMatcher:'lookup'}).length>0;}catch{return false;}
}
function describeLanguage(code){
 let native=code;try{native=new Intl.DisplayNames([code],{type:'language'}).of(code);}catch{}
 const ru=languageNamesRU.of(code),en=languageNamesEN.of(code);
 return {code,ru,en,native,search:normalizeLanguageQuery([code,ru,en,native,languageNamesRussian.of(code)].join(' '))};
}
const languageItems=[...new Set(LOCALE_CATALOG.map(x=>Intl.getCanonicalLocales(x)[0]))].filter(isLocaleSupported).map(describeLanguage).sort((a,b)=>a.ru.localeCompare(b.ru,typeof uiLang==='undefined'?'ru':uiLang));
function filterLanguages(query){const tokens=normalizeLanguageQuery(query).trim().split(/\s+/).filter(Boolean);return languageItems.filter(i=>tokens.every(t=>i.search.includes(t)));}
function languageChain(code,english=true){
 const loc=new Intl.Locale(code),chain=[loc.baseName];
 if(loc.script)chain.push(`${loc.language}-${loc.script}`);
 chain.push(loc.language);
 if(english)chain.push('en-US','en');
 return [...new Set(chain)];
}
function readLanguageList(){return [...new Set(langEl('languages').value.split(',').map(x=>x.trim()).filter(Boolean).map(x=>Intl.getCanonicalLocales(x)[0]))];}
function applyLanguageList(list){
 if(!list.length)return;
 langEl('locale').value=list[0];langEl('languages').value=list.join(', ');
 langEl('preset').value='custom';window.updateLanguagePreview();
}
function chooseLanguage(code){applyLanguageList(languageChain(code,langEl('englishFallback').checked));}
function addLanguage(code){
 try{const list=readLanguageList();if(list.includes(code))return;if(list.length>=10)throw Error((typeof t==='function'?t('maxLanguages'):'Можно выбрать до 10 языков'));applyLanguageList([...list,code]);}catch(e){langEl('languagePreview').textContent=e.message;}
}
window.updateLanguagePreview=()=>{
 const preview=langEl('languagePreview'),order=langEl('languageOrder');order.replaceChildren();
 try{
  const list=readLanguageList(),locale=Intl.getCanonicalLocales(langEl('locale').value)[0];
  if(!locale||!list.length)throw Error((typeof t==='function'?t('chooseLanguage'):'Выберите основной язык'));
  for(let index=0;index<list.length;index++){
   const code=list[index],row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:5px;margin:4px 0';
   const text=document.createElement('span');text.textContent=`${index+1}. ${languageNamesRU.of(code)} · ${code}`;text.style.cssText='flex:1;font-size:12px';row.append(text);
   for(const [label,title,delta] of [['↑',typeof t==='function'?t('up'):'Выше в списке',-1],['↓',typeof t==='function'?t('down'):'Ниже в списке',1],['×',typeof t==='function'?t('removeLanguage'):'Удалить язык',0]]){
    const button=document.createElement('button');button.type='button';button.textContent=languageNamesRU.of(code);button.title=title;button.setAttribute('aria-label',`${title}: ${code}`);button.style.cssText='padding:4px 7px;flex:0;background:#e1e7ee;color:#17385d';
    button.disabled=delta===-1?index===0:delta===1?index===list.length-1:list.length===1;
    button.addEventListener('click',()=>{const next=[...list];if(delta)[next[index],next[index+delta]]=[next[index+delta],next[index]];else next.splice(index,1);applyLanguageList(next);});row.append(button);
   }
   order.append(row);
  }
  if(locale!==list[0])throw Error((typeof t==='function'?t('localeMismatch'):'Основной язык должен совпадать с первым языком списка'));
  if(!isLocaleSupported(locale))throw Error((typeof t==='function'?t('localeUnsupported'):'Этот язык не поддерживается форматировщиками браузера'));
  if(list.length>10)throw Error((typeof t==='function'?t('maxLanguages'):'Можно выбрать до 10 языков'));
  const date=new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date());
  const number=new Intl.NumberFormat(locale).format(1234567.89);
  preview.textContent=`${locale} · ${date} · ${number}`;
 }catch(e){preview.textContent=e.message;}
};
function renderLanguages(){
 const found=filterLanguages(langEl('languageSearch').value);langEl('languageCount').textContent=`${typeof t==='function'?t('count'):'Results'}: ${found.length} / ${languageItems.length}`;
 const container=langEl('languageResults');container.replaceChildren();
 for(const item of found){
  const row=document.createElement('div');row.style.cssText='display:flex;border-bottom:1px solid #eef1f6';
  const select=document.createElement('button');select.type='button';select.textContent=`${item.ru} · ${item.code} · ${item.native}`;select.style.cssText='text-align:left;flex:1;border-radius:0;background:#fff;color:#18243b;padding:8px;font-size:12px';select.addEventListener('click',()=>chooseLanguage(item.code));
  const add=document.createElement('button');add.type='button';add.textContent='+';add.title=typeof t==='function'?t('addLanguage'):'Add language';add.setAttribute('aria-label',`Добавить ${item.ru}`);add.style.cssText='flex:0;padding:8px 12px;border-radius:0;background:#e8eef7;color:#17385d';add.addEventListener('click',()=>addLanguage(item.code));
  row.append(select,add);container.append(row);
 }
 if(!found.length)container.textContent=typeof t==='function'?t('empty'):'No results';
}
for(const [code,label] of [['fi-FI','Финский'],['it-IT','Итальянский'],['ru-RU','Русский'],['en-US','English US'],['en-GB','English UK'],['de-DE','Немецкий'],['fr-FR','Французский'],['es-ES','Испанский'],['pt-BR','Португальский BR'],['pl-PL','Польский'],['zh-Hans-CN','Китайский 简'],['zh-Hant-TW','Китайский 繁'],['ja-JP','Японский'],['ko-KR','Корейский'],['ar-SA','Арабский'],['he-IL','Иврит'],['tr-TR','Турецкий'],['uk-UA','Украинский'],['nl-NL','Нидерландский'],['sv-SE','Шведский'],['nb-NO','Норвежский'],['da-DK','Датский'],['cs-CZ','Чешский']]){
 if(!isLocaleSupported(code))continue;
 const button=document.createElement('button');button.type='button';button.textContent=languageNamesRU.of(code);button.style.cssText='flex:0 1 auto;padding:6px 8px;background:#e1e7ee;color:#17385d;font-size:12px';button.addEventListener('click',()=>chooseLanguage(code));langEl('quickLanguages').append(button);
}
langEl('languageSearch').addEventListener('input',renderLanguages);
for(const id of ['locale','languages'])langEl(id).addEventListener('input',window.updateLanguagePreview);
renderLanguages();
