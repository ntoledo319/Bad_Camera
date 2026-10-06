/** UI formatting helpers. Source edit time and in-person observation time never share a label. */
import type { CameraInstallation, Claim, Observation } from '../domain/schemas';
import { describeDistance, type ReferencePoint, type Units } from '../domain/distance';
import { CATEGORY_LABEL } from '../domain/projection';
import { CATALOG_BY_ID, MANUFACTURER_LABEL } from '../../content/catalog/catalog';
import { sourceStatusOf } from '../domain/filters';
import { haversineMeters } from '../domain/distance';
import { PLACES } from '../../content/places/places';

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return 'Not established';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not established';
  const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  if (!withTime) return date;
  return `${date}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function observedLabel(i: CameraInstallation): string {
  return i.lastObservedAt ? `Last observed ${fmtDate(i.lastObservedAt)}` : 'Observation date unknown';
}
export function sourceEditLabel(i: CameraInstallation): string {
  return i.sourceModifiedAt ? `Map record edited ${fmtDate(i.sourceModifiedAt)}` : 'Map record edit date unknown';
}

export function manufacturerName(i: CameraInstallation): string | null {
  return i.manufacturerId ? (MANUFACTURER_LABEL[i.manufacturerId] ?? i.manufacturerId) : null;
}

export function installationTitle(i: CameraInstallation): string {
  const m = manufacturerName(i);
  const cat = CATEGORY_LABEL[i.category];
  return m ? `${cat} · ${m}` : cat;
}

/** Nearest bundled neighbourhood within 2.5 km (else town within 15 km), for a human label. Navigation aid only, never evidence. */
export function nearestPlaceName(lat: number, lon: number): string | null {
  let best: { name: string; d: number } | null = null;
  for (const p of PLACES) {
    if (p.zoom < 14) continue; // neighbourhood-scale entries only; towns are too coarse
    const d = haversineMeters({ lat, lon }, p);
    if (d <= 2500 && (!best || d < best.d)) best = { name: `${p.name}, ${p.context.replace(/, CT$/, '')}`, d };
  }
  if (best) return best.name;
  // Otherwise the nearest town or city within 15 km ("Near New Haven, Connecticut").
  let city: { name: string; d: number } | null = null;
  for (const p of PLACES) {
    if (p.zoom >= 14) continue;
    const d = haversineMeters({ lat, lon }, p);
    if (d <= 15_000 && (!city || d < city.d)) city = { name: `${p.name}, ${p.context}`, d };
  }
  return city?.name ?? null;
}

export function placeLabelOf(i: CameraInstallation): string {
  const t = i.rawTags ?? {};
  const named = t['name'] || t['addr:street'] || t['description'];
  if (named) return named.length > 60 ? `${named.slice(0, 57)}…` : named;
  if (!i.geometry) return 'No mapped coordinates';
  const place = nearestPlaceName(i.geometry.lat, i.geometry.lon);
  return place ? `Near ${place}` : `Near ${i.geometry.lat.toFixed(4)}, ${i.geometry.lon.toFixed(4)}`;
}

/** Name for a downloaded area ("New Haven, Connecticut area"): nearest bundled place within 30 km, else rounded coordinates. */
export function areaName(lat: number, lon: number): string {
  let best: { name: string; d: number } | null = null;
  for (const p of PLACES) {
    const d = haversineMeters({ lat, lon }, p);
    if (d <= 30_000 && (!best || d < best.d)) best = { name: p.context.includes(',') ? `${p.name}, ${p.context.split(', ').pop()}` : `${p.name}, ${p.context}`, d };
  }
  return best ? `${best.name} area` : `Area near ${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

/** Compact distance for list rows; keeps the one qualifier that changes how to read it. */
export function distanceRowText(d: { primary: string; qualifiers: string[]; freshness: string }): string {
  const base = d.primary.replace(' · straight-line', '');
  if (d.freshness === 'last_location') return `${base} (not live)`;
  if (d.freshness === 'old') return `${base} (location fix is old)`;
  if (d.qualifiers.some((q) => q.startsWith('Approximate location'))) return `${base} (approximate)`;
  return base;
}

export const LIFECYCLE_LABEL = {
  reportedPresent: 'Reported present',
  removalReported: 'Removal reported',
  removedDocumented: 'Removal documented',
  disputed: 'Disputed',
  unknown: 'Not established',
} as const;

const CLAIM_FIELD_LABEL: Record<string, string> = {
  category: 'Equipment type',
  'hardware.manufacturer': 'Manufacturer',
  'hardware.model': 'Model',
  'hardware.mount': 'Mounting',
  'location.coordinates': 'Coordinates',
  'location.direction': 'Facing direction',
  'observation.checkDate': 'Last in-person check',
  'operator.name': 'Operator',
};

export function capitalize(v: string): string {
  return v ? v[0].toUpperCase() + v.slice(1) : v;
}

/** Human label and value for a claim. Raw values stay intact in the data and exports. */
export function claimDisplay(fieldPath: string, value: unknown): { label: string; value: string } {
  const label = CLAIM_FIELD_LABEL[fieldPath] ?? fieldPath;
  const raw = value == null ? '' : String(value);
  if (!raw) return { label, value: NOT_ESTABLISHED };
  if (fieldPath === 'category') return { label, value: CATEGORY_LABEL[raw as keyof typeof CATEGORY_LABEL] ?? raw };
  if (fieldPath === 'observation.checkDate') return { label, value: fmtDate(raw) };
  if (fieldPath === 'location.coordinates') return { label, value: raw.split(',').map((x) => Number(x).toFixed(5)).join(', ') };
  if (fieldPath === 'location.direction') return { label, value: directionLabel(raw) };
  return { label, value: /^[a-z_]+$/.test(raw) ? capitalize(raw.replace(/_/g, ' ')) : raw };
}

/** "120° (SE)" for numeric bearings; free-text directions are shown as written. */
export function directionLabel(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return `${Math.round(n)}° (${dirs[Math.round((((n % 360) + 360) % 360) / 45) % 8]})`;
}

export const SOURCE_STATUS_LABEL = { source_backed: 'Source-backed', community_reported: 'Community-reported', disputed: 'Disputed' } as const;
export function sourceBadge(i: CameraInstallation, claims: Claim[]): string {
  return SOURCE_STATUS_LABEL[sourceStatusOf(i, claims)];
}

export function distanceFor(i: CameraInstallation, ref: ReferencePoint | null, units: Units, now = Date.now()) {
  if (!ref || !i.geometry) return null;
  return describeDistance(ref, { lat: i.geometry.lat, lon: i.geometry.lon, uncertaintyM: i.geometry.precisionMeters }, units, now);
}

export function observationTitle(o: Observation): string {
  const famLabel = o.selectedFamilyId ? (CATALOG_BY_ID[o.selectedFamilyId]?.familyLabel ?? o.selectedFamilyId) : null;
  const fam = o.identificationLevel !== 'unknown' && famLabel ? ` · ${o.identificationLevel === 'exact_model' ? '' : 'possibly '}${famLabel}` : '';
  return `${CATEGORY_LABEL[o.category]}${fam}`;
}

export function claimValue(claims: Claim[], field: string): Claim | undefined {
  return claims.find((c) => c.fieldPath === field && c.status !== 'superseded');
}

export const NOT_ESTABLISHED = 'Not established';

export function bytesLabel(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function safeFileStem(s: string): string {
  return s.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'record';
}
