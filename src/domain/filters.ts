/** Filtering shared by map and list so both views always agree (spec S04). */
import type { CameraInstallation, Category, FilterState, Claim } from './schemas';
import { haversineMeters, type LatLon } from './distance';

export const CHIP_FILTERS: { id: 'all' | Category | 'sensors'; label: string; categories: Category[] }[] = [
  { id: 'all', label: 'All', categories: [] },
  { id: 'alpr', label: 'Plate readers', categories: ['alpr'] },
  { id: 'video', label: 'Video', categories: ['video'] },
  { id: 'enforcement', label: 'Enforcement', categories: ['enforcement'] },
  { id: 'sensors', label: 'Sensors', categories: ['acoustic'] },
];

export function sourceStatusOf(inst: CameraInstallation, claims: Pick<Claim, 'subjectId' | 'status'>[] = []): 'source_backed' | 'community_reported' | 'disputed' {
  if (inst.lifecycle === 'disputed' || claims.some((c) => c.subjectId === inst.id && c.status === 'disputed')) return 'disputed';
  if (inst.externalIds.some((e) => e.namespace !== 'osm')) return 'source_backed';
  return 'community_reported';
}

export function isRemoved(inst: CameraInstallation): boolean {
  return inst.lifecycle === 'removedDocumented' || inst.lifecycle === 'removalReported';
}

export function applyFilters(items: CameraInstallation[], f: FilterState, now = Date.now(), claims: Pick<Claim, 'subjectId' | 'status'>[] = []): CameraInstallation[] {
  return items.filter((i) => {
    if (!f.includeRemoved && isRemoved(i)) return false;
    if (f.categories.length && !f.categories.includes(i.category)) return false;
    if (f.manufacturers.length && !(i.manufacturerId && f.manufacturers.includes(i.manufacturerId))) return false;
    // Vehicle-mounted records are dated sightings, not fixed infrastructure: hidden unless asked for (A09).
    const mobile = i.deploymentMode === 'vehicle_mounted';
    if (mobile && !f.deployment.includes('historical_mobile')) return false;
    if (f.deployment.length) {
      const d = i.deploymentMode === 'fixed' ? 'fixed' : i.deploymentMode === 'relocatable' || i.deploymentMode === 'trailer' ? 'relocatable' : mobile ? 'historical_mobile' : null;
      // Unknown deployment is not treated as "not fixed": it stays visible under any deployment filter.
      if (d && !f.deployment.includes(d)) return false;
    }
    if (f.sourceStatus.length && !f.sourceStatus.includes(sourceStatusOf(i, claims))) return false;
    if (f.maxObservationAgeDays != null) {
      if (!i.lastObservedAt) return false;
      if (now - Date.parse(i.lastObservedAt) > f.maxObservationAgeDays * 86400_000) return false;
    }
    return true;
  });
}

export function inBbox(i: CameraInstallation, bbox: [number, number, number, number]): boolean {
  if (!i.geometry) return false;
  const [w, s, e, n] = bbox;
  return i.geometry.lon >= w && i.geometry.lon <= e && i.geometry.lat >= s && i.geometry.lat <= n;
}

export function sortByDistance(items: CameraInstallation[], ref: LatLon | null): CameraInstallation[] {
  if (!ref) return [...items].sort((a, b) => a.id.localeCompare(b.id));
  return [...items]
    .filter((i) => i.geometry)
    .sort((a, b) => haversineMeters(ref, a.geometry!) - haversineMeters(ref, b.geometry!) || a.id.localeCompare(b.id));
}

export function activeFilterCount(f: FilterState): number {
  return (
    (f.categories.length ? 1 : 0) +
    (f.manufacturers.length ? 1 : 0) +
    (f.deployment.length ? 1 : 0) +
    (f.sourceStatus.length ? 1 : 0) +
    (f.maxObservationAgeDays != null ? 1 : 0) +
    (f.includeRemoved ? 1 : 0)
  );
}

export function filterSummary(count: number, f: FilterState): string {
  const n = activeFilterCount(f);
  return `${count} mapped ${count === 1 ? 'record' : 'records'}${n ? ` · ${n} ${n === 1 ? 'filter' : 'filters'}` : ''}`;
}
