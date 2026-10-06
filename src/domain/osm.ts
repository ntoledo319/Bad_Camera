/**
 * OpenStreetMap surveillance normalizer. Pure and deterministic.
 * Normalization rules are versioned and documented in docs/SOURCES.md.
 *  - man_made=surveillance + surveillance:type=ALPR  -> alpr
 *  - man_made=surveillance + surveillance:type=camera -> video
 *  - man_made=surveillance + surveillance:type=gunshot_detector -> acoustic
 *  - highway=speed_camera (separate adapter)          -> enforcement
 *  - anything else / missing                          -> unknown (NEVER defaults to ALPR)
 *  - Ways/relations: geometry only from Overpass `center`, labelled relation_centroid with
 *    no precision; these are flagged and not treated as exact physical coordinates.
 */
import { CameraInstallation, Claim, Source, SCHEMA_VERSION, type Category, type DeploymentMode } from './schemas';
import { sha256Hex } from './hash';

export const NORMALIZATION_VERSION = 'osm-norm-1';
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors (ODbL 1.0)';

export interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  timestamp?: string;
  version?: number;
  tags?: Record<string, string>;
}

const TYPE_SYNONYMS: Record<string, Category> = {
  alpr: 'alpr',
  anpr: 'alpr',
  lpr: 'alpr',
  camera: 'video',
  gunshot_detector: 'acoustic',
};

/** Manufacturer tag -> catalog manufacturer id. Unknown manufacturers stay as raw text claims only. */
const MANUFACTURER_MAP: Record<string, string> = {
  'flock safety': 'flock',
  flock: 'flock',
  'axon enterprise': 'axon',
  axon: 'axon',
  'axis communications': 'axis',
  axis: 'axis',
  rekor: 'rekor',
  leonardo: 'leonardo',
  'leonardo drs': 'leonardo',
  elsag: 'leonardo',
  'motorola solutions': 'motorola',
  vigilant: 'motorola',
  'vigilant solutions': 'motorola',
  genetec: 'genetec',
  neology: 'neology',
  jenoptik: 'jenoptik',
  'hanwha vision': 'hanwha',
  'hanwha techwin': 'hanwha',
  'verra mobility': 'verra',
  'sensys gatso': 'sensys-gatso',
  soundthinking: 'soundthinking',
  shotspotter: 'soundthinking',
};

export function normalizeCategory(tags: Record<string, string>): Category {
  if (tags['highway'] === 'speed_camera' || tags['enforcement']) return 'enforcement';
  if (tags['man_made'] !== 'surveillance') return 'unknown';
  const t = (tags['surveillance:type'] ?? '').trim().toLowerCase();
  return TYPE_SYNONYMS[t] ?? 'unknown';
}

export function normalizeManufacturer(raw: string | undefined): string | null {
  if (!raw) return null;
  return MANUFACTURER_MAP[raw.trim().toLowerCase()] ?? null;
}

function deploymentFrom(tags: Record<string, string>): DeploymentMode {
  const ct = (tags['camera:type'] ?? '').toLowerCase();
  const mount = (tags['camera:mount'] ?? '').toLowerCase();
  if (mount.includes('trailer')) return 'trailer';
  if (mount.includes('vehicle') || ct === 'mobile') return 'vehicle_mounted';
  if (ct === 'fixed' || ct === 'dome' || ct === 'panning') return 'fixed';
  return 'unknown';
}

function parseDirections(v: string | undefined): number[] {
  if (!v) return [];
  return v
    .split(';')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 360);
}

function isoOrNull(s: string | undefined): string | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export interface NormalizedRegion {
  installations: CameraInstallation[];
  sources: Source[];
  claims: Claim[];
  skipped: { ref: string; reason: string }[];
}

export function stableInstallationId(el: Pick<OsmElement, 'type' | 'id'>): string {
  return `osm-${el.type}-${el.id}`;
}

export function normalizeOsm(elements: OsmElement[], opts: { fetchedAt: string; regionId: string; endpoint: string }): NormalizedRegion {
  const installations: CameraInstallation[] = [];
  const sources: Source[] = [];
  const claims: Claim[] = [];
  const skipped: NormalizedRegion['skipped'] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const ref = `${el.type}/${el.id}`;
    if (!el || !['node', 'way', 'relation'].includes(el.type) || !Number.isSafeInteger(el.id)) {
      skipped.push({ ref: String(ref), reason: 'invalid element identity' });
      continue;
    }
    if (seen.has(ref)) {
      skipped.push({ ref, reason: 'duplicate element in payload' });
      continue;
    }
    seen.add(ref);
    const tags = el.tags ?? {};
    const isSurv = tags['man_made'] === 'surveillance' || tags['highway'] === 'speed_camera';
    if (!isSurv) {
      skipped.push({ ref, reason: 'not a surveillance/enforcement element' });
      continue;
    }
    let lat: number | undefined;
    let lon: number | undefined;
    let method: 'source_map' | 'relation_centroid' = 'source_map';
    if (el.type === 'node') {
      lat = el.lat;
      lon = el.lon;
    } else if (el.center) {
      lat = el.center.lat;
      lon = el.center.lon;
      method = 'relation_centroid';
    }
    const validGeom =
      typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    if (!validGeom) {
      skipped.push({ ref, reason: 'missing or invalid geometry' });
      continue;
    }
    const id = stableInstallationId(el);
    const sourceId = `src-osm-${el.type}-${el.id}-v${el.version ?? 'x'}`;
    const sourceModifiedAt = isoOrNull(el.timestamp);
    const checkDate = isoOrNull(tags['check_date'] ?? tags['survey:date']);
    const category = normalizeCategory(tags);
    const manufacturerId = normalizeManufacturer(tags['manufacturer'] ?? tags['brand'] ?? tags['surveillance:brand']);

    sources.push(
      Source.parse({
        id: sourceId,
        kind: 'communityMap',
        title: `OpenStreetMap ${el.type} ${el.id}`,
        publisher: 'OpenStreetMap contributors',
        url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
        publishedAt: sourceModifiedAt,
        accessedAt: opts.fetchedAt,
        licenseId: 'ODbL-1.0',
        sourceRecordId: ref,
        sourceVersion: el.version != null ? String(el.version) : null,
        documentPageOrSection: null,
        localSnapshotPath: null,
        snapshotSha256: sha256Hex(JSON.stringify({ type: el.type, id: el.id, version: el.version, tags })),
        availability: 'available',
        attribution: OSM_ATTRIBUTION,
        retrievalMethod: `Overpass API (${opts.endpoint}), user-triggered bounded query`,
        scope: 'installation',
      }),
    );

    const mkClaim = (fieldPath: string, value: string | number | null, notes = ''): string => {
      const cid = `clm-${id}-${fieldPath.replace(/[^a-z0-9]+/gi, '_')}`;
      claims.push(
        Claim.parse({
          id: cid,
          subjectId: id,
          fieldPath,
          value,
          sourceId,
          evidenceAttachmentIds: [],
          basis: 'sourceReported',
          status: 'unreviewed',
          notes,
          validFrom: null,
          validTo: null,
          createdAt: opts.fetchedAt,
          supersedesClaimId: null,
        }),
      );
      return cid;
    };

    const sourceClaimIds: string[] = [];
    sourceClaimIds.push(mkClaim('category', category, `Derived from tags by ${NORMALIZATION_VERSION}`));
    if (tags['manufacturer']) sourceClaimIds.push(mkClaim('hardware.manufacturer', tags['manufacturer'], 'Community-reported manufacturer tag; not an operator claim.'));
    if (tags['model']) sourceClaimIds.push(mkClaim('hardware.model', tags['model']));
    if (tags['camera:mount']) sourceClaimIds.push(mkClaim('hardware.mount', tags['camera:mount']));
    if (tags['direction'] || tags['camera:direction']) sourceClaimIds.push(mkClaim('location.direction', tags['direction'] ?? tags['camera:direction']));
    if (checkDate) sourceClaimIds.push(mkClaim('observation.checkDate', checkDate, 'Published check_date/survey:date tag: last reported in-person check.'));
    sourceClaimIds.push(mkClaim('location.coordinates', `${lat},${lon}`, method === 'relation_centroid' ? 'Centroid of a way/relation — not an exact device position.' : 'Node coordinate as mapped by contributors.'));
    const operatorClaimIds = tags['operator'] ? [mkClaim('operator.name', tags['operator'], 'Community-reported operator tag. Not verified against an official record.')] : [];

    const dirs = parseDirections(tags['direction'] ?? tags['camera:direction']);
    const capabilities: CameraInstallation['capabilities'] =
      category === 'alpr' ? ['plate_recognition'] : category === 'video' ? ['video'] : category === 'acoustic' ? ['acoustic_detection'] : category === 'enforcement' ? ['speed_enforcement'] : ['unknown'];

    installations.push(
      CameraInstallation.parse({
        id,
        externalIds: [{ namespace: 'osm', elementType: el.type, id: String(el.id), version: el.version != null ? String(el.version) : null }],
        category,
        capabilities,
        manufacturerId,
        familyId: null,
        modelId: null,
        deploymentMode: deploymentFrom(tags),
        geometry: { lat, lon, precisionMeters: null, method, sourceId },
        orientations: dirs.map((d) => ({ degrees: d, trueOrMagnetic: 'unknown', sourceId, quality: 'sourceReported' })),
        operatorClaimIds,
        networkClaimIds: [],
        lifecycle: tags['disused:man_made'] || tags['removed:man_made'] ? 'removalReported' : 'reportedPresent',
        firstReportedAt: null,
        lastObservedAt: checkDate,
        sourceModifiedAt,
        fetchedAt: opts.fetchedAt,
        sourceClaimIds,
        regionIds: [opts.regionId],
        privateOverrideIds: [],
        rawTags: tags,
        schemaVersion: SCHEMA_VERSION,
      }),
    );
  }
  return { installations, sources, claims, skipped };
}

export function buildOverpassQuery(bbox: [number, number, number, number]): string {
  const [w, s, e, n] = bbox;
  if (!(w < e && s < n) || e - w > 0.5 || n - s > 0.5) throw new Error('Bounding box must be valid and at most 0.5° on each side');
  const b = `${s},${w},${n},${e}`;
  return `[out:json][timeout:25][maxsize:16777216];(nwr["man_made"="surveillance"](${b});nwr["highway"="speed_camera"](${b}););out meta center;`;
}

/**
 * Merge a refreshed region into the existing public cache.
 *  - Never touches private records (separate store).
 *  - Records missing from a refresh are retained and flagged `missingFromLatestRefresh`,
 *    never marked removed: absence on one refresh is not proof of physical removal.
 */
export function mergeRegion(
  existing: CameraInstallation[],
  incoming: CameraInstallation[],
): { merged: CameraInstallation[]; added: number; updated: number; missing: string[] } {
  const byId = new Map(existing.map((i) => [i.id, i]));
  const incomingIds = new Set(incoming.map((i) => i.id));
  let added = 0;
  let updated = 0;
  for (const inc of incoming) {
    const prev = byId.get(inc.id);
    if (!prev) added++;
    else {
      updated++;
      inc.privateOverrideIds = prev.privateOverrideIds;
    }
    byId.set(inc.id, inc);
  }
  const missing: string[] = [];
  for (const e of existing) {
    if (!incomingIds.has(e.id)) {
      missing.push(e.id);
      byId.set(e.id, { ...e, rawTags: { ...(e.rawTags ?? {}), 'sightline:missingFromLatestRefresh': 'yes' } });
    }
  }
  return { merged: [...byId.values()], added, updated, missing };
}
