/**
 * Public camera dataset store. Separate from the private notebook (spec §13).
 * - Bundled region: real OSM extract for Fairfield, CT (tools/ingest), shipped read-only.
 * - Downloaded areas: user-triggered, bounded Overpass queries for the area on screen.
 * - Refresh: on failure the last-known-good dataset is kept and labelled stale.
 *   Missing records are flagged, never marked removed.
 * - Demo data lives only in demo mode and is never mixed into this store.
 */
import type { KvBackend } from './kv.types';
import { CameraInstallation, Claim, DataRegionManifest, Source } from '../domain/schemas';
import { buildOverpassQuery, mergeRegion, normalizeOsm, NORMALIZATION_VERSION, OSM_ATTRIBUTION, type OsmElement } from '../domain/osm';
import { sha256Hex } from '../domain/hash';
import { overpassRequest, OVERPASS_ENDPOINT, type OverpassOptions } from './overpass';
import bundledRegion from '../../content/regions/fairfield-ct/region.json';
import bundledManifest from '../../content/regions/fairfield-ct/manifest.json';

export { OVERPASS_ENDPOINT };

export interface RegionData {
  manifest: DataRegionManifest;
  installations: CameraInstallation[];
  sources: Source[];
  claims: Claim[];
}

export type Bbox = [number, number, number, number];

export const BUNDLED_REGION_ID = 'fairfield-ct';
const INDEX_KEY = 'regions/index';
/** Largest area one download may cover, per side (≈ 25 km at U.S. latitudes). */
export const MAX_AREA_SIDE_DEG = 0.25;

export function loadBundled(): RegionData {
  const r = bundledRegion as unknown as { installations: unknown[]; sources: unknown[]; claims: unknown[] };
  return {
    manifest: DataRegionManifest.parse({ ...(bundledManifest as object), status: (bundledManifest as { status?: string }).status ?? 'current', lastError: null }),
    installations: r.installations.map((x) => CameraInstallation.parse(x)),
    sources: r.sources.map((x) => Source.parse(x)),
    claims: r.claims.map((x) => Claim.parse(x)),
  };
}

function parseRegion(json: string): RegionData {
  const p = JSON.parse(json) as RegionData;
  return { manifest: DataRegionManifest.parse(p.manifest), installations: p.installations.map((x) => CameraInstallation.parse(x)), sources: p.sources.map((x) => Source.parse(x)), claims: p.claims.map((x) => Claim.parse(x)) };
}

export function bboxContains(b: Bbox, p: { lat: number; lon: number }): boolean {
  return p.lon >= b[0] && p.lon <= b[2] && p.lat >= b[1] && p.lat <= b[3];
}

/** Clamp a viewport to a downloadable area around its centre; null if the input is invalid. */
export function downloadableBbox(view: Bbox): Bbox | null {
  const [w, s, e, n] = view;
  if (![w, s, e, n].every(Number.isFinite) || !(w < e && s < n)) return null;
  const cx = (w + e) / 2;
  const cy = (s + n) / 2;
  const hw = Math.min(e - w, MAX_AREA_SIDE_DEG) / 2;
  const hh = Math.min(n - s, MAX_AREA_SIDE_DEG) / 2;
  const r = (x: number) => Math.round(x * 1e4) / 1e4;
  return [r(Math.max(-180, cx - hw)), r(Math.max(-90, cy - hh)), r(Math.min(180, cx + hw)), r(Math.min(90, cy + hh))];
}

export class PublicData {
  regions: RegionData[] = [];
  constructor(private kv: KvBackend) {}

  async init() {
    await this.kv.init();
    let bundled: RegionData | null = null;
    const saved = await this.kv.get(`region/${BUNDLED_REGION_ID}`);
    if (saved) {
      try {
        bundled = parseRegion(saved);
      } catch {
        bundled = null; // corrupt cache: fall back to bundled data, never to demo pins
      }
    }
    const extra: RegionData[] = [];
    for (const id of await this.areaIds()) {
      const raw = await this.kv.get(`region/${id}`);
      if (!raw) continue;
      try {
        extra.push(parseRegion(raw));
      } catch {
        // A corrupt downloaded area is skipped; the user can download it again.
      }
    }
    this.regions = [bundled ?? loadBundled(), ...extra];
  }

  private async areaIds(): Promise<string[]> {
    try {
      const v = JSON.parse((await this.kv.get(INDEX_KEY)) ?? '[]');
      return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  /** Overlapping areas can hold the same OSM element; the most recently fetched copy wins. */
  get installations() {
    const byId = new Map<string, CameraInstallation>();
    for (const r of this.regions) for (const i of r.installations) {
      const prev = byId.get(i.id);
      if (!prev || prev.fetchedAt < i.fetchedAt) byId.set(i.id, i);
    }
    return [...byId.values()];
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
  /** Whether any loaded region's bounding box contains this point. */
  covers(p: { lat: number; lon: number }) {
    return this.regions.some((r) => bboxContains(r.manifest.bbox as Bbox, p));
  }

  private async fetchArea(bbox: Bbox, regionId: string, o: OverpassOptions) {
    const query = buildOverpassQuery(bbox);
    const text = await overpassRequest(query, o);
    let raw: { elements?: OsmElement[]; osm3s?: { timestamp_osm_base?: string } };
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error('The provider response was not valid JSON');
    }
    if (!Array.isArray(raw.elements)) throw new Error('The provider response was not in the expected format');
    const fetchedAt = new Date().toISOString();
    const norm = normalizeOsm(raw.elements, { fetchedAt, regionId, endpoint: OVERPASS_ENDPOINT });
    return { text, query, raw, fetchedAt, norm };
  }

  /** User-triggered download of the area on screen (clamped to MAX_AREA_SIDE_DEG). Never automatic. */
  async downloadArea(view: Bbox, name: string, o: OverpassOptions = {}): Promise<{ ok: true; region: RegionData } | { ok: false; error: string }> {
    const bbox = downloadableBbox(view);
    if (!bbox) return { ok: false, error: 'This map area is not valid for a download.' };
    const id = `area-${bbox.map((n) => n.toFixed(3)).join('_').replace(/-/g, 'm').replace(/\./g, 'p')}`;
    try {
      const { text, query, raw, fetchedAt, norm } = await this.fetchArea(bbox, id, o);
      const region: RegionData = {
        manifest: DataRegionManifest.parse({
          id,
          name: name.slice(0, 80),
          bbox,
          provider: 'OpenStreetMap via Overpass API',
          endpoint: OVERPASS_ENDPOINT,
          query,
          fetchedAt,
          upstreamTimestamp: raw.osm3s?.timestamp_osm_base ?? null,
          recordCount: norm.installations.length,
          bytes: text.length,
          sha256: sha256Hex(text),
          attribution: OSM_ATTRIBUTION,
          licenseId: 'ODbL-1.0',
          normalizationVersion: NORMALIZATION_VERSION,
          status: 'current',
          lastError: null,
        }),
        installations: norm.installations,
        sources: norm.sources,
        claims: norm.claims,
      };
      const ids = (await this.areaIds()).filter((x) => x !== id);
      await this.kv.commit([
        { type: 'put', key: `region/${id}`, value: JSON.stringify(region) },
        { type: 'put', key: INDEX_KEY, value: JSON.stringify([...ids, id]) },
      ]);
      this.regions = [...this.regions.filter((r) => r.manifest.id !== id), region];
      return { ok: true, region };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /** User-triggered refresh. Never called automatically; disabled in offline-only mode by the caller. */
  async refresh(regionId: string, o: OverpassOptions = {}): Promise<{ ok: boolean; added: number; updated: number; missing: number; error?: string }> {
    const idx = this.regions.findIndex((r) => r.manifest.id === regionId);
    if (idx < 0) return { ok: false, added: 0, updated: 0, missing: 0, error: 'Unknown region' };
    const cur = this.regions[idx];
    try {
      const { text, raw, fetchedAt, norm } = await this.fetchArea(cur.manifest.bbox as Bbox, regionId, o);
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
      const msg = (e as Error).message;
      this.regions[idx] = { ...cur, manifest: { ...cur.manifest, status: 'refreshFailed', lastError: msg } };
      return { ok: false, added: 0, updated: 0, missing: 0, error: msg };
    }
  }

  /** Bundled region: drop the refreshed copy. Downloaded area: delete it entirely. Notebook untouched. */
  async resetRegion(regionId: string) {
    if (regionId === BUNDLED_REGION_ID) {
      await this.kv.commit([{ type: 'del', key: `region/${regionId}` }]);
    } else {
      const ids = (await this.areaIds()).filter((x) => x !== regionId);
      await this.kv.commit([
        { type: 'del', key: `region/${regionId}` },
        { type: 'put', key: INDEX_KEY, value: JSON.stringify(ids) },
      ]);
    }
    await this.init();
  }
}
