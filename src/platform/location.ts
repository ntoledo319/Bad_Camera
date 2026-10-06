/**
 * Foreground-only location. Permission requested only from an explicit user action.
 * One watch at a time; stopped when backgrounded (store) or when the screen unmounts.
 * No background location API is used anywhere in Sightline.
 */
import * as Location from 'expo-location';
import type { ReferencePoint } from '../domain/distance';

export type LocResult =
  | { ok: true; ref: ReferencePoint; approximate: boolean }
  | { ok: false; reason: 'denied' | 'unavailable' | 'services_off' | 'timeout'; canAskAgain: boolean; message: string };

let sub: Location.LocationSubscription | null = null;

function toRef(l: Location.LocationObject): ReferencePoint {
  return { lat: l.coords.latitude, lon: l.coords.longitude, kind: 'current_fix', accuracyM: l.coords.accuracy ?? null, timestamp: new Date(l.timestamp).toISOString(), label: 'Your location' };
}

export async function requestFix(): Promise<LocResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { ok: false, reason: 'denied', canAskAgain: perm.canAskAgain, message: 'Location permission was not granted. You can still search a place or enter coordinates.' };
    if (!(await Location.hasServicesEnabledAsync())) return { ok: false, reason: 'services_off', canAskAgain: true, message: 'Location services are turned off on this device.' };
    const approximate = (perm as { android?: { accuracy?: string } }).android?.accuracy === 'coarse' || (perm as { ios?: { accuracy?: string } }).ios?.accuracy === 'reduced';
    const last = await Location.getLastKnownPositionAsync({ maxAge: 120_000 }).catch(() => null);
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((r) => setTimeout(() => r(null), 15_000)),
    ]);
    const l = fix ?? last;
    if (!l) return { ok: false, reason: 'timeout', canAskAgain: true, message: 'No location fix yet. Try again outdoors, or choose a point manually.' };
    return { ok: true, ref: toRef(l), approximate };
  } catch (e) {
    return { ok: false, reason: 'unavailable', canAskAgain: true, message: `Location unavailable: ${(e as Error).message}` };
  }
}

export async function startWatch(onFix: (r: ReferencePoint) => void): Promise<boolean> {
  stopWatch();
  const perm = await Location.getForegroundPermissionsAsync();
  if (perm.status !== 'granted') return false;
  sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 15, timeInterval: 10_000 }, (l) => onFix(toRef(l)));
  return true;
}

export function stopWatch() {
  sub?.remove();
  sub = null;
}

export const watchActive = () => sub != null;
