// All runtime-supported zones, plus accepted IANA aliases from the bundled tz database.
const CITY_ALIASES = {
 'Europe/Moscow':'Москва Санкт-Петербург Петербург Пушкин Россия Moscow Saint Petersburg Russia','Europe/Berlin':'Берлин Германия Berlin Germany',
 'Europe/Helsinki':'Хельсинки Финляндия Helsinki Finland','Europe/London':'Лондон Англия Великобритания London UK',
 'Europe/Paris':'Париж Франция Paris France','Europe/Rome':'Рим Италия Rome Italy','Europe/Madrid':'Мадрид Испания Madrid Spain',
 'Europe/Istanbul':'Стамбул Турция Istanbul Turkey','Europe/Kyiv':'Киев Украина Kyiv Ukraine','Europe/Kiev':'Киев Украина Kyiv Ukraine',
 'Europe/Minsk':'Минск Беларусь Minsk Belarus','Europe/Kaliningrad':'Калининград Россия','Europe/Samara':'Самара Россия',
 'Asia/Yekaterinburg':'Екатеринбург Россия','Asia/Omsk':'Омск Россия','Asia/Novosibirsk':'Новосибирск Россия',
 'Asia/Krasnoyarsk':'Красноярск Россия','Asia/Irkutsk':'Иркутск Россия','Asia/Yakutsk':'Якутск Россия',
 'Asia/Vladivostok':'Владивосток Россия','Asia/Magadan':'Магадан Россия','Asia/Kamchatka':'Камчатка Россия',
 'Asia/Dubai':'Дубай ОАЭ Dubai UAE','Asia/Tbilisi':'Тбилиси Грузия','Asia/Yerevan':'Ереван Армения',
 'Asia/Almaty':'Алматы Казахстан','Asia/Bangkok':'Бангкок Таиланд','Asia/Tokyo':'Токио Япония',
 'Asia/Shanghai':'Шанхай Китай','Asia/Singapore':'Сингапур','America/New_York':'Нью Йорк США',
 'America/Los_Angeles':'Лос Анджелес США','America/Chicago':'Чикаго США','Australia/Sydney':'Сидней Австралия',
 'UTC':'всемирное координированное время UTC GMT'
};
const normalizeZoneQuery=x=>x.toLowerCase().replace(/ё/g,'е').replace(/[_\s−]/g,c=>c==='−'?'-':'').replace(/([+-])0(?=\d)/g,'$1');
function zoneInfo(zone,now=new Date()){
 const parts=new Intl.DateTimeFormat('en',{timeZone:zone,timeZoneName:'longOffset'}).formatToParts(now);
 const offset=parts.find(x=>x.type==='timeZoneName').value.replace('GMT','UTC');
 const label=new Intl.DateTimeFormat(typeof uiLang==='undefined'?'ru':uiLang,{timeZone:zone,timeZoneName:'longGeneric'}).formatToParts(now).find(x=>x.type==='timeZoneName').value;
 return {zone,offset,label,search:normalizeZoneQuery([zone,offset,offset.replace(':00',''),label,CITY_ALIASES[zone]||''].join(' '))};
}
const zoneCandidates=new Set([...BUNDLED_ZONES,...Intl.supportedValuesOf('timeZone'),'UTC']);
const zoneItems=[];
for(const zone of [...zoneCandidates].sort())try{zoneItems.push(zoneInfo(zone));}catch{/* Exclude names unsupported by this browser's ICU. */}
function filterZones(q){const tokens=q.toLowerCase().trim().split(/\s+/).filter(Boolean).map(normalizeZoneQuery);return zoneItems.filter(x=>tokens.every(t=>x.search.includes(t)));}
window.updateZonePreview=()=>{
 const output=document.getElementById('zonePreview');
 try{const zone=document.getElementById('timezone').value;const i=zoneInfo(zone);output.textContent=`${i.offset} · ${new Intl.DateTimeFormat(typeof uiLang==='undefined'?'ru':uiLang,{timeZone:zone,dateStyle:'short',timeStyle:'short'}).format(new Date())}`;}catch{output.textContent=typeof t==='function'?t('invalidZone'):'Введите существующий идентификатор IANA или выберите пояс из списка.';}
};
function renderZones(){
 const found=filterZones(document.getElementById('zoneSearch').value);
 document.getElementById('zoneCount').textContent=`${typeof t==='function'?t('count'):'Results'}: ${found.length} / ${zoneItems.length}`;
 const list=document.getElementById('zoneResults');list.replaceChildren();
 for(const i of found){
  const b=document.createElement('button');b.type='button';b.style.cssText='display:block;text-align:left;width:100%;border-radius:0;background:#fff;color:#18243b;border-bottom:1px solid #eef1f6;padding:8px 10px;font-size:12px';
  b.textContent=`${i.offset} · ${i.zone.replaceAll('_',' ')}${CITY_ALIASES[i.zone]?' · '+CITY_ALIASES[i.zone].split(/[A-Z]/)[0].trim():''}`;
  b.addEventListener('click',()=>{const field=document.getElementById('timezone');field.value=i.zone;field.dispatchEvent(new Event('input',{bubbles:true}));window.updateZonePreview();});
  list.append(b);
 }
 if(!found.length)list.textContent=typeof t==='function'?t('empty'):'No results';
}
document.getElementById('zoneSearch').addEventListener('input',renderZones);
document.getElementById('timezone').addEventListener('input',window.updateZonePreview);
renderZones();
