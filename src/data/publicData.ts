/**
 * Public camera dataset store. Separate from the private notebook (spec §13).
 * - Bundled region: real OSM extract for Fairfield, CT (tools/ingest), shipped read-only.
 * - User-triggered refresh: one bounded Overpass query; on failure the last-known-good
 *   dataset is kept and labelled stale. Missing records are flagged, never marked removed.
 * - Demo data lives only in demo mode and is never mixed into this store.
 */
import type { KvBackend } from './kv.types';
import { CameraInstallation, Claim, DataRegionManifest, Source } from '../domain/schemas';
import { buildOverpassQuery, mergeRegion, normalizeOsm, NORMALIZATION_VERSION, OSM_ATTRIBUTION, type OsmElement } from '../domain/osm';
import { sha256Hex } from '../domain/hash';
import bundledRegion from '../../content/regions/fairfield-ct/region.json';
import bundledManifest from '../../content/regions/fairfield-ct/manifest.json';

export interface RegionData {
  manifest: DataRegionManifest;
  installations: CameraInstallation[];
  sources: Source[];
  claims: Claim[];
}

export const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const UA = 'Sightline/0.1 (privacy-first camera transparency notebook; https://github.com/ntoledo319/Bad_Camera)';

export function loadBundled(): RegionData {
  const r = bundledRegion as unknown as { installations: unknown[]; sources: unknown[]; claims: unknown[] };
  return {
    manifest: DataRegionManifest.parse({ ...(bundledManifest as object), status: (bundledManifest as { status?: string }).status ?? 'current', lastError: null }),
    installations: r.installations.map((x) => CameraInstallation.parse(x)),
    sources: r.sources.map((x) => Source.parse(x)),
    claims: r.claims.map((x) => Claim.parse(x)),
  };
}

export class PublicData {
  regions: RegionData[] = [];
  constructor(private kv: KvBackend) {}

  async init() {
    await this.kv.init();
    const saved = await this.kv.get('region/fairfield-ct');
    let r: RegionData | null = null;
    if (saved) {
      try {
        const p = JSON.parse(saved) as RegionData;
        r = { manifest: DataRegionManifest.parse(p.manifest), installations: p.installations.map((x) => CameraInstallation.parse(x)), sources: p.sources.map((x) => Source.parse(x)), claims: p.claims.map((x) => Claim.parse(x)) };
      } catch {
        r = null; // corrupt cache: fall back to bundled data, never to demo pins
      }
    }
    this.regions = [r ?? loadBundled()];
  }

  get installations() {
    return this.regions.flatMap((r) => r.installations);
  }
  get sources() {
    return this.regions.flatMap((r) => r.sources);
  }
  get claims() {
    return this.regions.flatMap((r) => r.claims);
  }
  installation(id: string) {
    return this.installations.find((i) => i.id === id) ?? null;
  }
  source(id: string) {
    return this.sources.find((s) => s.id === id) ?? null;
  }
  claimsFor(subjectId: string) {
    return this.claims.filter((c) => c.subjectId === subjectId);
  }

  /** User-triggered refresh. Never called automatically; disabled in offline-only mode by the caller. */
  async refresh(regionId: string, fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<{ ok: boolean; added: number; updated: number; missing: number; error?: string }> {
    const idx = this.regions.findIndex((r) => r.manifest.id === regionId);
    if (idx < 0) return { ok: false, added: 0, updated: 0, missing: 0, error: 'Unknown region' };
    const cur = this.regions[idx];
    const query = buildOverpassQuery(cur.manifest.bbox as [number, number, number, number]);
    try {
      const res = await fetchImpl(OVERPASS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA }, body: 'data=' + encodeURIComponent(query), signal });
      if (!res.ok) throw new Error(`Provider answered HTTP ${res.status}`);
      const text = await res.text();
      const raw = JSON.parse(text) as { elements?: OsmElement[]; osm3s?: { timestamp_osm_base?: string } };
      if (!Array.isArray(raw.elements)) throw new Error('Provider response was not in the expected format');
      const fetchedAt = new Date().toISOString();
      const norm = normalizeOsm(raw.elements, { fetchedAt, regionId, endpoint: OVERPASS_ENDPOINT });
      const m = mergeRegion(cur.installations, norm.installations);
      const srcIds = new Set(norm.sources.map((s) => s.id));
      const clmIds = new Set(norm.claims.map((c) => c.id));
      const next: RegionData = {
        manifest: { ...cur.manifest, fetchedAt, upstreamTimestamp: raw.osm3s?.timestamp_osm_base ?? null, recordCount: m.merged.length, bytes: text.length, sha256: sha256Hex(text), status: 'current', lastError: null, attribution: OSM_ATTRIBUTION, normalizationVersion: NORMALIZATION_VERSION },
        installations: m.merged,
        sources: [...norm.sources, ...cur.sources.filter((s) => !srcIds.has(s.id))],
        claims: [...norm.claims, ...cur.claims.filter((c) => !clmIds.has(c.id))],
      };
      await this.kv.commit([{ type: 'put', key: `region/${regionId}`, value: JSON.stringify(next) }]);
      this.regions[idx] = next;
      return { ok: true, added: m.added, updated: m.updated, missing: m.missing.length };
    } catch (e) {
      const msg = (e as Error).name === 'AbortError' ? 'Refresh canceled' : (e as Error).message;
      this.regions[idx] = { ...cur, manifest: { ...cur.manifest, status: 'refreshFailed', lastError: msg } };
      return { ok: false, added: 0, updated: 0, missing: 0, error: msg };
    }
  }

  /** Delete cached refresh; bundled extract remains as the baseline. */
  async resetRegion(regionId: string) {
    await this.kv.commit([{ type: 'del', key: `region/${regionId}` }]);
    await this.init();
  }
}
