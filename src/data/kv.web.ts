/**
 * Browser-preview backend: IndexedDB (one object store for records, one for blobs).
 * Not encrypted. The browser preview is for review only and says so in the UI.
 */
import type { KvBackend, KvOp } from './kv.types';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export class IdbKv implements KvBackend {
  readonly name = 'indexeddb';
  readonly protection = 'Browser preview: data is kept in this browser’s IndexedDB for this site only, without encryption. Use the native app for real evidence.';
  private db!: IDBDatabase;
  constructor(private store: 'private' | 'demo') {}
  async init() {
    if (this.db) return;
    this.db = await new Promise<IDBDatabase>((res, rej) => {
      const o = indexedDB.open(`sightline-${this.store}`, 1);
      o.onupgradeneeded = () => {
        o.result.createObjectStore('kv');
        o.result.createObjectStore('blobs');
      };
      o.onsuccess = () => res(o.result);
      o.onerror = () => rej(o.error);
    });
  }
  private tx(stores: string[], mode: IDBTransactionMode) {
    return this.db.transaction(stores, mode);
  }
  async get(k: string) {
    return ((await req(this.tx(['kv'], 'readonly').objectStore('kv').get(k))) as string | undefined) ?? null;
  }
  async list(prefix: string) {
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff');
    const s = this.tx(['kv'], 'readonly').objectStore('kv');
    const [keys, vals] = await Promise.all([req(s.getAllKeys(range)), req(s.getAll(range))]);
    return keys.map((k, i) => ({ key: String(k), value: vals[i] as string }));
  }
  async commit(ops: KvOp[]) {
    if (!ops.length) return;
    const t = this.tx(['kv'], 'readwrite');
    const s = t.objectStore('kv');
    for (const o of ops) {
      if (o.type === 'put') s.put(o.value, o.key);
      else s.delete(o.key);
    }
    await new Promise<void>((res, rej) => {
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error ?? new Error('transaction aborted'));
    });
  }
  async putBlob(id: string, bytes: Uint8Array) {
    await req(this.tx(['blobs'], 'readwrite').objectStore('blobs').put(bytes.slice(), id));
  }
  async getBlob(id: string) {
    const v = (await req(this.tx(['blobs'], 'readonly').objectStore('blobs').get(id))) as Uint8Array | undefined;
    return v ? new Uint8Array(v) : null;
  }
  async delBlob(id: string) {
    await req(this.tx(['blobs'], 'readwrite').objectStore('blobs').delete(id));
  }
  async listBlobs() {
    return (await req(this.tx(['blobs'], 'readonly').objectStore('blobs').getAllKeys())).map(String);
  }
  async freeBytes() {
    try {
      const e = await navigator.storage?.estimate?.();
      return e?.quota != null && e.usage != null ? e.quota - e.usage : null;
    } catch {
      return null;
    }
  }
  async wipe() {
    const t = this.tx(['kv', 'blobs'], 'readwrite');
    t.objectStore('kv').clear();
    t.objectStore('blobs').clear();
    await new Promise<void>((res) => (t.oncomplete = () => res()));
  }
}

export function createKv(store: 'private' | 'demo'): KvBackend {
  return new IdbKv(store);
}
export const PLATFORM_KIND: 'native' | 'web' = 'web';
