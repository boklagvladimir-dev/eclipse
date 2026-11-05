// Generate store artwork from the project's SVG logo and static interface previews.
// Optional development dependency: sharp. Run from the repository root.
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.join(__dirname,'assets');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,s,size=24,color='#f8f9fc',weight=400)=>`<text x="${x}" y="${y}" font-family="DejaVu Sans,sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(s)}</text>`;
const lines=(x,y,a,size=24,color,weight=400,gap=1.25)=>a.map((s,i)=>text(x,y+i*size*gap,s,size,color,weight)).join('');
const rect=(x,y,w,h,fill,r=0,stroke='none')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${r}" stroke="${stroke}"/>`;
const logo=fs.readFileSync(path.join(__dirname,'..','icons','eclipse.svg'),'utf8').replace(/<svg[^>]*>/,'').replace('</svg>','');
function brand(x,y,size=38){return `<g transform="translate(${x},${y}) scale(${size/32})">${logo}</g>`+text(x+size+15,y+size*.79,'Eclipse',size*.78,'#f8f9fc',700)}
function wrap(w,h,body){return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#101426"/><stop offset="1" stop-color="#242842"/></linearGradient></defs>${rect(0,0,w,h,'url(#bg)')}<circle cx="${w*.93}" cy="${h*.14}" r="${h*.55}" fill="none" stroke="#3c405d" stroke-width="1"/><circle cx="${w*.93}" cy="${h*.14}" r="${h*.75}" fill="none" stroke="#30354e" stroke-width="1"/>${body}</svg>`}
async function write(name,w,h,body){await sharp(Buffer.from(wrap(w,h,body))).flatten({background:'#101426'}).png().toFile(path.join(root,name));}
async function img(file,top,height){return (await sharp(path.join(root,file)).extract({left:0,top,width:400,height}).png().toBuffer()).toString('base64')}
(async()=>{
 const simple=await img('preview-simple.png',0,720),advanced=await img('preview-advanced.png',310,740);
 await write('01-language-region-1280x800.png',1280,800,
 brand(64,48,42)+text(64,174,'LANGUAGE & REGION',16,'#b9a7ff',700)+
 lines(64,252,['Your language.','Your region.'],64,'#fff',700,1.13)+
 lines(64,434,['Set website language, locale,','time zone and location.'],27,'#c4cadd',400,1.5)+
 rect(64,570,266,44,'#343650',22)+text(85,598,'12 interface languages',15,'#e8e3ff',600)+
 text(64,692,'Regional presets · Custom profiles',20,'#c4cadd')+
 rect(794,45,404,724,'#d9dfed')+`<image x="796" y="47" width="400" height="720" xlink:href="data:image/png;base64,${simple}"/>`+
 text(64,759,'Interface preview · Enable Eclipse to apply your settings',14,'#8d98b3'));
 await write('02-advanced-settings-1280x800.png',1280,800,
 brand(64,48,42)+text(64,174,'FLEXIBLE CONTROLS',16,'#b9a7ff',700)+
 lines(64,252,['Your settings.','Your way.'],64,'#fff',700,1.13)+
 lines(64,449,['Order your preferred languages.','Choose a time zone.','Set coordinates when needed.','Save profiles for later.'],25,'#c4cadd',400,1.7)+
 text(64,759,'Advanced settings · Interface preview',14,'#8d98b3')+
 rect(818,78,360,662,'#d9dfed')+`<image x="820" y="80" width="356" height="658" xlink:href="data:image/png;base64,${advanced}"/>`);
 const langs=['English','Russian','German','Finnish','Italian','French','Spanish','Portuguese (Brazil)','Chinese (Simplified)','Japanese','Arabic','Persian (Farsi)'];
 let tiles='';for(let i=0;i<langs.length;i++){const x=64+(i%3)*388,y=350+Math.floor(i/3)*77;tiles+=rect(x,y,364,58,'#2e334d',10)+text(x+21,y+37,langs[i],21,'#f2f0fa',500)}
 await write('03-twelve-languages-1280x800.png',1280,800,
 brand(64,48,42)+text(64,174,'AVAILABLE IN 12 LANGUAGES',16,'#b9a7ff',700)+
 lines(64,249,['A familiar interface.','In your language.'],46,'#fff',700,1.13)+tiles+
 text(64,728,'Arabic and Persian include right-to-left layout.',21,'#c4cadd')+
 text(64,763,'Interface language is independent of website language settings.',15,'#8d98b3'));
 await write('promo-small-440x280.png',440,280,
 brand(28,25,40)+lines(28,123,['Language & region,','on your terms.'],29,'#fff',700,1.18)+
 rect(28,218,280,34,'#343650',17)+text(43,241,'12 interface languages',17,'#e8e3ff',600));
 await write('promo-marquee-1400x560.png',1400,560,
 brand(64,48,50)+text(64,166,'LANGUAGE · LOCALE · TIME ZONE · LOCATION',17,'#b9a7ff',700)+
 lines(64,254,['Your language. Your region.','Your browser, aligned.'],55,'#fff',700,1.24)+
 text(64,435,'12 interface languages · Regional presets · Custom profiles',23,'#c4cadd')+
 `<g transform="translate(1100,145) scale(6)">${logo}</g>`+text(64,511,'Eclipse',16,'#8d98b3',600));
 await sharp(path.join(__dirname,'..','icons','icon-128.png')).toFile(path.join(root,'store-icon-128.png'));
 console.log('Created 3 feature images, 2 promotional banners and store icon.');
})();
