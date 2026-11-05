// Build the local 2x flag sprite. Usage: node scripts/build-country-flags.cjs /path/to/flag-icons
// Source: lipis/flag-icons (MIT). Optional development dependency: sharp.
const fs=require('fs'),path=require('path'),sharp=require('sharp');
(async()=>{
 const source=process.argv[2];if(!source)throw Error('Provide the local flag-icons checkout path');
 const dir=path.join(source,'flags','4x3');
 const files=fs.readdirSync(dir).filter(f=>/^[a-z]{2}\.svg$/.test(f)).sort();
 const inputs=await Promise.all(files.map(async(file,i)=>({input:await sharp(path.join(dir,file)).resize(80,60,{fit:'fill'}).png().toBuffer(),left:0,top:i*60})));
 const root=path.join(__dirname,'..');
 await sharp({create:{width:80,height:files.length*60,channels:4,background:'#00000000'}}).composite(inputs).png().toFile(path.join(root,'icons','country-flags.png'));
 fs.writeFileSync(path.join(root,'country-flags.js'),'// Indices in the bundled local flag sprite (flag-icons, MIT).\nconst COUNTRY_FLAG_INDEX='+JSON.stringify(Object.fromEntries(files.map((f,i)=>[f.slice(0,2),i])))+';\n');
 fs.copyFileSync(path.join(source,'LICENSE'),path.join(root,'icons','flag-icons-LICENSE.txt'));
 console.log('Built '+files.length+' local country flags.');
})().catch(e=>{console.error(e);process.exitCode=1});
