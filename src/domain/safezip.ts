/**
 * Safe ZIP reader for untrusted archives (evidence packages, GeoJSON zips).
 * Parses the central directory itself so it can reject, BEFORE decompressing:
 * path traversal, absolute/illegal paths, symlinks, encrypted entries, ZIP64,
 * duplicate names, too many entries and oversize declared sizes. Decompression
 * is streamed with a running byte counter, so lying size headers (zip bombs) are
 * caught on actual output. Nothing extracted is ever executed.
 */
import { Inflate, zipSync, type Zippable } from 'fflate';

export interface SafeZipLimits {
  maxArchiveBytes: number;
  maxTotalUncompressed: number;
  maxFileBytes: number;
  maxEntries: number;
}
export const DEFAULT_ZIP_LIMITS: SafeZipLimits = {
  maxArchiveBytes: 100 * 1024 * 1024,
  maxTotalUncompressed: 500 * 1024 * 1024,
  maxFileBytes: 200 * 1024 * 1024,
  maxEntries: 2000,
};

export class UnsafeArchiveError extends Error {
  constructor(
    public code: string,
    msg: string,
  ) {
    super(msg);
  }
}

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + b[o + 3] * 0x1000000;

export function validateEntryName(name: string): void {
  if (!name || name.length > 512) throw new UnsafeArchiveError('illegal_path', `Illegal path length: ${JSON.stringify(name.slice(0, 60))}`);
  if (/[\x00-\x1f\\]/.test(name)) throw new UnsafeArchiveError('illegal_path', `Illegal characters in path ${JSON.stringify(name)}`);
  if (name.startsWith('/') || /^[a-zA-Z]:/.test(name)) throw new UnsafeArchiveError('path_traversal', `Absolute path rejected: ${name}`);
  const parts = name.split('/');
  if (parts.some((p) => p === '..')) throw new UnsafeArchiveError('path_traversal', `Path traversal rejected: ${name}`);
  if (parts.some((p, i) => p === '' && i !== parts.length - 1)) throw new UnsafeArchiveError('illegal_path', `Empty path segment: ${name}`);
  if (parts.some((p) => p === '.')) throw new UnsafeArchiveError('illegal_path', `Dot segment rejected: ${name}`);
}

interface CdEntry {
  name: string;
  method: number;
  flags: number;
  compSize: number;
  uncompSize: number;
  localOffset: number;
  isDir: boolean;
}

export function readZipSafely(data: Uint8Array, limits: SafeZipLimits = DEFAULT_ZIP_LIMITS): Map<string, Uint8Array> {
  if (data.length > limits.maxArchiveBytes) throw new UnsafeArchiveError('archive_too_large', `Archive exceeds ${limits.maxArchiveBytes} bytes`);
  // Locate End Of Central Directory.
  let eocd = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 22 - 65535); i--) {
    if (u32(data, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new UnsafeArchiveError('not_zip', 'Not a ZIP archive (no end-of-central-directory record)');
  const count = u16(data, eocd + 10);
  const cdSize = u32(data, eocd + 12);
  const cdOffset = u32(data, eocd + 16);
  if (count === 0xffff || cdOffset === 0xffffffff) throw new UnsafeArchiveError('zip64_unsupported', 'ZIP64 archives are not accepted');
  if (count > limits.maxEntries) throw new UnsafeArchiveError('too_many_entries', `Archive has ${count} entries (limit ${limits.maxEntries})`);
  if (cdOffset + cdSize > data.length) throw new UnsafeArchiveError('corrupt', 'Central directory out of bounds');

  const entries: CdEntry[] = [];
  const names = new Set<string>();
  let p = cdOffset;
  let declaredTotal = 0;
  for (let i = 0; i < count; i++) {
    if (u32(data, p) !== 0x02014b50) throw new UnsafeArchiveError('corrupt', 'Bad central directory signature');
    const madeBy = u16(data, p + 4);
    const flags = u16(data, p + 8);
    const method = u16(data, p + 10);
    const compSize = u32(data, p + 20);
    const uncompSize = u32(data, p + 24);
    const nameLen = u16(data, p + 28);
    const extraLen = u16(data, p + 30);
    const commentLen = u16(data, p + 32);
    const extAttrs = u32(data, p + 38);
    const localOffset = u32(data, p + 42);
    const nameBytes = data.subarray(p + 46, p + 46 + nameLen);
    const name = new TextDecoder('utf-8', { fatal: false }).decode(nameBytes);
    p += 46 + nameLen + extraLen + commentLen;
    validateEntryName(name);
    if (names.has(name)) throw new UnsafeArchiveError('duplicate_entry', `Duplicate entry ${name}`);
    names.add(name);
    if (flags & 0x1) throw new UnsafeArchiveError('encrypted', `Encrypted entry rejected: ${name}`);
    const hostOs = madeBy >> 8;
    const unixMode = (extAttrs >>> 16) & 0xffff;
    if (hostOs === 3 && (unixMode & 0o170000) === 0o120000) throw new UnsafeArchiveError('symlink', `Symlink entry rejected: ${name}`);
    if (method !== 0 && method !== 8) throw new UnsafeArchiveError('unsupported_method', `Unsupported compression method ${method} for ${name}`);
    if (uncompSize > limits.maxFileBytes) throw new UnsafeArchiveError('file_too_large', `${name} declares ${uncompSize} bytes`);
    declaredTotal += uncompSize;
    if (declaredTotal > limits.maxTotalUncompressed) throw new UnsafeArchiveError('total_too_large', 'Declared uncompressed total exceeds limit');
    entries.push({ name, method, flags, compSize, uncompSize, localOffset, isDir: name.endsWith('/') });
  }

  const out = new Map<string, Uint8Array>();
  let actualTotal = 0;
  for (const e of entries) {
    if (e.isDir) continue;
    const lo = e.localOffset;
    if (lo + 30 > data.length || u32(data, lo) !== 0x04034b50) throw new UnsafeArchiveError('corrupt', `Bad local header for ${e.name}`);
    const start = lo + 30 + u16(data, lo + 26) + u16(data, lo + 28);
    const end = start + e.compSize;
    if (end > data.length) throw new UnsafeArchiveError('corrupt', `Entry data out of bounds: ${e.name}`);
    const comp = data.subarray(start, end);
    let bytes: Uint8Array;
    if (e.method === 0) {
      bytes = comp.slice();
    } else {
      const chunks: Uint8Array[] = [];
      let produced = 0;
      const inf = new Inflate((chunk) => {
        produced += chunk.length;
        if (produced > limits.maxFileBytes || actualTotal + produced > limits.maxTotalUncompressed)
          throw new UnsafeArchiveError('zip_bomb', `Decompressed size of ${e.name} exceeds limits`);
        chunks.push(chunk);
      });
      const STEP = 64 * 1024;
      for (let i = 0; i < comp.length; i += STEP) inf.push(comp.subarray(i, Math.min(comp.length, i + STEP)), i + STEP >= comp.length);
      if (comp.length === 0) inf.push(new Uint8Array(0), true);
      bytes = new Uint8Array(produced);
      let o = 0;
      for (const c of chunks) {
        bytes.set(c, o);
        o += c.length;
      }
    }
    if (bytes.length !== e.uncompSize) throw new UnsafeArchiveError('size_mismatch', `${e.name}: declared ${e.uncompSize} bytes, got ${bytes.length}`);
    actualTotal += bytes.length;
    out.set(e.name, bytes);
  }
  return out;
}

/** Deterministic ZIP writer: fixed timestamps, sorted entries, no extra attributes. */
export function writeZipDeterministic(files: Record<string, Uint8Array>): Uint8Array {
  const fixed = new Date('2000-01-01T00:00:00Z');
  const z: Zippable = {};
  for (const name of Object.keys(files).sort()) {
    validateEntryName(name);
    z[name] = [files[name], { mtime: fixed, level: name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.pdf') ? 0 : 6 }];
  }
  return zipSync(z);
}
