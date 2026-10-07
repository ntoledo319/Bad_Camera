// End-to-end: a web build pointed at a locally served data site (stand-in for Cloudflare Pages)
// downloads camera data for an area, shows it, and keeps it after a reload.
// Needs data-site/dist (npm run data:build). Usage: node tools/qa/hosted-download.mjs
//   → prints HOSTED DOWNLOAD PASSED
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { buildExport, launch, onboard, page, serve, QA_TMP, ROOT } from './lib.mjs';

const site = join(ROOT, 'data-site', 'dist');
if (!existsSync(join(site, 'v1', 'manifest.json'))) throw new Error('data-site/dist missing: run npm run data:build first');
const manifest = JSON.parse(readFileSync(join(site, 'v1', 'manifest.json'), 'utf8'));
// Pick the densest tile outside the bundled Fairfield area, and look at its centre.
const tile = manifest.tiles.filter((t) => !(t.bbox[0] <= -73.26 && -73.26 <= t.bbox[2] && t.bbox[1] <= 41.16 && 41.16 <= t.bbox[3])).sort((a, b) => b.count - a.count)[0];
const [w, s, e, n] = tile.bbox;
const center = `${((s + n) / 2).toFixed(4)}, ${((w + e) / 2).toFixed(4)}`;

const DATA_PORT = 8093;
const out = buildExport(join(QA_TMP, 'web-hosted'), { EXPO_PUBLIC_DATA_HOST: `http://127.0.0.1:${DATA_PORT}` });
const dataLog = [];
const dataServer = await serve(site, DATA_PORT, { cors: true, log: dataLog });
const appServer = await serve(out, 8098, { spa: true });
const base = 'http://127.0.0.1:8098';
const browser = await launch();
const problems = [];
try {
  const { p, errors } = await page(browser);
  await onboard(p, base);
  await p.getByLabel('Search for a place or coordinates').click();
  await p.getByLabel('Latitude, longitude').fill(center);
  await p.getByRole('button', { name: 'Go to coordinates' }).click();
  await p.waitForTimeout(3500);
  await p.getByRole('button', { name: 'Download camera data for this area' }).click({ timeout: 15000 });
  const toast = p.getByText(/Downloaded [\d,]+ mapped record/);
  await toast.waitFor({ timeout: 60000 });
  const n = Number((await toast.innerText()).match(/Downloaded ([\d,]+)/)[1].replace(/,/g, ''));
  if (!(n > 0)) problems.push('downloaded zero records');
  if (!dataLog.includes('/v1/manifest.json')) problems.push('manifest was not fetched from the data site');
  if (!dataLog.some((x) => x.startsWith('/v1/tiles/'))) problems.push('no tile was fetched from the data site');
  await p.getByRole('button', { name: 'List', exact: true }).click();
  await p.waitForTimeout(1000);
  const rows = await p.getByRole('button', { name: /Plate reader|Video camera|Unidentified|Enforcement|Acoustic/ }).count();
  if (rows < 1) problems.push('no downloaded records in the list');
  await p.goto(`${base}/settings/data`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const kept = await p.getByText('Downloaded by you').count();
  if (!kept) problems.push('downloaded area not listed after reload');
  problems.push(...errors);
  console.log(`tile ${tile.id} (${tile.count} records listed) · app saved ${n} records · data-site requests: ${dataLog.length} · list rows: ${rows} · persisted areas: ${kept}`);
} finally {
  await browser.close();
  dataServer.close();
  appServer.close();
}
if (problems.length) {
  for (const x of problems) console.log('FAIL', x);
  process.exit(1);
}
console.log('HOSTED DOWNLOAD PASSED');
