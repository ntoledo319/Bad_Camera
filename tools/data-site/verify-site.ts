#!/usr/bin/env tsx
/**
 * Verifies a built or published data site.
 *
 *   npx tsx tools/data-site/verify-site.ts --dir data-site/dist
 *   npx tsx tools/data-site/verify-site.ts --remote https://sightline-data.pages.dev --min-records 10000
 *
 * Checks: manifest schema; every tile exists, matches its listed size and SHA-256, parses as a
 * tile, has the listed count, every element lies inside the tile bbox and normalizes; record
 * total equals the sum of tiles with no duplicate element across tiles; ODbL attribution file;
 * privacy and terms pages; CORS header for /v1 (file rule locally, response header remotely).
 * Prints "SITE VERIFIED" / "REMOTE SITE VERIFIED" only if every check passes.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Hex } from '../../src/domain/hash';
import { SiteManifest, TileFile } from '../../src/domain/tiles';
import { normalizeOsm } from '../../src/domain/osm';

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1] ?? '');
const dir = args.get('dir');
const remote = args.get('remote')?.replace(/\/$/, '');
const minRecords = Number(args.get('min-records') ?? 1);
if (!dir === !remote) throw new Error('pass exactly one of --dir or --remote');

const problems: string[] = [];
const fail = (m: string) => problems.push(m);

async function get(path: string): Promise<{ text: string; headers: Headers | null } | null> {
  if (dir) {
    const p = join(dir, path);
    return existsSync(p) ? { text: readFileSync(p, 'utf8'), headers: null } : null;
  }
  const res = await fetch(`${remote}/${path}`, { headers: { 'User-Agent': 'Sightline site verifier' } });
  return res.ok ? { text: await res.text(), headers: res.headers } : null;
}

async function main() {
  const mf = await get('v1/manifest.json');
  if (!mf) throw new Error('manifest.json missing');
  const m = SiteManifest.parse(JSON.parse(mf.text));
  if (!/OpenStreetMap contributors/.test(m.attribution)) fail('manifest attribution lacks OpenStreetMap contributors');
  if (remote && mf.headers?.get('access-control-allow-origin') !== '*') fail('manifest is served without Access-Control-Allow-Origin: *');

  const seen = new Set<string>();
  let total = 0;
  let checked = 0;
  const queue = [...m.tiles];
  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      const got = await get(`v1/${t.path}`);
      if (!got) {
        fail(`${t.id}: tile file missing`);
        continue;
      }
      const bytes = Buffer.byteLength(got.text);
      if (bytes !== t.bytes) fail(`${t.id}: size ${bytes} != listed ${t.bytes}`);
      if (sha256Hex(got.text) !== t.sha256) fail(`${t.id}: SHA-256 mismatch`);
      const tile = TileFile.parse(JSON.parse(got.text));
      if (tile.id !== t.id) fail(`${t.id}: id mismatch (${tile.id})`);
      if (tile.elements.length !== t.count) fail(`${t.id}: ${tile.elements.length} elements != listed ${t.count}`);
      const [w, s, e, n] = t.bbox;
      for (const el of tile.elements) {
        const p = el.type === 'node' ? { lat: el.lat!, lon: el.lon! } : el.center;
        if (!p || p.lon < w || p.lon >= e || p.lat < s || p.lat >= n) fail(`${t.id}: ${el.type}/${el.id} outside tile bbox`);
        const k = `${el.type}/${el.id}`;
        if (seen.has(k)) fail(`${k} appears in more than one tile`);
        seen.add(k);
        if ('user' in el || 'uid' in el || 'changeset' in el) fail(`${k}: mapper identity field present`);
      }
      const norm = normalizeOsm(tile.elements, { fetchedAt: m.generatedAt, regionId: t.id, endpoint: 'verify' });
      const badSkips = norm.skipped.filter((x) => !/indoor|not a surveillance/.test(x.reason));
      if (badSkips.length) fail(`${t.id}: ${badSkips.length} elements fail normalization (${badSkips[0].reason})`);
      total += tile.elements.length;
      checked++;
    }
  };
  await Promise.all(Array.from({ length: remote ? 6 : 1 }, worker));

  if (total !== m.totalRecords) fail(`tiles hold ${total} records but manifest says ${m.totalRecords}`);
  if (m.totalRecords < minRecords) fail(`only ${m.totalRecords} records (< ${minRecords})`);
  if (!m.tiles.length) fail('no tiles');

  const attr = await get('ATTRIBUTION.txt');
  if (!attr || !/Open Database License/.test(attr.text) || !/OpenStreetMap contributors/.test(attr.text)) fail('ATTRIBUTION.txt missing or lacks ODbL notice');
  const priv = await get('privacy.html');
  if (!priv || !/<h1>Privacy policy<\/h1>/.test(priv.text) || !/no analytics/i.test(priv.text)) fail('privacy.html missing or incomplete');
  const terms = await get('terms.html');
  if (!terms || !/<h1>Terms of use<\/h1>/.test(terms.text) || !/not reviewed by a lawyer/.test(terms.text)) fail('terms.html missing or incomplete');
  const home = await get('index.html');
  if (!home || !home.text.includes(m.totalRecords.toLocaleString('en-US'))) fail('index.html missing or shows a stale record count');
  if (dir) {
    const h = await get('_headers');
    if (!h || !/\/v1\/\*\s*\n\s*Access-Control-Allow-Origin: \*/.test(h.text)) fail('_headers lacks the /v1 CORS rule');
  }

  console.log(`${remote ?? dir}: ${m.totalRecords} records, ${checked}/${m.tiles.length} tiles checked, ${m.regions.filter((r) => r.status === 'fresh').length}/${m.regions.length} regions fresh, built ${m.generatedAt}`);
  if (problems.length) {
    for (const p of problems.slice(0, 30)) console.log('FAIL', p);
    console.log(`${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log(remote ? 'REMOTE SITE VERIFIED' : 'SITE VERIFIED');
}

main().catch((e) => {
  console.error('ERROR', (e as Error).message);
  process.exit(1);
});
