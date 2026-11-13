const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context=vm.createContext();
const run=source=>vm.runInContext(source,context);
run(`class Navigator {
 get language(){return 'en-US';}
 get languages(){return ['en-US','en'];}
}
globalThis.navigator=new Navigator();
globalThis.originalZone=new Intl.DateTimeFormat().resolvedOptions().timeZone;`);
run(fs.readFileSync(require('node:path').join(__dirname,'../page-profile.js'),'utf8'));
const profile=run(`applyPageProfile({locale:'fi-FI',languages:['fi-FI','en'],timezone:'Europe/Helsinki'})`);
assert.equal(profile.language,'fi-FI');
assert.equal(profile.locale,'fi-FI');
assert.equal(profile.numberLocale,'fi-FI');
assert.equal(profile.timezone,'Europe/Helsinki');
assert.equal(run("new Date('2026-01-01T12:00Z').getTimezoneOffset()"),-120);
assert.equal(run("new Date('2026-07-01T12:00Z').getTimezoneOffset()"),-180);
assert.equal(run("new Date('2026-07-01T12:00Z').getHours()"),15);
assert.equal(run("new Date('2026-07-01T12:00Z').toTimeString().slice(0,8)"),'15:00:00');
assert.equal(run("new Date('2026-07-01T12:00Z').toDateString()"),'Wed Jul 01 2026');
assert.equal(run("new Date('2026-07-01T12:00:00').toISOString()"),'2026-07-01T09:00:00.000Z');
assert.equal(run("new Date(2026,6,1,12).toISOString()"),'2026-07-01T09:00:00.000Z');
assert.equal(run("new Date(2026,2,29,3,30).toISOString()"),'2026-03-29T01:30:00.000Z');
assert.equal(run("new Date(2026,9,25,3,30).toISOString()"),'2026-10-25T00:30:00.000Z');
assert.equal(run("const d=new Date('2026-07-01T12:00Z');d.setHours(12);d.toISOString()"),'2026-07-01T09:00:00.000Z');
assert.equal(run("new Intl.DateTimeFormat('en-US',{timeZone:'UTC'}).resolvedOptions().timeZone"),'UTC');
assert.equal(run("new Intl.DateTimeFormat('en-US',{timeZone:'UTC'}).resolvedOptions().locale"),'en-US');
assert.equal(run("applyPageProfile({locale:'en-GB',languages:['en-GB'],timezone:'Europe/London'}).timezone"),'Europe/London');
assert.equal(run("applyPageProfile(null).timezone"),run('originalZone'));
assert.equal(run('navigator.language'),'en-US');
console.log('PASS: page profile, explicit Intl options, winter/summer time, DST gaps and overlaps, Date constructor/setters, profile switching and cleanup');
