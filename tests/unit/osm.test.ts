import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { normalizeOsm, normalizeCategory, mergeRegion, buildOverpassQuery, stableInstallationId, type OsmElement } from '../../src/domain/osm';
import { applyFilters } from '../../src/domain/filters';
import { defaultSettings } from '../../src/domain/schemas';

const opts = { fetchedAt: '2026-10-06T10:47:06.000Z', regionId: 't', endpoint: 'https://overpass.example' };

describe('A06–A10 source semantics', () => {
  it('category normalization never defaults to ALPR', () => {
    expect(normalizeCategory({ man_made: 'surveillance' })).toBe('unknown');
    expect(normalizeCategory({ man_made: 'surveillance', 'surveillance:type': 'ALPR' })).toBe('alpr');
    expect(normalizeCategory({ man_made: 'surveillance', 'surveillance:type': 'camera' })).toBe('video');
    expect(normalizeCategory({ man_made: 'surveillance', 'surveillance:type': 'gunshot_detector' })).toBe('acoustic');
    expect(normalizeCategory({ highway: 'speed_camera' })).toBe('enforcement');
  });
  it('preserves external identity, timestamps and raw tags; claims are source-reported', () => {
    const el: OsmElement = { type: 'node', id: 42, lat: 41.1, lon: -73.2, timestamp: '2025-05-01T00:00:00Z', version: 3, tags: { man_made: 'surveillance', 'surveillance:type': 'ALPR', manufacturer: 'Flock Safety', check_date: '2026-01-15', operator: 'Example PD' } };
    const r = normalizeOsm([el], opts);
    const i = r.installations[0];
    expect(i.id).toBe(stableInstallationId(el));
    expect(i.externalIds[0]).toMatchObject({ namespace: 'osm', elementType: 'node', id: '42', version: '3' });
    expect(i.lastObservedAt?.startsWith('2026-01-15')).toBe(true); // check_date, not edit timestamp
    expect(i.sourceModifiedAt?.startsWith('2025-05-01')).toBe(true);
    expect(i.fetchedAt).toBe(opts.fetchedAt);
    expect(i.rawTags?.operator).toBe('Example PD');
    expect(i.manufacturerId).toBe('flock');
    expect(r.claims.every((c) => c.basis === 'sourceReported' && c.status === 'unreviewed')).toBe(true);
    const op = r.claims.find((c) => c.fieldPath === 'operator.name');
    expect(op?.value).toBe('Example PD'); // operator is a separate claim, not inferred from manufacturer
    expect(r.sources[0].licenseId).toBe('ODbL-1.0');
  });
  it('skips non-surveillance and duplicate elements with reasons', () => {
    const els: OsmElement[] = [
      { type: 'node', id: 1, lat: 0, lon: 0, tags: { amenity: 'bench' } },
      { type: 'node', id: 2, lat: 0, lon: 0, tags: { man_made: 'surveillance' } },
      { type: 'node', id: 2, lat: 0, lon: 0, tags: { man_made: 'surveillance' } },
    ];
    const r = normalizeOsm(els, opts);
    expect(r.installations).toHaveLength(1);
    expect(r.skipped.map((s) => s.reason)).toEqual(['not a surveillance/enforcement element', 'duplicate element in payload']);
  });
  it('does not deduplicate nearby separate cameras', () => {
    const els: OsmElement[] = [
      { type: 'node', id: 10, lat: 41.1, lon: -73.2, tags: { man_made: 'surveillance', 'surveillance:type': 'ALPR' } },
      { type: 'node', id: 11, lat: 41.10001, lon: -73.20001, tags: { man_made: 'surveillance', 'surveillance:type': 'ALPR' } },
    ];
    expect(normalizeOsm(els, opts).installations).toHaveLength(2);
  });
  it('bounds Overpass queries', () => {
    expect(() => buildOverpassQuery([-74, 40, -72, 42])).toThrow();
    expect(buildOverpassQuery([-73.33, 41.115, -73.195, 41.225])).toContain('man_made');
  });
});

describe('A23 refresh cannot infer removal or overwrite private overrides', () => {
  it('flags missing records but keeps them and their lifecycle', () => {
    const a = normalizeOsm([{ type: 'node', id: 1, lat: 0, lon: 0, tags: { man_made: 'surveillance' } }, { type: 'node', id: 2, lat: 0, lon: 0, tags: { man_made: 'surveillance' } }], opts).installations;
    a[0].privateOverrideIds = ['private-note-1'];
    const b = normalizeOsm([{ type: 'node', id: 1, lat: 0, lon: 0, tags: { man_made: 'surveillance', manufacturer: 'Axis' } }], opts).installations;
    const m = mergeRegion(a, b);
    expect(m.merged).toHaveLength(2);
    const missing = m.merged.find((i) => i.id === 'osm-node-2')!;
    expect(missing.lifecycle).not.toBe('removedDocumented');
    expect(missing.rawTags?.['sightline:missingFromLatestRefresh']).toBe('yes');
    expect(m.merged.find((i) => i.id === 'osm-node-1')!.privateOverrideIds).toEqual(['private-note-1']);
  });
});

describe('real Fairfield CT region (bundled snapshot)', () => {
  const p = 'content/regions/fairfield-ct/region.json';
  it.runIf(existsSync(p))('loads, has attribution, and map/list filters agree', () => {
    const region = JSON.parse(readFileSync(p, 'utf8'));
    expect(region.installations.length).toBeGreaterThan(10);
    expect(region.attribution).toMatch(/OpenStreetMap/);
    const f = { ...defaultSettings().filters, categories: ['alpr' as const] };
    const filtered = applyFilters(region.installations, f);
    expect(filtered.every((i: { category: string }) => i.category === 'alpr')).toBe(true);
    expect(region.installations.some((i: { isDemo?: boolean }) => i.isDemo)).toBe(false);
  });
});
