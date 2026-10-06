/** UI formatting helpers. Source edit time and in-person observation time never share a label. */
import type { CameraInstallation, Claim, Observation } from '../domain/schemas';
import { describeDistance, type ReferencePoint, type Units } from '../domain/distance';
import { CATEGORY_LABEL } from '../domain/projection';
import { MANUFACTURER_LABEL } from '../../content/catalog/catalog';
import { sourceStatusOf } from '../domain/filters';

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
  return m ? `${cat} · ${m} reported` : cat;
}

export function placeLabelOf(i: CameraInstallation): string {
  const t = i.rawTags ?? {};
  const named = t['name'] || t['addr:street'] || t['description'];
  if (named) return named.length > 60 ? `${named.slice(0, 57)}…` : named;
  if (!i.geometry) return 'No mapped coordinates';
  return `Near ${i.geometry.lat.toFixed(4)}, ${i.geometry.lon.toFixed(4)}`;
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
  const fam = o.identificationLevel !== 'unknown' && o.selectedFamilyId ? ` · possible ${o.selectedFamilyId}` : '';
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
