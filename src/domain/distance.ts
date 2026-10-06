/**
 * Distance engine. Approximate straight-line surface distance on a sphere (Haversine,
 * R = 6,371,008.8 m, the IUGG mean Earth radius). Suitable for nearby consumer display.
 * This is distance to a mapped coordinate, never distance to any camera's coverage.
 */
export const EARTH_RADIUS_M = 6_371_008.8;
export const ALGORITHM = 'haversine-r6371008.8' as const;
export const FT_PER_M = 3.280839895;
export const M_PER_MI = 1609.344;

export interface LatLon {
  lat: number;
  lon: number;
}

export class InvalidCoordinateError extends Error {}

export function isValidCoord(p: unknown): p is LatLon {
  if (!p || typeof p !== 'object') return false;
  const { lat, lon } = p as LatLon;
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

const toRad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Returns meters, or throws InvalidCoordinateError. Handles antimeridian, poles and identical points. */
export function haversineMeters(a: LatLon, b: LatLon): number {
  if (!isValidCoord(a) || !isValidCoord(b)) throw new InvalidCoordinateError('Invalid WGS84 coordinate');
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const dPhi = phi2 - phi1;
  // Normalize longitude difference into [-180, 180] to handle the antimeridian.
  let dLonDeg = b.lon - a.lon;
  dLonDeg = ((((dLonDeg + 180) % 360) + 360) % 360) - 180;
  const dLambda = toRad(dLonDeg);
  const s1 = Math.sin(dPhi / 2);
  const s2 = Math.sin(dLambda / 2);
  const h = clamp(s1 * s1 + Math.cos(phi1) * Math.cos(phi2) * s2 * s2, 0, 1);
  const c = 2 * Math.asin(clamp(Math.sqrt(h), 0, 1));
  return EARTH_RADIUS_M * c;
}

export type Units = 'imperial' | 'metric';

export function roundForDisplay(meters: number, units: Units): { value: number; unit: 'm' | 'km' | 'ft' | 'mi'; text: string } {
  if (!Number.isFinite(meters) || meters < 0) throw new InvalidCoordinateError('Invalid distance');
  if (units === 'metric') {
    if (meters < 100) {
      const v = Math.round(meters / 5) * 5;
      return { value: v, unit: 'm', text: `${v} m` };
    }
    if (meters < 1000) {
      const v = Math.round(meters / 10) * 10;
      return v >= 1000 ? { value: 1, unit: 'km', text: '1.0 km' } : { value: v, unit: 'm', text: `${v} m` };
    }
    const v = Math.round(meters / 100) / 10;
    return { value: v, unit: 'km', text: `${v.toFixed(1)} km` };
  }
  const ft = meters * FT_PER_M;
  if (meters < 100) {
    const v = Math.round(ft / 10) * 10;
    return { value: v, unit: 'ft', text: `${v.toLocaleString('en-US')} ft` };
  }
  if (meters < 1000) {
    const v = Math.round(ft / 50) * 50;
    return { value: v, unit: 'ft', text: `${v.toLocaleString('en-US')} ft` };
  }
  const mi = meters / M_PER_MI;
  const v = Math.round(mi * 10) / 10;
  return { value: v, unit: 'mi', text: `${v.toFixed(1)} mi` };
}

export type ReferenceKind = 'current_fix' | 'manual_reference' | 'photo_metadata';

export interface ReferencePoint extends LatLon {
  kind: ReferenceKind;
  /** Phone-reported horizontal accuracy in meters, if any. */
  accuracyM: number | null;
  /** ISO timestamp of the fix (for current_fix) or when the point was chosen. */
  timestamp: string | null;
  label?: string;
}

export interface TargetPoint extends LatLon {
  /** Source-location uncertainty in meters if explicitly known, else null (unknown). */
  uncertaintyM: number | null;
}

export type Freshness = 'live' | 'old' | 'last_location' | 'not_applicable';

export const FRESH_OLD_S = 30;
export const FRESH_LAST_S = 120;
export const POOR_ACCURACY_M = 50;

export function fixFreshness(ref: ReferencePoint, nowMs: number): Freshness {
  if (ref.kind !== 'current_fix') return 'not_applicable';
  if (!ref.timestamp) return 'last_location';
  const age = (nowMs - Date.parse(ref.timestamp)) / 1000;
  if (!Number.isFinite(age)) return 'last_location';
  if (age > FRESH_LAST_S) return 'last_location';
  if (age > FRESH_OLD_S) return 'old';
  return 'live';
}

export interface DistanceDescription {
  meters: number;
  primary: string;
  qualifiers: string[];
  freshness: Freshness;
  envelope: { minM: number; maxM: number; text: string } | null;
  veryCloseUncertain: boolean;
}

/**
 * Builds honest distance microcopy. Never claims "in view", "recorded", or coverage.
 */
export function describeDistance(ref: ReferencePoint, target: TargetPoint, units: Units, nowMs: number): DistanceDescription {
  const meters = haversineMeters(ref, target);
  const freshness = fixFreshness(ref, nowMs);
  const qualifiers: string[] = [];
  const from =
    ref.kind === 'current_fix'
      ? freshness === 'last_location'
        ? 'from your last location'
        : 'from your location'
      : ref.kind === 'photo_metadata'
        ? 'from photo-metadata position (not verified)'
        : 'from chosen point';
  if (freshness === 'old') qualifiers.push('Location fix is over 30 seconds old');
  if (freshness === 'last_location') qualifiers.push('Not live — measured from your last known location');
  if (ref.kind === 'current_fix' && ref.accuracyM != null && ref.accuracyM > POOR_ACCURACY_M)
    qualifiers.push(`Approximate location (phone reports ±${roundForDisplay(ref.accuracyM, units).text})`);
  if (ref.kind === 'current_fix' && ref.accuracyM == null) qualifiers.push('Phone did not report accuracy');
  if (target.uncertaintyM == null) qualifiers.push('Mapped-location precision not established');

  const uncert = (ref.accuracyM ?? 0) + (target.uncertaintyM ?? 0);
  const veryCloseUncertain = uncert > 0 && uncert >= meters;
  let primary: string;
  if (veryCloseUncertain) {
    primary = 'Very close to the mapped location; exact distance uncertain.';
  } else {
    primary = `About ${roundForDisplay(meters, units).text} ${from} · straight-line`;
  }
  let envelope: DistanceDescription['envelope'] = null;
  if (ref.accuracyM != null && target.uncertaintyM != null) {
    const minM = Math.max(0, meters - ref.accuracyM - target.uncertaintyM);
    const maxM = meters + ref.accuracyM + target.uncertaintyM;
    envelope = {
      minM,
      maxM,
      text: `Rough envelope ${roundForDisplay(minM, units).text}–${roundForDisplay(maxM, units).text} (not a statistical confidence interval)`,
    };
  }
  return { meters, primary, qualifiers, freshness, envelope, veryCloseUncertain };
}

/** Equirectangular bounding box for viewport queries (pre-filter before precise distance). */
export function bboxAround(p: LatLon, radiusM: number): [number, number, number, number] {
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const cos = Math.max(0.01, Math.cos(toRad(p.lat)));
  const dLon = Math.min(180, dLat / cos);
  return [p.lon - dLon, Math.max(-90, p.lat - dLat), p.lon + dLon, Math.min(90, p.lat + dLat)];
}

export function bearingDegrees(a: LatLon, b: LatLon): number {
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const dl = toRad(b.lon - a.lon);
  const y = Math.sin(dl) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dl);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

export function cardinal(deg: number): string {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
