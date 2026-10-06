/**
 * Native private-store backend (iOS/Android).
 *
 * - Records: expo-sqlite database in the app's private sandbox, WAL journal, every
 *   commit() is a single exclusive transaction (all-or-nothing).
 * - Photo bytes: files with opaque random names under <documents>/<store>/blobs/, each
 *   encrypted with XChaCha20-Poly1305 (@noble/ciphers, audited) using a 256-bit key
 *   generated on first run and held in the OS Keychain / Android Keystore via
 *   expo-secure-store (WHEN_UNLOCKED_THIS_DEVICE_ONLY, not migrated to other devices).
 * - The SQLite file itself is NOT encrypted unless the app is built with
 *   expo-sqlite's `useSQLCipher` option (see docs/DECISIONS.md). The protection string
 *   below states exactly that; it is shown verbatim in Settings → Privacy.
 */
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { Directory, File, Paths } from 'expo-file-system';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import type { KvBackend, KvOp } from './kv.types';
import { randomBytes, bytesToHex } from '../domain/hash';

const KEY_NAME = (store: string) => `sightline.blobkey.${store}`;
const hexToBytes = (h: string) => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)));

export class SqliteKv implements KvBackend {
  readonly name = 'sqlite+encrypted-blobs';
  readonly protection =
    'Records are stored in the app’s private sandbox (SQLite, not encrypted by Sightline in this build). Photo files are encrypted with XChaCha20-Poly1305 using a key kept in the device Keychain/Keystore. Android cloud backup is disabled for this app. Anyone who can unlock and inspect this phone may still access app data.';
  private db!: SQLite.SQLiteDatabase;
  private key!: Uint8Array;
  private dir!: Directory;
  constructor(private store: 'private' | 'demo') {}

  async init() {
    if (this.db) return;
    this.db = await SQLite.openDatabaseAsync(`sightline-${this.store}.db`);
    await this.db.execAsync('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL);');
    let hex = await SecureStore.getItemAsync(KEY_NAME(this.store));
    if (!hex) {
      hex = bytesToHex(randomBytes(32));
      await SecureStore.setItemAsync(KEY_NAME(this.store), hex, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    }
    this.key = hexToBytes(hex);
    this.dir = new Directory(Paths.document, `sightline-${this.store}`, 'blobs');
    if (!this.dir.exists) this.dir.create({ intermediates: true });
  }
  async get(k: string) {
    const r = await this.db.getFirstAsync<{ v: string }>('SELECT v FROM kv WHERE k = ?', k);
    return r?.v ?? null;
  }
  async list(prefix: string) {
    const rows = await this.db.getAllAsync<{ k: string; v: string }>("SELECT k, v FROM kv WHERE k >= ? AND k < ? ORDER BY k", prefix, prefix + '\uffff');
    return rows.map((r) => ({ key: r.k, value: r.v }));
  }
  async commit(ops: KvOp[]) {
    if (!ops.length) return;
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      for (const o of ops) {
        if (o.type === 'put') await txn.runAsync('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)', o.key, o.value!);
        else await txn.runAsync('DELETE FROM kv WHERE k = ?', o.key);
      }
    });
  }
  private file(id: string) {
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) throw new Error('invalid blob id');
    return new File(this.dir, id);
  }
  async putBlob(id: string, bytes: Uint8Array) {
    const nonce = randomBytes(24);
    const ct = xchacha20poly1305(this.key, nonce, new TextEncoder().encode(id)).encrypt(bytes);
    const out = new Uint8Array(24 + ct.length);
    out.set(nonce, 0);
    out.set(ct, 24);
    const f = this.file(id);
    if (f.exists) f.delete();
    f.create();
    f.write(out);
  }
  async getBlob(id: string) {
    const f = this.file(id);
    if (!f.exists) return null;
    const data = await f.bytes();
    try {
      return xchacha20poly1305(this.key, data.slice(0, 24), new TextEncoder().encode(id)).decrypt(data.slice(24));
    } catch {
      return null;
    }
  }
  async delBlob(id: string) {
    const f = this.file(id);
    if (f.exists) f.delete();
  }
  async listBlobs() {
    return this.dir.list().map((e) => e.name);
  }
  async freeBytes() {
    try {
      return Paths.availableDiskSpace;
    } catch {
      return null;
    }
  }
  async wipe() {
    await this.db.execAsync('DELETE FROM kv;');
    if (this.dir.exists) this.dir.delete();
    this.dir.create({ intermediates: true });
  }
}

export function createKv(store: 'private' | 'demo'): KvBackend {
  return new SqliteKv(store);
}
export const PLATFORM_KIND: 'native' | 'web' = 'native';
