// Renders every app route in the static web build, light and dark, and fails on any console
// error or uncaught page error. Also exercises demo-mode record routes.
// Usage: node tools/qa/route-tour.mjs   → prints ROUTE TOUR CLEAN
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { buildExport, launch, onboard, page, serve, QA_TMP, ROOT } from './lib.mjs';

const region = JSON.parse(readFileSync(join(ROOT, 'content/regions/fairfield-ct/region.json'), 'utf8'));
const camId = region.installations[0].id;
const srcId = region.installations[0].geometry.sourceId;

const ROUTES = [
  '/explore', '/identify', '/notebook', '/learn',
  `/camera/${camId}`, '/catalog/flock-lpr', '/catalog/generic-unknown', '/compare', `/sources/${srcId}`,
  '/observation/new', '/learn/rights', '/learn/methodology', '/learn/records-request',
  '/settings', '/settings/privacy', '/settings/data', '/settings/backup', '/settings/licenses', '/settings/diagnostics', '/settings/legal', '/verify',
];
const DEMO_ROUTES = ['/observation/demo-observation-1', '/share/demo-observation-1', '/observation/redact?attachmentId=demo-attachment-1&recordId=demo-observation-1'];

const out = buildExport(join(QA_TMP, 'web'));
const server = await serve(out, 8097, { spa: true });
const base = 'http://127.0.0.1:8097';
const browser = await launch();
const failures = [];
let visits = 0;
try {
  for (const [dark, width] of [[false, 390], [true, 390], [false, 320]]) {
    const { ctx, p, errors } = await page(browser, { dark, width });
    await onboard(p, base);
    const visit = async (r) => {
      errors.length = 0;
      await p.goto(base + r, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1800);
      if (process.env.SHOTS) await p.screenshot({ path: join(process.env.SHOTS, `${width}-${dark ? 'dark' : 'light'}${r.replace(/[^a-z0-9]+/gi, '_')}.png`) });
      const blank = (await p.locator('body').innerText()).trim().length < 20;
      if (blank) errors.push('page rendered no text');
      if (errors.length) failures.push(`${width}px ${dark ? 'dark' : 'light'} ${r}: ${errors.join(' | ')}`);
      visits++;
    };
    for (const r of ROUTES) await visit(r);
    // Demo mode: turn it on from Settings, then visit record routes.
    await p.goto(`${base}/settings`, { waitUntil: 'domcontentloaded' });
    await p.getByRole('switch', { name: 'Demo mode' }).click({ timeout: 15000 });
    await p.waitForTimeout(1000);
    for (const r of DEMO_ROUTES) await visit(r);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`${visits} route renders checked`);
if (failures.length) {
  for (const f of failures) console.log('FAIL', f);
  process.exit(1);
}
console.log('ROUTE TOUR CLEAN');
