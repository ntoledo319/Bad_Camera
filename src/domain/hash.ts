/**
 * Hashing contracts. SHA-256 via @noble/hashes (audited, pure JS, works on Hermes/web/node).
 * Canonical JSON via `canonicalize` (an RFC 8785 JCS implementation).
 */
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import canonicalize from 'canonicalize';

export function sha256Hex(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? utf8ToBytes(data) : data;
  return bytesToHex(sha256(bytes));
}

export function canonicalJson(value: unknown): string {
  const s = canonicalize(value as object);
  if (s === undefined) throw new Error('Value cannot be canonicalized');
  return s;
}

/**
 * Revision hash = SHA-256(JCS({schemaVersion, previousRevisionHash, content})).
 * NOTE: a local hash chain can be rewritten by anyone controlling the device. It is
 * not a trusted timestamp or an authenticated chain of custody.
 */
export function revisionHash(schemaVersion: number, previousRevisionHash: string | null, content: unknown): string {
  return sha256Hex(canonicalJson({ schemaVersion, previousRevisionHash, content }));
}

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (!c?.getRandomValues) throw new Error('Secure random source unavailable');
  c.getRandomValues(out);
  return out;
}

export function uuidv4(): string {
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = bytesToHex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export { bytesToHex, utf8ToBytes };
