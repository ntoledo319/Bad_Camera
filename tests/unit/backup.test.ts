import { describe, it, expect } from 'vitest';
import { createBackup, openBackup, readBackupHeader, BackupError, planRestore } from '../../src/domain/backup';

const FAST = { N: 2 ** 14, r: 8, p: 1 };
const contents = { notebook: { observations: [{ id: 'o1', revisionHash: 'h1' }] }, media: { abc123: new Uint8Array([1, 2, 3, 4]) } };
const counts = { observations: 1, media: 1, bookmarks: 0, collections: 0 };

describe('A20 encrypted backup', () => {
  it('round-trips with the right passphrase and records parameters', async () => {
    const b = await createBackup(contents, 'correct horse battery', counts, { kdf: FAST });
    const { header } = readBackupHeader(b);
    expect(header.kdf).toMatchObject({ name: 'scrypt', N: FAST.N, r: 8, p: 1, dkLen: 32 });
    expect(header.aead.name).toBe('xchacha20poly1305');
    expect(header.counts).toEqual(counts);
    const out = await openBackup(b, 'correct horse battery');
    expect(out.contents.notebook).toEqual(contents.notebook);
    expect(Array.from(out.contents.media.abc123)).toEqual([1, 2, 3, 4]);
    // ciphertext should not contain plaintext
    expect(Buffer.from(readBackupHeader(b).ciphertext).toString('latin1')).not.toContain('"id":"o1"');
  });
  it('fails clearly with the wrong passphrase', async () => {
    const b = await createBackup(contents, 'correct horse battery', counts, { kdf: FAST });
    await expect(openBackup(b, 'wrong passphrase!!')).rejects.toMatchObject({ code: 'wrong_passphrase_or_corrupt' });
  });
  it('fails clearly on corruption and header tampering', async () => {
    const b = await createBackup(contents, 'correct horse battery', counts, { kdf: FAST });
    const c = b.slice();
    c[c.length - 5] ^= 0xff;
    await expect(openBackup(c, 'correct horse battery')).rejects.toMatchObject({ code: 'wrong_passphrase_or_corrupt' });
    const text = Buffer.from(b).toString('latin1').replace('"observations":1', '"observations":9');
    await expect(openBackup(new Uint8Array(Buffer.from(text, 'latin1')), 'correct horse battery')).rejects.toBeInstanceOf(BackupError);
  });
  it('rejects non-backups, weak params and weak passphrases', async () => {
    expect(() => readBackupHeader(new Uint8Array([1, 2, 3]))).toThrow(BackupError);
    const b = await createBackup(contents, 'correct horse battery', counts, { kdf: FAST });
    const weak = Buffer.from(b).toString('latin1').replace(`"N":${FAST.N}`, '"N":1024');
    expect(() => readBackupHeader(new Uint8Array(Buffer.from(weak, 'latin1')))).toThrow(/unsupported or unsafe/);
    await expect(createBackup(contents, 'short', counts, { kdf: FAST })).rejects.toMatchObject({ code: 'weak_passphrase' });
  });
  it('restore planning never overwrites silently', () => {
    const existing = [{ id: 'a', revisionHash: 'x' }, { id: 'b', revisionHash: 'y' }];
    const incoming = [{ id: 'a', revisionHash: 'x' }, { id: 'b', revisionHash: 'z' }, { id: 'c', revisionHash: 'w' }];
    let n = 0;
    const plan = planRestore(existing, incoming, () => `new-${++n}`);
    expect(plan.map((p) => p.action)).toEqual(['identical_skip', 'keep_both', 'add']);
    expect(plan[1].newId).toBe('new-1');
  });
});
