import { describe, it, expect } from 'vitest';
import { haversineMeters, roundForDisplay, describeDistance, InvalidCoordinateError, fixFreshness } from '../../src/domain/distance';

describe('A04 distance engine', () => {
  it('haversine matches known reference distances', () => {
    // 1 degree of latitude on the mean sphere ≈ 111.195 km
    expect(haversineMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111195.08, 0);
    // across the antimeridian: 179.9 → -179.9 is 0.2° of longitude at equator
    expect(haversineMeters({ lat: 0, lon: 179.9 }, { lat: 0, lon: -179.9 })).toBeCloseTo(22239.0, 0);
    expect(haversineMeters({ lat: 41.15, lon: -73.25 }, { lat: 41.15, lon: -73.25 })).toBe(0);
    // antipodal points: half circumference
    expect(haversineMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 180 })).toBeCloseTo(Math.PI * 6371008.8, 0);
  });
  it('rejects invalid coordinates instead of computing nonsense', () => {
    expect(() => haversineMeters({ lat: 91, lon: 0 }, { lat: 0, lon: 0 })).toThrow(InvalidCoordinateError);
    expect(() => haversineMeters({ lat: NaN, lon: 0 }, { lat: 0, lon: 0 })).toThrow(InvalidCoordinateError);
    expect(() => haversineMeters({ lat: 0, lon: 200 }, { lat: 0, lon: 0 })).toThrow(InvalidCoordinateError);
  });
  it('rounds for display per unit thresholds', () => {
    expect(roundForDisplay(128, 'imperial').text).toBe('400 ft'); // 100m–1km → nearest 50 ft
    expect(roundForDisplay(20, 'imperial').text).toBe('70 ft'); // <100m → nearest 10 ft
    expect(roundForDisplay(23, 'metric').text).toBe('25 m');
    expect(roundForDisplay(523, 'metric').text).toBe('520 m');
    expect(roundForDisplay(2345, 'metric').text).toBe('2.3 km');
    expect(roundForDisplay(5000, 'imperial').text).toBe('3.1 mi');
  });
  it('produces the spec microcopy for a fresh, accurate fix', () => {
    const now = Date.parse('2026-10-06T12:00:00Z');
    const d = describeDistance({ kind: 'current_fix', lat: 41.15, lon: -73.25, accuracyM: 5, timestamp: new Date(now - 5000).toISOString() }, { lat: 41.15123, lon: -73.25, uncertaintyM: 3 }, 'imperial', now);
    expect(d.primary).toBe('About 450 ft from your location · straight-line');
    expect(d.qualifiers).toEqual([]);
    expect(d.envelope?.text).toMatch(/not a statistical confidence interval/);
  });
  it('labels old fixes, last location and poor accuracy', () => {
    const now = 1_000_000_000_000;
    const ref = { kind: 'current_fix' as const, lat: 41.15, lon: -73.25, accuracyM: 80, timestamp: new Date(now - 45_000).toISOString() };
    expect(fixFreshness(ref, now)).toBe('old');
    expect(fixFreshness({ ...ref, timestamp: new Date(now - 180_000).toISOString() }, now)).toBe('last_location');
    const d = describeDistance({ ...ref, timestamp: new Date(now - 180_000).toISOString() }, { lat: 41.16, lon: -73.25, uncertaintyM: null }, 'metric', now);
    expect(d.primary).toContain('from your last location');
    expect(d.qualifiers.join(' ')).toMatch(/Approximate location/);
    expect(d.qualifiers.join(' ')).toMatch(/precision not established/);
    expect(d.envelope).toBeNull(); // only when both uncertainties are known
  });
  it('says "very close … uncertain" when uncertainty exceeds distance', () => {
    const now = 0;
    const d = describeDistance({ kind: 'current_fix', lat: 41.15, lon: -73.25, accuracyM: 30, timestamp: new Date(now).toISOString() }, { lat: 41.1501, lon: -73.25, uncertaintyM: 10 }, 'imperial', now);
    expect(d.primary).toBe('Very close to the mapped location; exact distance uncertain.');
    expect(d.envelope!.minM).toBe(0);
  });
  it('labels manual reference points', () => {
    const d = describeDistance({ kind: 'manual_reference', lat: 41.15, lon: -73.25, accuracyM: null, timestamp: null }, { lat: 41.16, lon: -73.25, uncertaintyM: 5 }, 'metric', 0);
    expect(d.primary).toContain('from chosen point');
    expect(d.freshness).toBe('not_applicable');
  });
});
