/** Observation draft model (persisted via Notebook.saveDraft so it survives interruption and restart). */
import type { Category, EquipmentLocation, ObservationFeatures, ObserverLocation, Observation } from '../../domain/schemas';
import type { PhotoMetadata } from '../../domain/exif';
import { haversineMeters, ALGORITHM } from '../../domain/distance';
import type { ObservationDraft } from '../../domain/observation';

export interface DraftPhoto {
  blobId: string;
  mime: string;
  width: number;
  height: number;
  origin: 'inAppCapture' | 'import';
  originalFilenamePrivate: string | null;
  photoMetadata: PhotoMetadata;
  receivedBytesNote: string | null;
  capturedAt: string;
}

export interface Draft {
  v: 1;
  step: 0 | 1 | 2 | 3;
  photos: DraftPhoto[];
  installationId: string | null;
  category: Category;
  categoryReason: string;
  features: ObservationFeatures;
  identificationLevel: Observation['identificationLevel'];
  identificationBasis: Observation['identificationBasis'];
  selectedFamilyId: string | null;
  candidateFamilyIds: string[];
  observer: ObserverLocation | null;
  equipment: EquipmentLocation | null;
  equipmentMode: 'linked' | 'placed' | 'approximate' | 'none';
  direction: string | null;
  placeLabel: string;
  localNotes: string;
  timeChoice: 'capture' | 'photo_metadata' | 'unknown';
  startedAt: string;
}

export const MAX_PHOTOS = 12;

export function emptyDraft(now = new Date().toISOString()): Draft {
  return {
    v: 1,
    step: 0,
    photos: [],
    installationId: null,
    category: 'unknown',
    categoryReason: '',
    features: { mounting: 'unknown', form: 'unknown', visibleText: '', solarPanel: 'unknown', apparentOrientation: '', categoryReason: '' },
    identificationLevel: 'unknown',
    identificationBasis: 'unknown',
    selectedFamilyId: null,
    candidateFamilyIds: [],
    observer: null,
    equipment: null,
    equipmentMode: 'none',
    direction: null,
    placeLabel: '',
    localNotes: '',
    timeChoice: 'capture',
    startedAt: now,
  };
}

const DIR_DEG: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

/** Parse "YYYY-MM-DDTHH:MM:SS" + optional "+HH:MM" from EXIF into ISO; null if not parseable. */
export function exifToIso(m: PhotoMetadata): string | null {
  if (!m.dateTimeOriginal) return null;
  const s = m.dateTimeOriginal + (m.offsetTime ?? '');
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function observedTime(d: Draft): { observedAt: string | null; basis: Observation['observedAtBasis'] } {
  const first = d.photos[0];
  if (d.timeChoice === 'photo_metadata' && first) {
    const iso = exifToIso(first.photoMetadata);
    if (iso) return { observedAt: iso, basis: 'photo_metadata' };
  }
  if (d.timeChoice === 'capture' && first?.origin === 'inAppCapture') return { observedAt: first.capturedAt, basis: 'device_clock_at_capture' };
  return { observedAt: null, basis: 'unknown' };
}

/** Distance is computed only when both coordinates have meaningful provenance. */
export function distanceSnapshot(d: Draft, now: string): Observation['distanceSnapshot'] {
  if (!d.observer || !d.equipment || d.equipmentMode === 'none') return null;
  return {
    meters: Math.round(haversineMeters(d.observer, d.equipment) * 10) / 10,
    algorithm: ALGORITHM,
    computedAt: now,
    referenceKind: d.observer.method === 'gps_fix' ? 'current_fix' : d.observer.method === 'photo_metadata' ? 'photo_metadata' : 'manual_reference',
    inputsVersion: '1',
  };
}

export function toObservationDraft(d: Draft, sourceIds: string[], claimIds: string[], snapshot: unknown, isDemo: boolean, now = new Date().toISOString()): ObservationDraft {
  const t = observedTime(d);
  return {
    installationId: d.installationId,
    observedAt: t.observedAt,
    observedAtBasis: t.basis,
    deviceTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    importedAt: d.photos.some((p) => p.origin === 'import') ? now : null,
    observerLocation: d.observer,
    equipmentLocation: d.equipmentMode === 'none' ? null : d.equipment,
    equipmentLocationUncertainNote: d.equipmentMode === 'approximate' ? 'Equipment location uncertain — approximate area only.' : d.equipmentMode === 'none' ? 'Saved without an equipment coordinate.' : null,
    distanceSnapshot: distanceSnapshot(d, now),
    direction: d.direction ? { degrees: DIR_DEG[d.direction] ?? null, cardinal: d.direction } : null,
    category: d.category,
    candidateFamilyIds: d.candidateFamilyIds,
    selectedFamilyId: d.identificationLevel === 'unknown' ? null : d.selectedFamilyId,
    identificationBasis: d.identificationBasis,
    identificationLevel: d.identificationLevel,
    features: { ...d.features, categoryReason: d.categoryReason },
    placeLabel: d.placeLabel.trim(),
    localNotes: d.localNotes,
    sources: sourceIds,
    claimIds,
    sourceRecordSnapshot: snapshot,
    isDemo,
  };
}
