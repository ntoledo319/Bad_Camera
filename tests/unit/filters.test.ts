import { describe, it, expect } from 'vitest';
import { applyFilters } from '../../src/domain/filters';
import { DEMO_INSTALLATION } from '../../src/domain/demo';
import type { CameraInstallation, FilterState } from '../../src/domain/schemas';

const none: FilterState = { categories: [], manufacturers: [], deployment: [], sourceStatus: [], maxObservationAgeDays: null, includeRemoved: false };
const mk = (id: string, over: Partial<CameraInstallation>): CameraInstallation => ({ ...DEMO_INSTALLATION, id, ...over });

describe('A09 / S04 filters', () => {
  const fixed = mk('fixed', { deploymentMode: 'fixed' });
  const mobile = mk('mobile', { deploymentMode: 'vehicle_mounted', lastObservedAt: '2025-05-01T00:00:00.000Z' });
  const unknown = mk('unknown', { deploymentMode: 'unknown' });
  const trailer = mk('trailer', { deploymentMode: 'trailer' });
  const ids = (f: FilterState) => applyFilters([fixed, mobile, unknown, trailer], f).map((i) => i.id);

  it('hides historical mobile sightings from the default layer', () => {
    expect(ids(none)).toEqual(['fixed', 'unknown', 'trailer']);
  });
  it('shows them only when explicitly requested', () => {
    expect(ids({ ...none, deployment: ['historical_mobile'] })).toEqual(['mobile', 'unknown']);
  });
  it('does not treat unknown deployment as false', () => {
    expect(ids({ ...none, deployment: ['fixed'] })).toEqual(['fixed', 'unknown']);
    expect(ids({ ...none, deployment: ['relocatable'] })).toEqual(['unknown', 'trailer']);
  });
  it('"recently observed" excludes records with no in-person date', () => {
    const undated = mk('undated', { lastObservedAt: null });
    expect(applyFilters([undated], { ...none, maxObservationAgeDays: 365 })).toEqual([]);
  });
});
