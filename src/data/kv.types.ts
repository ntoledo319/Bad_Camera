/** Minimal transactional key-value + blob backend used by the private notebook and the public cache. */
export interface KvOp {
  type: 'put' | 'del';
  key: string;
  value?: string;
}

export interface KvBackend {
  readonly name: string;
  /** Human-readable, truthful description of at-rest protection for Settings → Privacy. */
  readonly protection: string;
  init(): Promise<void>;
  get(key: string): Promise<string | null>;
  list(prefix: string): Promise<{ key: string; value: string }[]>;
  /** All ops commit atomically or none do. */
  commit(ops: KvOp[]): Promise<void>;
  putBlob(id: string, bytes: Uint8Array): Promise<void>;
  getBlob(id: string): Promise<Uint8Array | null>;
  delBlob(id: string): Promise<void>;
  listBlobs(): Promise<string[]>;
  /** Bytes available for new writes, or null if the platform can't tell. */
  freeBytes(): Promise<number | null>;
  wipe(): Promise<void>;
}

export class MemoryKv implements KvBackend {
  readonly name = 'memory';
  readonly protection = 'In-memory test backend (no persistence).';
  map = new Map<string, string>();
  blobs = new Map<string, Uint8Array>();
  failNextCommit = false;
  free: number | null = 10_000_000_000;
  async init() {}
  async get(k: string) {
    return this.map.get(k) ?? null;
  }
  async list(prefix: string) {
    return [...this.map.entries()].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ({ key, value }));
  }
  async commit(ops: KvOp[]) {
    if (this.failNextCommit) {
      this.failNextCommit = false;
      throw new Error('simulated commit failure');
    }
    const next = new Map(this.map);
    for (const o of ops) {
      if (o.type === 'put') next.set(o.key, o.value!);
      else next.delete(o.key);
    }
    this.map = next;
  }
  async putBlob(id: string, b: Uint8Array) {
    this.blobs.set(id, b.slice());
  }
  async getBlob(id: string) {
    return this.blobs.get(id)?.slice() ?? null;
  }
  async delBlob(id: string) {
    this.blobs.delete(id);
  }
  async listBlobs() {
    return [...this.blobs.keys()];
  }
  async freeBytes() {
    return this.free;
  }
  async wipe() {
    this.map.clear();
    this.blobs.clear();
  }
}
