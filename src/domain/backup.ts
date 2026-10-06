/**
 * Encrypted notebook backup (private format — distinct from the public evidence ZIP).
 *
 * Container:  "SIGHTLINE-BACKUP\n" + header JSON line + "\n" + ciphertext
 *   header = { v:1, kdf:{name:'scrypt',N,r,p,dkLen:32,salt(b64)}, aead:{name:'xchacha20poly1305',nonce(b64)}, createdAt, counts }
 *   AAD    = exact header line bytes (so header tampering fails authentication)
 *   plaintext = deterministic ZIP of { notebook.json, media/<opaque-id> ... }
 *
 * Audited primitives only: @noble/hashes scrypt, @noble/ciphers XChaCha20-Poly1305.
 * Wrong passphrase / corruption => BackupError, nothing is returned for partial restore.
 */
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { strToU8, strFromU8 } from 'fflate';
import { randomBytes, sha256Hex } from './hash';
import { readZipSafely, writeZipDeterministic, UnsafeArchiveError } from './safezip';

export const BACKUP_MAGIC = 'SIGHTLINE-BACKUP\n';
export const BACKUP_VERSION = 1;
export const DEFAULT_KDF = { N: 2 ** 16, r: 8, p: 2 } as const;
/** Lower bound we accept when *reading* (prevents downgrade to trivially weak params). */
const MIN_N = 2 ** 14;
const MAX_N = 2 ** 20;

export class BackupError extends Error {
  constructor(public code: 'not_backup' | 'unsupported_version' | 'bad_header' | 'wrong_passphrase_or_corrupt' | 'invalid_contents' | 'weak_passphrase', message: string) {
    super(message);
  }
}

export interface BackupHeader {
  v: number;
  kdf: { name: 'scrypt'; N: number; r: number; p: number; dkLen: 32; salt: string };
  aead: { name: 'xchacha20poly1305'; nonce: string };
  createdAt: string;
  counts: { observations: number; media: number; bookmarks: number; collections: number };
}

const b64 = {
  enc(u: Uint8Array): string {
    let s = '';
    for (const c of u) s += String.fromCharCode(c);
    return btoa(s);
  },
  dec(s: string): Uint8Array {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
};

export function passphraseProblem(p: string): string | null {
  if (p.length < 10) return 'Use at least 10 characters. A few random words work well.';
  return null;
}

async function deriveKey(pass: string, k: BackupHeader['kdf']): Promise<Uint8Array> {
  return scryptAsync(strToU8(pass.normalize('NFKC')), b64.dec(k.salt), { N: k.N, r: k.r, p: k.p, dkLen: 32 });
}

export interface BackupContents {
  notebook: unknown;
  media: Record<string, Uint8Array>;
}

export async function createBackup(
  contents: BackupContents,
  passphrase: string,
  counts: BackupHeader['counts'],
  opts: { kdf?: { N: number; r: number; p: number }; createdAt?: string } = {},
): Promise<Uint8Array> {
  const problem = passphraseProblem(passphrase);
  if (problem) throw new BackupError('weak_passphrase', problem);
  const kdf = opts.kdf ?? DEFAULT_KDF;
  const header: BackupHeader = {
    v: BACKUP_VERSION,
    kdf: { name: 'scrypt', N: kdf.N, r: kdf.r, p: kdf.p, dkLen: 32, salt: b64.enc(randomBytes(16)) },
    aead: { name: 'xchacha20poly1305', nonce: b64.enc(randomBytes(24)) },
    createdAt: opts.createdAt ?? new Date().toISOString(),
    counts,
  };
  const files: Record<string, Uint8Array> = { 'notebook.json': strToU8(JSON.stringify(contents.notebook)) };
  for (const [id, bytes] of Object.entries(contents.media)) {
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw new BackupError('invalid_contents', 'Media ids must be opaque tokens.');
    files[`media/${id}`] = bytes;
  }
  const plain = writeZipDeterministic(files);
  const headerLine = strToU8(JSON.stringify(header));
  const key = await deriveKey(passphrase, header.kdf);
  const ct = xchacha20poly1305(key, b64.dec(header.aead.nonce), headerLine).encrypt(plain);
  key.fill(0);
  const magic = strToU8(BACKUP_MAGIC);
  const out = new Uint8Array(magic.length + headerLine.length + 1 + ct.length);
  out.set(magic, 0);
  out.set(headerLine, magic.length);
  out[magic.length + headerLine.length] = 0x0a;
  out.set(ct, magic.length + headerLine.length + 1);
  return out;
}

/** Parse the unencrypted header for a restore preview (counts/date) without the passphrase. */
export function readBackupHeader(data: Uint8Array): { header: BackupHeader; headerLine: Uint8Array; ciphertext: Uint8Array } {
  const magic = strToU8(BACKUP_MAGIC);
  if (data.length < magic.length + 2 || !magic.every((b, i) => data[i] === b)) throw new BackupError('not_backup', 'This file is not a Sightline backup.');
  const start = magic.length;
  const nl = data.indexOf(0x0a, start);
  if (nl < 0 || nl - start > 4096) throw new BackupError('bad_header', 'Backup header is damaged.');
  const headerLine = data.slice(start, nl);
  let header: BackupHeader;
  try {
    header = JSON.parse(strFromU8(headerLine));
  } catch {
    throw new BackupError('bad_header', 'Backup header is damaged.');
  }
  if (header.v !== BACKUP_VERSION) throw new BackupError('unsupported_version', `Backup format version ${String(header.v)} is not supported by this app version.`);
  const k = header.kdf;
  if (k?.name !== 'scrypt' || !(k.N >= MIN_N && k.N <= MAX_N) || (k.N & (k.N - 1)) !== 0 || k.r < 1 || k.r > 32 || k.p < 1 || k.p > 16 || header.aead?.name !== 'xchacha20poly1305')
    throw new BackupError('bad_header', 'Backup uses unsupported or unsafe parameters.');
  return { header, headerLine, ciphertext: data.slice(nl + 1) };
}

export async function openBackup(data: Uint8Array, passphrase: string): Promise<{ header: BackupHeader; contents: BackupContents }> {
  const { header, headerLine, ciphertext } = readBackupHeader(data);
  const key = await deriveKey(passphrase, header.kdf);
  let plain: Uint8Array;
  try {
    plain = xchacha20poly1305(key, b64.dec(header.aead.nonce), headerLine).decrypt(ciphertext);
  } catch {
    throw new BackupError('wrong_passphrase_or_corrupt', 'Wrong passphrase, or the backup file is damaged. Your current notebook was not changed.');
  } finally {
    key.fill(0);
  }
  let entries: Map<string, Uint8Array>;
  try {
    entries = readZipSafely(plain);
  } catch (e) {
    throw new BackupError('invalid_contents', `Backup contents are invalid${e instanceof UnsafeArchiveError ? ` (${e.code})` : ''}.`);
  }
  const nb = entries.get('notebook.json');
  if (!nb) throw new BackupError('invalid_contents', 'Backup has no notebook data.');
  let notebook: unknown;
  try {
    notebook = JSON.parse(strFromU8(nb));
  } catch {
    throw new BackupError('invalid_contents', 'Backup notebook data is invalid.');
  }
  const media: Record<string, Uint8Array> = {};
  for (const [name, bytes] of entries) if (name.startsWith('media/')) media[name.slice(6)] = bytes;
  return { header, contents: { notebook, media } };
}

// ------------------------------------------------------------- restore planning

export interface Identified {
  id: string;
  revision?: number;
  revisionHash?: string | null;
}

export type ConflictAction = 'add' | 'identical_skip' | 'keep_both';

export interface RestorePlanItem<T extends Identified> {
  incoming: T;
  action: ConflictAction;
  /** New id used when keeping both copies. */
  newId?: string;
}

/**
 * Never overwrite silently: identical records are skipped, differing records with the same id
 * are kept side by side (incoming copy gets a new id and a "restored copy" marker by the caller).
 */
export function planRestore<T extends Identified>(existing: T[], incoming: T[], newId: () => string): RestorePlanItem<T>[] {
  const byId = new Map(existing.map((e) => [e.id, e]));
  return incoming.map((inc) => {
    const ex = byId.get(inc.id);
    if (!ex) return { incoming: inc, action: 'add' };
    const same = (ex.revisionHash && ex.revisionHash === inc.revisionHash) || sha256Hex(JSON.stringify(ex)) === sha256Hex(JSON.stringify(inc));
    return same ? { incoming: inc, action: 'identical_skip' } : { incoming: inc, action: 'keep_both', newId: newId() };
  });
}
