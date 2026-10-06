/**
 * Observation lifecycle: creation and append-only revisions with a local JCS/SHA-256 hash chain.
 * A local chain can be rewritten by someone controlling the device; it is NOT a trusted timestamp.
 */
import { Observation, SCHEMA_VERSION, type ObservationFeatures, type Source } from './schemas';
import { revisionHash, uuidv4 } from './hash';
import { validateIdentification } from './identify';

export interface ObservationDraft {
  installationId?: string | null;
  observedAt?: string | null;
  observedAtBasis?: Observation['observedAtBasis'];
  deviceTimeZone?: string;
  importedAt?: string | null;
  observerLocation?: Observation['observerLocation'];
  equipmentLocation?: Observation['equipmentLocation'];
  equipmentLocationUncertainNote?: string | null;
  distanceSnapshot?: Observation['distanceSnapshot'];
  direction?: Observation['direction'];
  category?: Observation['category'];
  candidateFamilyIds?: string[];
  selectedFamilyId?: string | null;
  identificationBasis?: Observation['identificationBasis'];
  identificationLevel?: Observation['identificationLevel'];
  features?: ObservationFeatures | null;
  placeLabel?: string;
  localNotes?: string;
  attachments?: string[];
  sources?: string[];
  userSources?: Source[];
  claimIds?: string[];
  sourceRecordSnapshot?: unknown;
  isDemo?: boolean;
}

/** Fields that participate in the revision hash (everything except the hash itself). */
function hashContent(o: Omit<Observation, 'revisionHash'>): unknown {
  const { ...rest } = o as Observation;
  delete (rest as Partial<Observation>).revisionHash;
  return rest;
}

export function createObservation(d: ObservationDraft, now = new Date().toISOString(), id = uuidv4()): Observation {
  const level = d.identificationLevel ?? 'unknown';
  const basis = d.identificationBasis ?? 'unknown';
  const err = validateIdentification(level, basis);
  if (err) throw new Error(err);
  const base = Observation.parse({
    id,
    installationId: d.installationId ?? null,
    revision: 1,
    observedAt: d.observedAt ?? null,
    observedAtBasis: d.observedAtBasis ?? 'unknown',
    deviceRecordedAt: now,
    deviceTimeZone: d.deviceTimeZone ?? 'UTC',
    importedAt: d.importedAt ?? null,
    observerLocation: d.observerLocation ?? null,
    equipmentLocation: d.equipmentLocation ?? null,
    equipmentLocationUncertainNote: d.equipmentLocationUncertainNote ?? null,
    distanceSnapshot: d.distanceSnapshot ?? null,
    direction: d.direction ?? null,
    category: d.category ?? 'unknown',
    candidateFamilyIds: d.candidateFamilyIds ?? [],
    selectedFamilyId: level === 'unknown' ? null : (d.selectedFamilyId ?? null),
    identificationBasis: basis,
    identificationLevel: level,
    features: d.features ?? null,
    placeLabel: d.placeLabel ?? '',
    localNotes: d.localNotes ?? '',
    attachments: d.attachments ?? [],
    sources: d.sources ?? [],
    ...(d.userSources?.length ? { userSources: d.userSources } : {}),
    claimIds: d.claimIds ?? [],
    sourceRecordSnapshot: d.sourceRecordSnapshot ?? null,
    collectionIds: [],
    visibility: 'private',
    isDemo: d.isDemo ?? false,
    schemaVersion: SCHEMA_VERSION,
    previousRevisionHash: null,
    revisionHash: null,
    revisionReason: 'Created',
  });
  return { ...base, revisionHash: revisionHash(SCHEMA_VERSION, null, hashContent(base)) };
}

/** Fields a user may revise. Attachments may be appended, never replaced or removed by edit. */
export type ObservationPatch = Partial<
  Pick<
    Observation,
    'category' | 'selectedFamilyId' | 'identificationBasis' | 'identificationLevel' | 'features' | 'placeLabel' | 'localNotes' | 'equipmentLocation' | 'equipmentLocationUncertainNote' | 'direction' | 'collectionIds' | 'sources' | 'userSources' | 'claimIds'
  >
> & { appendAttachments?: string[] };

export function reviseObservation(prev: Observation, patch: ObservationPatch, reason: string, now = new Date().toISOString()): Observation {
  if (!reason.trim()) throw new Error('A short reason is required for each revision.');
  const { appendAttachments, ...rest } = patch;
  const next = Observation.parse({
    ...prev,
    ...rest,
    attachments: [...prev.attachments, ...(appendAttachments ?? []).filter((a) => !prev.attachments.includes(a))],
    revision: prev.revision + 1,
    deviceRecordedAt: now,
    previousRevisionHash: prev.revisionHash,
    revisionHash: null,
    revisionReason: reason.trim(),
  });
  const err = validateIdentification(next.identificationLevel, next.identificationBasis);
  if (err) throw new Error(err);
  if (next.identificationLevel === 'unknown') next.selectedFamilyId = null;
  return { ...next, revisionHash: revisionHash(SCHEMA_VERSION, prev.revisionHash, hashContent(next)) };
}

/** Recompute the chain; returns the index of the first broken revision, or -1. */
export function verifyChain(revisions: Observation[]): number {
  let prevHash: string | null = null;
  for (let i = 0; i < revisions.length; i++) {
    const r = revisions[i];
    if (r.previousRevisionHash !== prevHash) return i;
    const h = revisionHash(SCHEMA_VERSION, prevHash, hashContent(r));
    if (h !== r.revisionHash) return i;
    prevHash = r.revisionHash;
  }
  return -1;
}
