/**
 * Private notebook repository. Local only. Append-only observation revisions; original
 * attachment bytes are written once and never overwritten by edits.
 *
 * Keys:  obs/<id>/<rev:6>   att/<id>   bm/<id>   col/<id>   draft/current   settings
 * Blobs: opaque random ids (never derived from filenames or content).
 */
import type { KvBackend, KvOp } from './kv.types';
import { Attachment, Bookmark, Collection, Observation, Settings, defaultSettings, type Transformation } from '../domain/schemas';
import { createObservation, reviseObservation, type ObservationDraft, type ObservationPatch } from '../domain/observation';
import { sha256Hex, randomBytes, bytesToHex, uuidv4 } from '../domain/hash';

export class NotebookError extends Error {
  constructor(public code: 'disk_full' | 'write_failed' | 'not_found' | 'invalid', message: string) {
    super(message);
  }
}

export interface NewAttachmentInput {
  bytes: Uint8Array;
  mime: string;
  width: number;
  height: number;
  origin: Attachment['origin'];
  originalFilenamePrivate: string | null;
  originalMetadataPrivate: Record<string, unknown>;
  receivedBytesNote: string | null;
}

export interface SaveResult {
  observation: Observation;
  attachments: Attachment[];
}

const revKey = (id: string, rev: number) => `obs/${id}/${String(rev).padStart(6, '0')}`;
const SAFETY_MARGIN = 20 * 1024 * 1024;

export class Notebook {
  constructor(public kv: KvBackend) {}

  async init() {
    await this.kv.init();
  }

  // ---------------------------------------------------------------- observations
  async listLatest(): Promise<Observation[]> {
    const rows = await this.kv.list('obs/');
    const latest = new Map<string, Observation>();
    for (const r of rows) {
      const o = JSON.parse(r.value) as Observation;
      const prev = latest.get(o.id);
      if (!prev || prev.revision < o.revision) latest.set(o.id, o);
    }
    return [...latest.values()].sort((a, b) => (b.observedAt ?? b.deviceRecordedAt).localeCompare(a.observedAt ?? a.deviceRecordedAt));
  }

  async revisions(id: string): Promise<Observation[]> {
    return (await this.kv.list(`obs/${id}/`)).map((r) => JSON.parse(r.value) as Observation).sort((a, b) => a.revision - b.revision);
  }

  async get(id: string): Promise<Observation | null> {
    const revs = await this.revisions(id);
    return revs.at(-1) ?? null;
  }

  /**
   * Transactional save: free-space check → write encrypted blobs → single atomic commit
   * of attachment metadata + observation revision 1. On failure, written blobs are removed
   * and the caller keeps its draft.
   */
  async saveNew(draft: ObservationDraft, newAttachments: NewAttachmentInput[], now = new Date().toISOString()): Promise<SaveResult> {
    const needed = newAttachments.reduce((a, x) => a + x.bytes.length, 0) + 64 * 1024;
    const free = await this.kv.freeBytes();
    if (free != null && free < needed + SAFETY_MARGIN) {
      throw new NotebookError('disk_full', `Not enough free space to save safely (needs about ${Math.ceil(needed / 1e6)} MB plus a safety margin). Your draft is kept.`);
    }
    const atts: Attachment[] = [];
    const written: string[] = [];
    try {
      for (const a of newAttachments) {
        const id = `a_${bytesToHex(randomBytes(12))}`;
        const blobId = `b_${bytesToHex(randomBytes(16))}`;
        await this.kv.putBlob(blobId, a.bytes);
        written.push(blobId);
        const back = await this.kv.getBlob(blobId);
        if (!back || sha256Hex(back) !== sha256Hex(a.bytes)) throw new NotebookError('write_failed', 'Photo bytes could not be verified after writing.');
        atts.push(
          Attachment.parse({
            id,
            relativePrivatePath: blobId,
            mime: a.mime,
            bytes: a.bytes.length,
            originalFilenamePrivate: a.originalFilenamePrivate,
            origin: a.origin,
            sha256: sha256Hex(a.bytes),
            width: a.width,
            height: a.height,
            originalMetadataPrivate: a.originalMetadataPrivate,
            acquiredAt: now,
            derivativeOf: null,
            transformations: [],
            publicDerivativePath: null,
            publicDerivativeSha256: null,
            redactionReviewedAt: null,
            receivedBytesNote: a.receivedBytesNote,
          }),
        );
      }
      const obs = createObservation({ ...draft, attachments: [...(draft.attachments ?? []), ...atts.map((a) => a.id)] }, now);
      const ops: KvOp[] = [...atts.map((a) => ({ type: 'put' as const, key: `att/${a.id}`, value: JSON.stringify(a) })), { type: 'put', key: revKey(obs.id, 1), value: JSON.stringify(obs) }, { type: 'del', key: 'draft/current' }];
      await this.kv.commit(ops);
      return { observation: obs, attachments: atts };
    } catch (e) {
      for (const b of written) await this.kv.delBlob(b).catch(() => {});
      if (e instanceof NotebookError) throw e;
      throw new NotebookError('write_failed', `Save failed: ${(e as Error).message}. Your draft is kept.`);
    }
  }

  async revise(id: string, patch: ObservationPatch, reason: string, now = new Date().toISOString()): Promise<Observation> {
    const prev = await this.get(id);
    if (!prev) throw new NotebookError('not_found', 'Record not found.');
    const next = reviseObservation(prev, patch, reason, now);
    await this.kv.commit([{ type: 'put', key: revKey(id, next.revision), value: JSON.stringify(next) }]);
    return next;
  }

  /** Genuine delete of a record, all its revisions and its private photo bytes. */
  async delete(id: string): Promise<void> {
    const revs = await this.revisions(id);
    if (!revs.length) return;
    const attIds = new Set(revs.flatMap((r) => r.attachments));
    const atts = (await Promise.all([...attIds].map((a) => this.attachment(a)))).filter(Boolean) as Attachment[];
    const exps = await this.kv.list(`exp/${id}/`);
    await this.kv.commit([...revs.map((r) => ({ type: 'del' as const, key: revKey(id, r.revision) })), ...atts.map((a) => ({ type: 'del' as const, key: `att/${a.id}` })), ...exps.map((e) => ({ type: 'del' as const, key: e.key }))]);
    for (const a of atts) await this.kv.delBlob(a.relativePrivatePath).catch(() => {});
  }

  // ---------------------------------------------------------------- attachments
  async attachment(id: string): Promise<Attachment | null> {
    const v = await this.kv.get(`att/${id}`);
    return v ? (JSON.parse(v) as Attachment) : null;
  }

  async attachmentBytes(id: string): Promise<Uint8Array> {
    const a = await this.attachment(id);
    if (!a) throw new NotebookError('not_found', 'Photo not found.');
    const b = await this.kv.getBlob(a.relativePrivatePath);
    if (!b) throw new NotebookError('not_found', 'Photo bytes are missing.');
    if (sha256Hex(b) !== a.sha256) throw new NotebookError('invalid', 'Photo bytes do not match the recorded SHA-256.');
    return b;
  }

  /** Stores the redaction recipe. Never touches the original bytes. */
  async setRedaction(id: string, transformations: Transformation[], reviewed: boolean, now = new Date().toISOString()): Promise<Attachment> {
    const a = await this.attachment(id);
    if (!a) throw new NotebookError('not_found', 'Photo not found.');
    const next = { ...a, transformations, redactionReviewedAt: reviewed ? now : null };
    await this.kv.commit([{ type: 'put', key: `att/${id}`, value: JSON.stringify(next) }]);
    return next;
  }

  // ---------------------------------------------------------------- bookmarks / collections
  async bookmarks(): Promise<Bookmark[]> {
    return (await this.kv.list('bm/')).map((r) => JSON.parse(r.value) as Bookmark).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async toggleBookmark(installationId: string, label: string): Promise<boolean> {
    const existing = (await this.bookmarks()).find((b) => b.installationId === installationId);
    if (existing) {
      await this.kv.commit([{ type: 'del', key: `bm/${existing.id}` }]);
      return false;
    }
    const b = Bookmark.parse({ id: uuidv4(), installationId, externalRef: installationId, label, createdAt: new Date().toISOString(), collectionIds: [] });
    await this.kv.commit([{ type: 'put', key: `bm/${b.id}`, value: JSON.stringify(b) }]);
    return true;
  }
  async collections(): Promise<Collection[]> {
    return (await this.kv.list('col/')).map((r) => JSON.parse(r.value) as Collection).sort((a, b) => a.name.localeCompare(b.name));
  }
  async createCollection(name: string): Promise<Collection> {
    const c = Collection.parse({ id: uuidv4(), name: name.trim(), createdAt: new Date().toISOString(), notes: '' });
    await this.kv.commit([{ type: 'put', key: `col/${c.id}`, value: JSON.stringify(c) }]);
    return c;
  }
  async deleteCollection(id: string) {
    await this.kv.commit([{ type: 'del', key: `col/${id}` }]);
  }

  // ---------------------------------------------------------------- export log (timeline only; no content)
  async logExport(recordId: string, kind: string, status: string, sha256: string | null, now = new Date().toISOString()) {
    const e = { recordId, kind, status, sha256, at: now };
    await this.kv.commit([{ type: 'put', key: `exp/${recordId}/${now}`, value: JSON.stringify(e) }]);
  }
  async exportLog(recordId: string): Promise<{ recordId: string; kind: string; status: string; sha256: string | null; at: string }[]> {
    return (await this.kv.list(`exp/${recordId}/`)).map((r) => JSON.parse(r.value));
  }

  // ---------------------------------------------------------------- drafts & settings
  async saveDraft(d: unknown) {
    await this.kv.commit([{ type: 'put', key: 'draft/current', value: JSON.stringify(d) }]);
  }
  async draft<T>(): Promise<T | null> {
    const v = await this.kv.get('draft/current');
    return v ? (JSON.parse(v) as T) : null;
  }
  async clearDraft() {
    await this.kv.commit([{ type: 'del', key: 'draft/current' }]);
  }
  /** Draft photos are kept as (encrypted on native) blobs so an interrupted draft survives restart. */
  async putDraftPhoto(bytes: Uint8Array): Promise<string> {
    const id = `d_${bytesToHex(randomBytes(16))}`;
    await this.kv.putBlob(id, bytes);
    return id;
  }
  async draftPhoto(id: string): Promise<Uint8Array | null> {
    return this.kv.getBlob(id);
  }
  async dropDraftPhotos(ids: string[]) {
    for (const id of ids) await this.kv.delBlob(id).catch(() => {});
  }
  async settings(): Promise<Settings> {
    const v = await this.kv.get('settings');
    if (!v) return defaultSettings();
    const r = Settings.safeParse(JSON.parse(v));
    return r.success ? r.data : defaultSettings();
  }
  async saveSettings(s: Settings) {
    await this.kv.commit([{ type: 'put', key: 'settings', value: JSON.stringify(Settings.parse(s)) }]);
  }

  // ---------------------------------------------------------------- stats / backup
  async stats() {
    const obs = await this.listLatest();
    const atts = (await this.kv.list('att/')).map((r) => JSON.parse(r.value) as Attachment);
    return { observations: obs.length, revisions: (await this.kv.list('obs/')).length, media: atts.length, mediaBytes: atts.reduce((a, x) => a + x.bytes, 0), bookmarks: (await this.bookmarks()).length, collections: (await this.collections()).length };
  }

  async exportForBackup(): Promise<{ notebook: { records: { key: string; value: string }[] }; media: Record<string, Uint8Array> }> {
    const records = [...(await this.kv.list('obs/')), ...(await this.kv.list('att/')), ...(await this.kv.list('bm/')), ...(await this.kv.list('col/'))];
    const media: Record<string, Uint8Array> = {};
    for (const r of records.filter((x) => x.key.startsWith('att/'))) {
      const a = JSON.parse(r.value) as Attachment;
      const b = await this.kv.getBlob(a.relativePrivatePath);
      if (b) media[a.relativePrivatePath] = b;
    }
    return { notebook: { records }, media };
  }

  /**
   * Restore without silent overwrite: identical keys are skipped; a conflicting observation
   * id is restored under a new id ("keep both"). Blobs are written before the atomic commit.
   */
  async restore(data: { notebook: unknown; media: Record<string, Uint8Array> }): Promise<{ added: number; skipped: number; keptBoth: number }> {
    const nb = data.notebook as { records?: { key: string; value: string }[] };
    if (!nb || !Array.isArray(nb.records)) throw new NotebookError('invalid', 'Backup notebook format is not recognised.');
    const ops: KvOp[] = [];
    let added = 0, skipped = 0, keptBoth = 0;
    const idRemap = new Map<string, string>();
    // observations grouped by id
    const obsRows = nb.records.filter((r) => /^obs\/[^/]+\/\d{6}$/.test(r.key));
    const byId = new Map<string, Observation[]>();
    for (const r of obsRows) {
      const o = Observation.parse(JSON.parse(r.value));
      byId.set(o.id, [...(byId.get(o.id) ?? []), o]);
    }
    for (const [id, revs] of byId) {
      const existing = await this.revisions(id);
      if (!existing.length) {
        for (const o of revs) ops.push({ type: 'put', key: revKey(id, o.revision), value: JSON.stringify(o) });
        added++;
      } else if (existing.at(-1)!.revisionHash === revs.sort((a, b) => a.revision - b.revision).at(-1)!.revisionHash) {
        skipped++;
      } else {
        const nid = uuidv4();
        idRemap.set(id, nid);
        for (const o of revs) ops.push({ type: 'put', key: revKey(nid, o.revision), value: JSON.stringify({ ...o, id: nid, revisionReason: o.revision === 1 ? `Restored copy of ${id}` : o.revisionReason }) });
        keptBoth++;
      }
    }
    for (const r of nb.records.filter((x) => x.key.startsWith('att/'))) {
      const a = Attachment.parse(JSON.parse(r.value));
      if (await this.kv.get(r.key)) continue;
      const bytes = data.media[a.relativePrivatePath];
      if (!bytes || sha256Hex(bytes) !== a.sha256) throw new NotebookError('invalid', 'A photo in the backup is missing or does not match its checksum. Nothing was restored.');
      await this.kv.putBlob(a.relativePrivatePath, bytes);
      ops.push({ type: 'put', key: r.key, value: JSON.stringify(a) });
    }
    for (const r of nb.records.filter((x) => x.key.startsWith('bm/') || x.key.startsWith('col/'))) {
      if (!(await this.kv.get(r.key))) ops.push({ type: 'put', key: r.key, value: r.value });
    }
    await this.kv.commit(ops);
    return { added, skipped, keptBoth };
  }

  /** Insert pre-built records verbatim (used only for the separate demo notebook). */
  async seed(revisions: Observation[], attachments: { attachment: Attachment; bytes: Uint8Array }[]) {
    for (const a of attachments) await this.kv.putBlob(a.attachment.relativePrivatePath, a.bytes);
    await this.kv.commit([
      ...attachments.map((a) => ({ type: 'put' as const, key: `att/${a.attachment.id}`, value: JSON.stringify(a.attachment) })),
      ...revisions.map((r) => ({ type: 'put' as const, key: revKey(r.id, r.revision), value: JSON.stringify(r) })),
    ]);
  }

  async wipe() {
    await this.kv.wipe();
  }
}
