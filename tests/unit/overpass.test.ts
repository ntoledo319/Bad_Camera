import { describe, it, expect } from 'vitest';
import { overpassRequest, retryAfterMs, backoffMs } from '../../src/data/overpass';
import { downloadableBbox, MAX_AREA_SIDE_DEG, PublicData } from '../../src/data/publicData';
import { MemoryKv } from '../../src/data/kv.types';

const res = (status: number, body = '', headers: Record<string, string> = {}) => new Response(body, { status, headers });
const noSleep = async () => {};

describe('Overpass client (spec §9 upstream rules)', () => {
  it('retries 429/5xx with backoff, honours Retry-After, and stops after 3 retries', async () => {
    const waits: number[] = [];
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return res(calls === 1 ? 429 : 503, '', calls === 1 ? { 'Retry-After': '7' } : {});
    }) as typeof fetch;
    await expect(overpassRequest('q', { fetchImpl, sleep: async (ms) => void waits.push(ms), random: () => 0 })).rejects.toThrow(/after 4 attempts/);
    expect(calls).toBe(4);
    expect(waits).toEqual([7000, 2000, 4000]);
  });

  it('returns the body on success and does not retry client errors', async () => {
    let calls = 0;
    const ok = (async () => (calls++, res(200, '{"elements":[]}'))) as typeof fetch;
    expect(await overpassRequest('q', { fetchImpl: ok, sleep: noSleep })).toBe('{"elements":[]}');
    const bad = (async () => (calls++, res(400))) as typeof fetch;
    await expect(overpassRequest('q', { fetchImpl: bad, sleep: noSleep })).rejects.toThrow(/HTTP 400/);
    expect(calls).toBe(2);
  });

  it('enforces the response-size ceiling and allows only one request in flight', async () => {
    const big = (async () => res(200, 'x'.repeat(50))) as typeof fetch;
    await expect(overpassRequest('q', { fetchImpl: big, maxBytes: 10, sleep: noSleep })).rejects.toThrow(/larger than/);
    let release!: () => void;
    const slow = (() => new Promise<Response>((r) => (release = () => r(res(200, '{}'))))) as typeof fetch;
    const first = overpassRequest('q', { fetchImpl: slow, sleep: noSleep });
    await expect(overpassRequest('q', { fetchImpl: slow, sleep: noSleep })).rejects.toThrow(/already running/);
    release();
    await first;
  });

  it('times out a hung request and reports cancellation', async () => {
    const hang = ((_u: string, init: RequestInit) => new Promise<Response>((_r, rej) => init.signal!.addEventListener('abort', () => rej(new Error('aborted'))))) as unknown as typeof fetch;
    await expect(overpassRequest('q', { fetchImpl: hang, timeoutMs: 10, maxRetries: 0, sleep: noSleep })).rejects.toThrow(/No answer within/);
    const ctl = new AbortController();
    const p = overpassRequest('q', { fetchImpl: hang, signal: ctl.signal, sleep: noSleep });
    ctl.abort();
    await expect(p).rejects.toThrow(/canceled/);
  });

  it('parses and caps Retry-After; backoff grows with jitter', () => {
    expect(retryAfterMs('3')).toBe(3000);
    expect(retryAfterMs('99999')).toBe(60000);
    expect(retryAfterMs(null)).toBeNull();
    expect(backoffMs(0, () => 0)).toBe(1000);
    expect(backoffMs(3, () => 0.999)).toBeLessThan(8500);
  });
});

describe('downloaded areas', () => {
  it('clamps a large viewport to a bounded area around its centre', () => {
    const b = downloadableBbox([-75, 40, -73, 42])!;
    expect(b[2] - b[0]).toBeCloseTo(MAX_AREA_SIDE_DEG, 5);
    expect((b[0] + b[2]) / 2).toBeCloseTo(-74, 5);
    expect(downloadableBbox([1, 1, 0, 0])).toBeNull();
  });

  it('stores a real-shaped response as its own region, keeps source IDs, and survives restart', async () => {
    const kv = new MemoryKv();
    const pd = new PublicData(kv);
    await pd.init();
    const body = JSON.stringify({
      osm3s: { timestamp_osm_base: '2026-10-06T10:00:00Z' },
      elements: [{ type: 'node', id: 42, lat: 41.31, lon: -72.93, version: 3, timestamp: '2026-01-01T00:00:00Z', tags: { man_made: 'surveillance', 'surveillance:type': 'ALPR', manufacturer: 'Flock Safety' } }],
    });
    const fetchImpl = (async () => res(200, body)) as typeof fetch;
    const r = await pd.downloadArea([-73.0, 41.25, -72.85, 41.35], 'Near New Haven, Connecticut', { fetchImpl, sleep: noSleep });
    expect(r.ok).toBe(true);
    expect(pd.covers({ lat: 41.31, lon: -72.93 })).toBe(true);
    const inst = pd.installation('osm-node-42');
    expect(inst?.category).toBe('alpr');
    const again = new PublicData(kv);
    await again.init();
    expect(again.regions).toHaveLength(2);
    expect(again.installation('osm-node-42')).not.toBeNull();
    await again.resetRegion(again.regions[1].manifest.id);
    expect(again.regions).toHaveLength(1);
    expect(again.installation('osm-node-42')).toBeNull();
  });

  it('a failed download leaves existing data untouched', async () => {
    const pd = new PublicData(new MemoryKv());
    await pd.init();
    const before = pd.installations.length;
    const r = await pd.downloadArea([-73.0, 41.25, -72.85, 41.35], 'x', { fetchImpl: (async () => res(400)) as typeof fetch, sleep: noSleep });
    expect(r.ok).toBe(false);
    expect(pd.regions).toHaveLength(1);
    expect(pd.installations.length).toBe(before);
  });
});
