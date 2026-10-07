import { describe, it, expect } from 'vitest';
import { PublicData } from '../../src/data/publicData';
import { MemoryKv } from '../../src/data/kv.types';
import { sha256Hex } from '../../src/domain/hash';
import { tileId, tilesForView, type SiteManifest, type TileFile } from '../../src/domain/tiles';

const HOST = 'https://example-data.test';
const noSleep = async () => {};

function site(elements: TileFile['elements'], tamper = false) {
  const bbox: [number, number, number, number] = [-73, 41, -72, 42];
  const id = tileId(bbox);
  const tile: TileFile = { schemaVersion: 1, id, bbox, generatedAt: '2026-10-06', upstreamTimestamp: null, attribution: '© OpenStreetMap contributors (ODbL 1.0)', license: 'ODbL-1.0', elements };
  const text = JSON.stringify(tile);
  const manifest: SiteManifest = {
    schemaVersion: 1,
    generatedAt: '2026-10-06T00:00:00.000Z',
    upstreamTimestamp: '2026-10-05T23:00:00Z',
    provider: 'test',
    license: 'ODbL-1.0',
    attribution: '© OpenStreetMap contributors (ODbL 1.0)',
    licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    normalizationVersion: 'osm-norm-1',
    totalRecords: elements.length,
    regions: [{ code: 'CT', name: 'Connecticut', count: elements.length, status: 'fresh', fetchedAt: null }],
    tiles: [{ id, bbox, path: `tiles/${id}.json`, count: elements.length, bytes: text.length, sha256: sha256Hex(text), name: 'New Haven, Connecticut area' }],
  };
  const served = tamper ? text.replace('Flock', 'Fl0ck') : text;
  let tileRequests = 0;
  const fetchImpl = (async (url: string) => {
    if (url === `${HOST}/v1/manifest.json`) return new Response(JSON.stringify(manifest));
    if (url === `${HOST}/v1/tiles/${id}.json`) return (tileRequests++, new Response(served));
    return new Response('nope', { status: 404 });
  }) as typeof fetch;
  return { manifest, fetchImpl, id, tileRequests: () => tileRequests };
}

const node = (id: number, lat: number, lon: number, version = 1) => ({ type: 'node' as const, id, lat, lon, version, timestamp: '2026-01-01T00:00:00Z', tags: { man_made: 'surveillance', 'surveillance:type': 'ALPR', manufacturer: 'Flock Safety' } });

describe('hosted camera-data tiles', () => {
  it('downloads the tiles for a view, normalizes them, labels the source and survives restart', async () => {
    const kv = new MemoryKv();
    const pd = new PublicData(kv);
    await pd.init();
    const s = site([node(1, 41.3, -72.9), node(2, 41.31, -72.91)]);
    const r = await pd.downloadFromHost([-73.0, 41.25, -72.85, 41.35], 'x', { host: HOST, fetchImpl: s.fetchImpl, sleep: noSleep });
    expect(r).toMatchObject({ ok: true, tiles: 1, records: 2 });
    const inst = pd.installation('osm-node-1')!;
    expect(inst.category).toBe('alpr');
    expect(pd.source(inst.geometry!.sourceId!)!.retrievalMethod).toMatch(/Sightline data site/);
    expect(pd.covers({ lat: 41.6, lon: -72.5 })).toBe(true);
    const again = new PublicData(kv);
    await again.init();
    expect(again.installation('osm-node-2')).not.toBeNull();
  });

  it('rejects a tile whose bytes do not match the published checksum and saves nothing', async () => {
    const pd = new PublicData(new MemoryKv());
    await pd.init();
    const s = site([node(1, 41.3, -72.9)], true);
    const r = await pd.downloadFromHost([-73.0, 41.25, -72.85, 41.35], 'x', { host: HOST, fetchImpl: s.fetchImpl, sleep: noSleep });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/checksum/);
    expect(pd.regions).toHaveLength(1);
  });

  it('does not re-download unchanged tiles; refresh merges changes and flags, never deletes, missing records', async () => {
    const pd = new PublicData(new MemoryKv());
    await pd.init();
    const s1 = site([node(1, 41.3, -72.9), node(2, 41.31, -72.91)]);
    await pd.downloadFromHost([-73.0, 41.25, -72.85, 41.35], 'x', { host: HOST, fetchImpl: s1.fetchImpl, sleep: noSleep });
    const again = await pd.downloadFromHost([-73.0, 41.25, -72.85, 41.35], 'x', { host: HOST, fetchImpl: s1.fetchImpl, sleep: noSleep });
    expect(again).toMatchObject({ ok: true, skipped: 1 });
    expect(s1.tileRequests()).toBe(1);
    const s2 = site([node(1, 41.3, -72.9, 2), node(3, 41.32, -72.92)]);
    const r = await pd.refresh(s2.id, { host: HOST, fetchImpl: s2.fetchImpl, sleep: noSleep } as never);
    expect(r).toMatchObject({ ok: true, added: 1, missing: 1 });
    expect(pd.installation('osm-node-2')).not.toBeNull();
  });

  it('remembers an empty covered area so the download prompt does not repeat', async () => {
    const pd = new PublicData(new MemoryKv());
    await pd.init();
    const s = site([node(1, 41.3, -72.9)]);
    const r = await pd.downloadFromHost([-100.2, 40.0, -100.0, 40.2], 'Empty plains', { host: HOST, fetchImpl: s.fetchImpl, sleep: noSleep });
    expect(r).toMatchObject({ ok: true, tiles: 0, records: 0 });
    expect(pd.covers({ lat: 40.1, lon: -100.1 })).toBe(true);
  });

  it('tilesForView returns intersecting tiles nearest first', () => {
    const s = site([node(1, 41.3, -72.9)]);
    expect(tilesForView(s.manifest, [-72.5, 41.5, -72.4, 41.6]).map((t) => t.id)).toEqual([s.id]);
    expect(tilesForView(s.manifest, [-80, 30, -79, 31])).toEqual([]);
  });
});
