/** Glue between the private notebook and the pure export pipeline (projection → card / PDF / ZIP). */
import type { AppStore } from '../data/store';
import type { Attachment, Claim, Observation, Source } from '../domain/schemas';
import { buildEvidenceZip, type DisclosureProfile } from '../domain/evidence';
import { projectPublic, DEFAULT_DISCLOSURE, type DisclosureChoices } from '../domain/projection';
import { writeZipDeterministic } from '../domain/safezip';
import { utf8ToBytes } from '../domain/hash';
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
  const sources = [...([...srcIds].map((s) => store.source(s) ?? SOURCE_BY_ID[s]).filter(Boolean) as Source[]), ...(observation.userSources ?? [])];
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

export interface BatchExport {
  name: string;
  bytes: Uint8Array;
  exported: number;
  skipped: string[];
}

/**
 * Several records in one file: each record keeps its own sanitized evidence ZIP (default public
 * profile, reviewed photos only) so every package still verifies on its own. Cancellable.
 */
export async function exportMany(store: AppStore, ids: string[], label: string, onProgress?: (done: number, total: number) => void, isCanceled?: () => boolean): Promise<BatchExport | null> {
  const files: Record<string, Uint8Array> = {};
  const lines: string[] = [];
  const skipped: string[] = [];
  let n = 0;
  for (const id of ids) {
    if (isCanceled?.()) return null;
    onProgress?.(n, ids.length);
    const b = await loadBundle(store, id);
    if (!b) {
      skipped.push(id);
      continue;
    }
    const ev = await evidenceFor(store, b, DEFAULT_DISCLOSURE);
    n++;
    const path = `records/${String(n).padStart(3, '0')}-${id.slice(0, 8)}-evidence.zip`;
    files[path] = ev.zip;
    lines.push(`${ev.zipSha256}  ${path}`);
  }
  onProgress?.(ids.length, ids.length);
  if (!n) return null;
  const demo = store.settings.demoMode;
  files['README.txt'] = utf8ToBytes(
    [
      demo ? 'DEMONSTRATION — NOT A REAL SIGHTING\n' : '',
      `Sightline batch export: ${label}`,
      `${n} record${n === 1 ? '' : 's'}. Each file in records/ is a separate evidence package with its own manifest and checksums.`,
      'Packages use the default public disclosure: no photographer position, month-level dates, no private notes, reviewed photos only.',
      'Verify each package with the Sightline verifier (Notebook → Verify an evidence ZIP, or tools/verify-evidence).',
      'A checksum match shows files are unchanged; it does not prove the scene, time, location or claim is true.',
      '',
      'SHA-256 of each package:',
      ...lines,
      '',
    ].join('\n'),
  );
  return { name: `sightline-${demo ? 'DEMO-' : ''}batch-${n}-records.zip`, bytes: writeZipDeterministic(files), exported: n, skipped };
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
