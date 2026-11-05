// Optional development dependency: npm install --no-save sharp
// Run from repository root: node scripts/build-icons.cjs
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.join(__dirname, '..', 'icons');
const source = fs.readFileSync(path.join(root, 'eclipse.svg'), 'utf8');
const sizes = [16, 20, 24, 32, 48, 64, 128, 256];
async function build() {
  for (const n of sizes) {
    await sharp(Buffer.from(source)).resize(n, n).png().toFile(path.join(root, `icon-${n}.png`));
    for (const [state, color] of Object.entries({green:'#22b573', red:'#e24b50', grey:'#9298a4'})) {
      const svg = source.replace('</svg>', `<circle cx="25.5" cy="25.5" r="4.2" fill="${color}" stroke="#fff" stroke-width="1.3"/></svg>`);
      await sharp(Buffer.from(svg)).resize(n, n).png().toFile(path.join(root, `${state}-${n}.png`));
    }
  }
  await sharp(Buffer.from(source)).resize(1024, 1024).png().toFile(path.join(root, 'eclipse-master.png'));
  console.log('Built transparent Eclipse icons with green, red and grey indicators.');
}
build().catch(error => { console.error(error); process.exitCode = 1; });
