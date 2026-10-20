import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('ERR', e.message));
const out = (n) => `/mnt/project-files/budr/lys-nu/${n}.png`;
await p.goto('http://localhost:4028/park-hub', { waitUntil: 'networkidle', timeout: 180000 });
await p.waitForTimeout(2500);
await p.screenshot({ path: out('01-start') });
// close overlays if any
for (const t of ['Spring over', 'Luk', 'Kom i gang', 'Fortsæt', 'Videre']) {
  const btn = p.getByRole('button', { name: t }).first();
  if (await btn.isVisible().catch(() => false)) { await btn.click().catch(()=>{}); await p.waitForTimeout(800); }
}
await p.screenshot({ path: out('02-hjem'), fullPage: true });
const texts = await p.locator('button').allInnerTexts();
console.log(texts.filter(Boolean).slice(0,60).join(' | '));
for (const [name, label] of [['03-kalender','Kalender'],['04-checkin','Check-in'],['05-mere','Mere']]) {
  await p.goto('http://localhost:4028/park-hub', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const btn = p.getByRole('button', { name: label }).last();
  if (await btn.isVisible().catch(()=>false)) { await btn.click(); await p.waitForTimeout(1500); await p.screenshot({ path: out(name), fullPage: true }); }
  else console.log('missing', label);
}
await b.close();
