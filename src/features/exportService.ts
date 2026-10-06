/** Glue between the private notebook and the pure export pipeline (projection → card / PDF / ZIP). */
import type { AppStore } from '../data/store';
import type { Attachment, Claim, Observation, Source } from '../domain/schemas';
import { buildEvidenceZip, type DisclosureProfile } from '../domain/evidence';
import { projectPublic, type DisclosureChoices } from '../domain/projection';
import { renderPublicDerivative } from '../domain/image';
import { SOURCE_BY_ID } from '../../content/sources';
import { describeDistance } from '../domain/distance';

export interface RecordBundle {
  observation: Observation;
  revisions: Observation[];
  attachments: Attachment[];
  sources: Source[];
  claims: Claim[];
}

export async function loadBundle(store: AppStore, id: string): Promise<RecordBundle | null> {
  const nb = store.notebook;
  const revisions = await nb.revisions(id);
  const observation = revisions.at(-1);
  if (!observation) return null;
  const attachments = (await Promise.all(observation.attachments.map((a) => nb.attachment(a)))).filter(Boolean) as Attachment[];
  const inst = observation.installationId ? store.installation(observation.installationId) : null;
  const srcIds = new Set<string>([...observation.sources, ...(inst?.geometry?.sourceId ? [inst.geometry.sourceId] : [])]);
  const sources = [...srcIds].map((s) => store.source(s) ?? SOURCE_BY_ID[s]).filter(Boolean) as Source[];
  const claims = inst ? store.claimsFor(inst.id) : [];
  return { observation, revisions, attachments, sources, claims };
}

export function observerDistanceText(b: RecordBundle, units: 'imperial' | 'metric'): string | null {
  const o = b.observation;
  if (!o.observerLocation || !o.equipmentLocation) return null;
  const d = describeDistance(
    { lat: o.observerLocation.lat, lon: o.observerLocation.lon, kind: o.observerLocation.method === 'gps_fix' ? 'manual_reference' : o.observerLocation.method === 'photo_metadata' ? 'photo_metadata' : 'manual_reference', accuracyM: o.observerLocation.horizontalAccuracyM, timestamp: o.observerLocation.fixTimestamp },
    { lat: o.equipmentLocation.lat, lon: o.equipmentLocation.lon, uncertaintyM: o.equipmentLocation.uncertaintyM },
    units,
    Date.now(),
  );
  return d.primary.replace('from chosen point', 'from where the photographer stood');
}

export function projectionFor(store: AppStore, b: RecordBundle, choices: DisclosureChoices) {
  const inst = b.observation.installationId ? store.installation(b.observation.installationId) : null;
  return projectPublic({ observation: b.observation, sources: b.sources, claims: b.claims, installation: inst, observerDistanceText: choices.includeObserverDistance ? observerDistanceText(b, store.settings.units) : null }, choices);
}

/** Only attachments the user has reviewed are eligible for public exports. */
export function reviewedAttachments(b: RecordBundle) {
  return b.attachments.filter((a) => a.redactionReviewedAt);
}

export async function derivativeFor(store: AppStore, a: Attachment) {
  const bytes = await store.notebook.attachmentBytes(a.id);
  return renderPublicDerivative(bytes, a.transformations);
}

export async function evidenceFor(store: AppStore, b: RecordBundle, choices: DisclosureChoices, profile?: DisclosureProfile, privateFullConfirmed = false) {
  const inst = b.observation.installationId ? store.installation(b.observation.installationId) : null;
  const eligible = profile === 'private-full-evidence' ? b.attachments : reviewedAttachments(b);
  const photos = choices.includePhoto ? await Promise.all(eligible.map(async (a) => ({ attachment: a, originalBytes: await store.notebook.attachmentBytes(a.id) }))) : [];
  return buildEvidenceZip({
    observation: b.observation,
    sources: b.sources,
    claims: b.claims,
    installation: inst,
    photos,
    revisions: b.revisions.map((r) => ({ revision: r.revision, revisionHash: r.revisionHash, previousRevisionHash: r.previousRevisionHash, recordedAt: r.deviceRecordedAt, reason: r.revisionReason })),
    choices: { ...choices, includePhoto: choices.includePhoto && photos.length > 0 },
    profile,
    privateFullConfirmed,
    observerDistanceText: choices.includeObserverDistance ? observerDistanceText(b, store.settings.units) : null,
  });
}

export function bytesToBase64(b: Uint8Array): string {
  const g = globalThis as { Buffer?: { from(x: Uint8Array): { toString(enc: string): string } } };
  if (g.Buffer) return g.Buffer.from(b).toString('base64');
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
export function base64ToBytes(s: string): Uint8Array {
  const g = globalThis as { Buffer?: { from(x: string, enc: string): Uint8Array } };
  if (g.Buffer) return new Uint8Array(g.Buffer.from(s, 'base64'));
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
