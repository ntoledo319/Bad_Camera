#!/usr/bin/env tsx
/**
 * Bounded OSM surveillance ingestion (development tool).
 *
 *   npx tsx tools/ingest/ingest.ts --region fairfield-ct --name "Fairfield, CT" \
 *       --bbox -73.330,41.115,-73.195,41.225 [--input saved-overpass.json] [--endpoint URL]
 *
 * - One bounded Overpass request (≤0.5° per side), identifying User-Agent, no retries loop.
 * - Writes content/regions/<id>/{region.json, manifest.json, ATTRIBUTION.txt, ingestion-log.json, raw-overpass.json}
 * - Never marks records removed; previous region (if present) is merged with mergeRegion().
 * - Production should use an owner-configured static extract host, not public Overpass from every phone.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeOsm, buildOverpassQuery, mergeRegion, NORMALIZATION_VERSION, OSM_ATTRIBUTION, type OsmElement } from '../../src/domain/osm';
import { sha256Hex } from '../../src/domain/hash';
import { DataRegionManifest } from '../../src/domain/schemas';

const UA = 'Sightline-ingest/0.1 (open-source dev tool; https://github.com/ntoledo319/Bad_Camera)';

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

async function main() {
  const regionId = arg('region', 'fairfield-ct')!;
  if (!/^[a-z0-9-]{2,40}$/.test(regionId)) throw new Error('region id must be kebab-case');
  const name = arg('name', 'Fairfield, CT')!;
  const bbox = (arg('bbox', '-73.330,41.115,-73.195,41.225')!.split(',').map(Number) as [number, number, number, number]);
  const endpoint = arg('endpoint', 'https://overpass-api.de/api/interpreter')!;
  const input = arg('input');
  const outDir = join(process.cwd(), 'content', 'regions', regionId);
  const query = buildOverpassQuery(bbox);
  const log: string[] = [`query: ${query}`, `endpoint: ${input ? `(offline input ${input})` : endpoint}`];

  let rawText: string;
  let fetchedAt = new Date().toISOString();
  if (input) {
    rawText = readFileSync(input, 'utf8');
    log.push('mode: offline replay of saved Overpass response');
  } else {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
    });
    log.push(`http: ${res.status}`);
    if (!res.ok) throw new Error(`Overpass returned HTTP ${res.status}`);
    rawText = await res.text();
    fetchedAt = new Date().toISOString();
  }
  const raw = JSON.parse(rawText) as { elements: OsmElement[]; osm3s?: { timestamp_osm_base?: string } };
  if (!Array.isArray(raw.elements)) throw new Error('Unexpected Overpass payload');
  const norm = normalizeOsm(raw.elements, { fetchedAt, regionId, endpoint });

  let installations = norm.installations;
  let merge = { added: installations.length, updated: 0, missing: [] as string[] };
  const prevPath = join(outDir, 'region.json');
  if (existsSync(prevPath)) {
    const prev = JSON.parse(readFileSync(prevPath, 'utf8'));
    const m = mergeRegion(prev.installations ?? [], installations);
    installations = m.merged;
    merge = { added: m.added, updated: m.updated, missing: m.missing };
  }
  installations.sort((a, b) => a.id.localeCompare(b.id));

  const region = {
    regionId,
    normalizationVersion: NORMALIZATION_VERSION,
    attribution: OSM_ATTRIBUTION,
    installations,
    sources: norm.sources.sort((a, b) => a.id.localeCompare(b.id)),
    claims: norm.claims.sort((a, b) => a.id.localeCompare(b.id)),
  };
  const regionText = JSON.stringify(region);
  const manifest = DataRegionManifest.parse({
    id: regionId,
    name,
    bbox,
    provider: 'OpenStreetMap via Overpass API',
    endpoint,
    query,
    fetchedAt,
    upstreamTimestamp: raw.osm3s?.timestamp_osm_base ?? null,
    recordCount: installations.length,
    bytes: Buffer.byteLength(regionText),
    sha256: sha256Hex(regionText),
    attribution: OSM_ATTRIBUTION,
    licenseId: 'ODbL-1.0',
    normalizationVersion: NORMALIZATION_VERSION,
    status: 'current',
    lastError: null,
    isDemo: false,
  });
  const counts: Record<string, number> = {};
  for (const i of installations) counts[i.category] = (counts[i.category] ?? 0) + 1;
  log.push(`elements: ${raw.elements.length}`, `installations: ${installations.length}`, `skipped: ${norm.skipped.length}`, `byCategory: ${JSON.stringify(counts)}`, `merge: ${JSON.stringify({ ...merge, missing: merge.missing.length })}`);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'raw-overpass.json'), rawText);
  writeFileSync(prevPath, regionText);
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(
    join(outDir, 'ATTRIBUTION.txt'),
    `${OSM_ATTRIBUTION}\nData © OpenStreetMap contributors, available under the Open Database License (ODbL) 1.0.\nhttps://www.openstreetmap.org/copyright\nThis region file is a Derivative Database of OpenStreetMap and is offered under ODbL 1.0.\nPublic reports are incomplete: absence of a pin does not mean absence of equipment.\n`,
  );
  writeFileSync(join(outDir, 'ingestion-log.json'), JSON.stringify({ ranAt: new Date().toISOString(), rawSha256: sha256Hex(rawText), log, skipped: norm.skipped }, null, 2) + '\n');
  console.log(log.join('\n'));
  console.log(`wrote ${outDir}`);
}

main().catch((e) => {
  console.error(`ingest failed: ${e.message}`);
  process.exit(1);
});
