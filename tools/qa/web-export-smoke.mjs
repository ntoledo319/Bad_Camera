// Builds the production web export, serves it, and checks it boots to Explore with a working map
// worker, the bundled records, and no console/page errors.
// Usage: node tools/qa/web-export-smoke.mjs   → prints WEB EXPORT SMOKE PASSED
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { buildExport, launch, onboard, page, serve, QA_TMP } from './lib.mjs';

const out = buildExport(join(QA_TMP, 'web'));
const problems = [];
for (const f of ['index.html', 'maplibre/maplibre-gl-worker.mjs', 'maplibre/maplibre-gl-shared.mjs']) if (!existsSync(join(out, f))) problems.push(`missing ${f} in export`);
const log = [];
const server = await serve(out, 8096, { spa: true, log });
const browser = await launch();
try {
  const { p, errors } = await page(browser);
  await onboard(p, 'http://127.0.0.1:8096');
  await p.waitForTimeout(4000);
  if (!log.includes('/maplibre/maplibre-gl-worker.mjs')) problems.push('map worker was never requested');
  const canvas = await p.locator('canvas.maplibregl-canvas').count();
  if (!canvas) problems.push('no MapLibre canvas rendered');
  const summary = await p.getByText('Mapped in this area').count();
  if (!summary) problems.push('Explore summary missing');
  await p.getByRole('button', { name: 'List', exact: true }).click();
  await p.waitForTimeout(1000);
  const rows = await p.getByRole('button', { name: /Plate reader|Video camera|Unidentified|Enforcement|Acoustic/ }).count();
  if (rows < 5) problems.push(`list shows only ${rows} records`);
  problems.push(...errors);
  console.log(`export ok · worker requested: ${log.includes('/maplibre/maplibre-gl-worker.mjs')} · canvas: ${canvas} · list rows: ${rows}`);
} finally {
  await browser.close();
  server.close();
}
if (problems.length) {
  for (const x of problems) console.log('FAIL', x);
  process.exit(1);
}
console.log('WEB EXPORT SMOKE PASSED');
