#!/usr/bin/env tsx
/**
 * Builds the static camera-data site (Cloudflare Pages) from OpenStreetMap.
 *
 *   npx tsx tools/data-site/build.ts                       # whole U.S. grid, live Overpass
 *   npx tsx tools/data-site/build.ts --cells c40_-74,c40_-72   # a subset (cell codes)
 *   npx tsx tools/data-site/build.ts --previous https://sightline-data.pages.dev
 *   npx tsx tools/data-site/build.ts --pages-only true      # re-render HTML/static files, keep data
 *
 * - One bounding-box Overpass query per 2° grid cell (sequential, polite pauses, retries,
 *   mirror fallback). Cells with no data cost Overpass almost nothing.
 * - Only type/id/coordinates/version/timestamp/tags are kept: mapper usernames, uids and
 *   changesets are dropped.
 * - A cell whose query fails keeps its previously published elements (status "kept-previous"),
 *   so one bad night never empties an area.
 * - Output: data-site/dist/{index.html, privacy.html, terms.html, ATTRIBUTION.txt, _headers,
 *   v1/manifest.json, v1/tiles/*.json}. Tiles are deterministic, so unchanged data hashes the same.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { overpassRequest } from '../../src/data/overpass';
import { NORMALIZATION_VERSION, OSM_ATTRIBUTION, type OsmElement } from '../../src/domain/osm';
import { sha256Hex } from '../../src/domain/hash';
import { MAX_ELEMENTS_PER_TILE, SITE_SCHEMA_VERSION, SiteManifest, TileFile, tileId, type Bbox, type TileEntry } from '../../src/domain/tiles';
import { areaName } from '../../src/features/format';
import { FETCH_CELLS } from './regions';
import { renderPages } from './pages';

type El = OsmElement & { r?: string };

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1] ?? '');
const ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(ROOT, args.get('out') ?? 'data-site/dist');
const CACHE = args.get('cache') ? join(ROOT, args.get('cache')!) : null;
const PREVIOUS = args.get('previous') ?? null;
const PAUSE_MS = Number(args.get('pause') ?? 4000);
const wanted = args.get('cells') ?? 'all';
const regions = wanted === 'all' ? FETCH_CELLS : FETCH_CELLS.filter((r) => wanted.split(',').includes(r.code));
if (!regions.length) throw new Error(`No cells match --cells ${wanted}`);

/** Public Overpass instances, tried in order when one is overloaded. */
const ENDPOINTS = (args.get('endpoints') ?? 'https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter,https://overpass.kumi.systems/api/interpreter').split(',');

const query = ([w, s, e, n]: [number, number, number, number]) => {
  const b = `${s},${w},${n},${e}`;
  return `[out:json][timeout:300][maxsize:536870912];(nwr["man_made"="surveillance"](${b});nwr["highway"="speed_camera"](${b}););out meta center;`;
};

function slim(e: OsmElement, r: string): El | null {
  if (!['node', 'way', 'relation'].includes(e.type) || !Number.isSafeInteger(e.id) || e.id <= 0) return null;
  const out: El = { type: e.type, id: e.id, r };
  if (e.type === 'node') {
    if (typeof e.lat !== 'number' || typeof e.lon !== 'number') return null;
    out.lat = e.lat;
    out.lon = e.lon;
  } else if (e.center) out.center = { lat: e.center.lat, lon: e.center.lon };
  else return null;
  if (e.timestamp) out.timestamp = e.timestamp;
  if (e.version != null) out.version = e.version;
  if (e.tags) out.tags = e.tags;
  return out;
}

const pt = (e: El) => (e.type === 'node' ? { lat: e.lat!, lon: e.lon! } : e.center!);
const cellOf = (p: { lat: number; lon: number }) => FETCH_CELLS.find((c) => p.lon >= c.bbox[0] && p.lon < c.bbox[2] && p.lat >= c.bbox[1] && p.lat < c.bbox[3])?.code ?? null;

async function fetchCell(code: string, bbox: [number, number, number, number]): Promise<{ elements: El[]; upstream: string | null }> {
  const cached = CACHE ? join(CACHE, `${code}.json`) : null;
  let text: string;
  if (cached && existsSync(cached)) text = readFileSync(cached, 'utf8');
  else {
    let last: Error | null = null;
    let got: string | null = null;
    for (const endpoint of ENDPOINTS) {
      try {
        got = await overpassRequest(query(bbox), { endpoint, timeoutMs: 240_000, maxRetries: 1, maxBytes: 400_000_000 });
        break;
      } catch (e) {
        last = e as Error;
        console.warn(`${code}: ${new URL(endpoint).hostname} failed: ${last.message}`);
      }
    }
    if (got == null) throw last ?? new Error('no endpoint answered');
    text = got;
    if (cached) {
      mkdirSync(dirname(cached), { recursive: true });
      writeFileSync(cached, text);
    }
  }
  const raw = JSON.parse(text) as { elements?: OsmElement[]; osm3s?: { timestamp_osm_base?: string }; remark?: string };
  if (!Array.isArray(raw.elements)) throw new Error('unexpected response');
  if (raw.remark && /runtime error|timed out|out of memory/i.test(raw.remark)) throw new Error(`Overpass remark: ${raw.remark}`);
  // Keep only elements whose point lies in this cell, so neighbouring cells never double-count.
  const inside = (e: El) => {
    const p = pt(e);
    return p.lon >= bbox[0] && p.lon < bbox[2] && p.lat >= bbox[1] && p.lat < bbox[3];
  };
  return { elements: (raw.elements.map((e) => slim(e, code)).filter(Boolean) as El[]).filter(inside), upstream: raw.osm3s?.timestamp_osm_base ?? null };
}

async function previousElements(): Promise<{ byRegion: Map<string, El[]>; manifest: SiteManifest | null }> {
  const byRegion = new Map<string, El[]>();
  if (!PREVIOUS) return { byRegion, manifest: null };
  try {
    const m = SiteManifest.parse(await (await fetch(`${PREVIOUS}/v1/manifest.json`)).json());
    for (const t of m.tiles) {
      const tile = TileFile.parse(await (await fetch(`${PREVIOUS}/v1/${t.path}`)).json());
      for (const e of tile.elements as El[]) {
        // Elements from older builds (or other fetch layouts) are re-assigned to their grid cell by location.
        const code = e.r && FETCH_CELLS.some((c) => c.code === e.r) ? e.r : cellOf(pt(e));
        if (!code) continue;
        e.r = code;
        if (!byRegion.has(code)) byRegion.set(code, []);
        byRegion.get(code)!.push(e);
      }
    }
    console.log(`previous site: ${m.totalRecords} records in ${m.tiles.length} tiles`);
    return { byRegion, manifest: m };
  } catch (e) {
    console.warn(`previous site unavailable (${(e as Error).message}); failed states will be empty`);
    return { byRegion, manifest: null };
  }
}

function split(b: Bbox, els: El[]): { bbox: Bbox; els: El[] }[] {
  if (els.length <= MAX_ELEMENTS_PER_TILE || b[2] - b[0] <= 0.125) return els.length ? [{ bbox: b, els }] : [];
  const mx = (b[0] + b[2]) / 2;
  const my = (b[1] + b[3]) / 2;
  const quads: Bbox[] = [
    [b[0], b[1], mx, my],
    [mx, b[1], b[2], my],
    [b[0], my, mx, b[3]],
    [mx, my, b[2], b[3]],
  ];
  return quads.flatMap((q) => split(q, els.filter((e) => inCell(pt(e), q))));
}
const inCell = (p: { lat: number; lon: number }, q: Bbox) => p.lon >= q[0] && p.lon < q[2] && p.lat >= q[1] && p.lat < q[3];

function writePages(manifest: SiteManifest) {
  const staticDir = join(ROOT, 'data-site', 'static');
  for (const f of readdirSync(staticDir)) copyFileSync(join(staticDir, f), join(OUT, f));
  for (const [name, html] of Object.entries(renderPages(manifest))) writeFileSync(join(OUT, name), html);
}

async function main() {
  if (args.has('pages-only')) {
    const manifest = SiteManifest.parse(JSON.parse(readFileSync(join(OUT, 'v1', 'manifest.json'), 'utf8')));
    writePages(manifest);
    console.log(`pages re-rendered for ${manifest.totalRecords} records -> ${OUT}`);
    return;
  }
  const generatedAt = new Date().toISOString();
  const prev = await previousElements();
  const all = new Map<string, El>();
  const regionReport: SiteManifest['regions'] = [];
  let upstream: string | null = null;
  // Circuit breaker: after several consecutive cells fail on every server, stop querying for this
  // run and keep the published copy for the rest, instead of hammering struggling volunteer servers.
  const MAX_CONSECUTIVE_FAILURES = Number(args.get('max-failures') ?? 6);
  let consecutiveFailures = 0;
  for (const [i, r] of regions.entries()) {
    if (i > 0 && PAUSE_MS && consecutiveFailures < MAX_CONSECUTIVE_FAILURES) await new Promise((res) => setTimeout(res, PAUSE_MS));
    let els: El[];
    let status: SiteManifest['regions'][number]['status'] = 'fresh';
    let fetchedAt: string | null = new Date().toISOString();
    try {
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) throw new Error('skipped: Overpass servers unavailable this run');
      const got = await fetchCell(r.code, r.bbox);
      consecutiveFailures = 0;
      els = got.elements;
      if (got.upstream && (!upstream || got.upstream < upstream)) upstream = got.upstream;
    } catch (e) {
      if (!/^skipped:/.test((e as Error).message)) consecutiveFailures++;
      const kept = prev.byRegion.get(r.code) ?? [];
      els = kept;
      status = kept.length ? 'kept-previous' : 'missing';
      fetchedAt = prev.manifest?.regions.find((x) => x.code === r.code)?.fetchedAt ?? null;
      console.warn(`${r.code}: fetch failed (${(e as Error).message}); ${status} (${kept.length} elements)`);
    }
    for (const e of els) {
      const k = `${e.type}/${e.id}`;
      const cur = all.get(k);
      if (!cur || (e.version ?? 0) > (cur.version ?? 0)) all.set(k, e);
    }
    regionReport.push({ code: r.code, name: areaName((r.bbox[1] + r.bbox[3]) / 2, (r.bbox[0] + r.bbox[2]) / 2), count: els.length, status, fetchedAt });
    console.log(`${r.code} [${i + 1}/${regions.length}]: ${els.length} elements (${status})`);
  }

  // Group into 1° cells, then split dense cells.
  const cells = new Map<string, El[]>();
  for (const e of all.values()) {
    const p = pt(e);
    const k = `${Math.floor(p.lat)}_${Math.floor(p.lon)}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k)!.push(e);
  }
  const tiles: { bbox: Bbox; els: El[] }[] = [];
  for (const [k, els] of cells) {
    const [lat, lon] = k.split('_').map(Number);
    tiles.push(...split([lon, lat, lon + 1, lat + 1], els));
  }

  if (existsSync(OUT)) rmSync(OUT, { recursive: true });
  mkdirSync(join(OUT, 'v1', 'tiles'), { recursive: true });
  const entries: TileEntry[] = [];
  for (const t of tiles.sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0])) {
    const id = tileId(t.bbox);
    const els = t.els.sort((a, b) => a.type.localeCompare(b.type) || a.id - b.id);
    const file = TileFile.parse({ schemaVersion: SITE_SCHEMA_VERSION, id, bbox: t.bbox, generatedAt: generatedAt.slice(0, 10), upstreamTimestamp: null, attribution: OSM_ATTRIBUTION, license: 'ODbL-1.0', elements: els });
    // generatedAt is day-granular and upstream time lives in the manifest, so unchanged tiles keep their hash within a day.
    const text = JSON.stringify(file);
    writeFileSync(join(OUT, 'v1', 'tiles', `${id}.json`), text);
    const c = { lat: (t.bbox[1] + t.bbox[3]) / 2, lon: (t.bbox[0] + t.bbox[2]) / 2 };
    entries.push({ id, bbox: t.bbox, path: `tiles/${id}.json`, count: els.length, bytes: Buffer.byteLength(text), sha256: sha256Hex(text), name: areaName(c.lat, c.lon) });
  }
  const manifest = SiteManifest.parse({
    schemaVersion: SITE_SCHEMA_VERSION,
    generatedAt,
    upstreamTimestamp: upstream,
    provider: 'OpenStreetMap via Overpass API (2° grid queries)',
    license: 'ODbL-1.0',
    attribution: OSM_ATTRIBUTION,
    licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    normalizationVersion: NORMALIZATION_VERSION,
    totalRecords: all.size,
    regions: regionReport,
    tiles: entries,
  });
  writeFileSync(join(OUT, 'v1', 'manifest.json'), JSON.stringify(manifest, null, 1));

  writePages(manifest);

  const failed = regionReport.filter((r) => r.status !== 'fresh');
  console.log(`site built: ${all.size} records, ${entries.length} tiles, ${failed.length} cell(s) not fresh${failed.length ? ` (${failed.map((r) => r.code).join(', ')})` : ''} -> ${OUT}`);
  if (failed.some((r) => r.status === 'missing') && process.env.REQUIRE_COMPLETE === '1') process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
