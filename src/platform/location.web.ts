/** Browser preview: navigator.geolocation (foreground only). */
import type { ReferencePoint } from '../domain/distance';
import type { LocResult } from './location';
export type { LocResult } from './location';

let watchId: number | null = null;
const toRef = (p: GeolocationPosition): ReferencePoint => ({ lat: p.coords.latitude, lon: p.coords.longitude, kind: 'current_fix', accuracyM: p.coords.accuracy ?? null, timestamp: new Date(p.timestamp).toISOString(), label: 'Your location' });

export function requestFix(): Promise<LocResult> {
  return new Promise((res) => {
    if (!('geolocation' in navigator)) return res({ ok: false, reason: 'unavailable', canAskAgain: false, message: 'This browser has no location support.' });
    navigator.geolocation.getCurrentPosition(
      (p) => res({ ok: true, ref: toRef(p), approximate: (p.coords.accuracy ?? 0) > 500 }),
      (e) => res(e.code === 1 ? { ok: false, reason: 'denied', canAskAgain: true, message: 'Location permission was not granted. You can still search a place or enter coordinates.' } : { ok: false, reason: e.code === 3 ? 'timeout' : 'unavailable', canAskAgain: true, message: e.message || 'Location unavailable.' }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  });
}
export async function startWatch(onFix: (r: ReferencePoint) => void): Promise<boolean> {
  stopWatch();
  if (!('geolocation' in navigator)) return false;
  watchId = navigator.geolocation.watchPosition((p) => onFix(toRef(p)), () => {}, { maximumAge: 10000 });
  return true;
}
export function stopWatch() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}
export const watchActive = () => watchId != null;
