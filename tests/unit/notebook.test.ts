import { describe, it, expect } from 'vitest';
import { MemoryKv } from '../../src/data/kv.types';
import { Notebook, NotebookError } from '../../src/data/notebook';
import { createBackup, openBackup } from '../../src/domain/backup';
import { verifyChain } from '../../src/domain/observation';

const photo = (n = 1000) => ({
  bytes: new Uint8Array(n).map((_, i) => (i * 7) % 251),
  mime: 'image/jpeg',
  width: 10,
  height: 10,
  origin: 'import' as const,
  originalFilenamePrivate: 'IMG_0001.JPG',
  originalMetadataPrivate: { Make: 'DemoMake' },
  receivedBytesNote: null,
});

describe('Notebook repository (A12/A13/A14)', () => {
  it('persists across a "restart" (new Notebook on the same backend)', async () => {
    const kv = new MemoryKv();
    const nb = new Notebook(kv);
    await nb.init();
    const { observation, attachments } = await nb.saveNew({ category: 'alpr', localNotes: 'hi' }, [photo()]);
    const nb2 = new Notebook(kv);
    const got = await nb2.get(observation.id);
    expect(got?.localNotes).toBe('hi');
    expect(got?.attachments).toEqual([attachments[0].id]);
    const bytes = await nb2.attachmentBytes(attachments[0].id);
    expect(bytes.length).toBe(1000);
    expect(attachments[0].relativePrivatePath).not.toContain('IMG_0001');
  });

  it('rolls back blobs and keeps the draft when the commit fails', async () => {
    const kv = new MemoryKv();
    const nb = new Notebook(kv);
    await nb.saveDraft({ step: 3 });
    kv.failNextCommit = true;
    await expect(nb.saveNew({ category: 'alpr' }, [photo()])).rejects.toBeInstanceOf(NotebookError);
    expect(await nb.listLatest()).toHaveLength(0);
    expect(kv.blobs.size).toBe(0);
    expect(await nb.draft()).toEqual({ step: 3 });
  });

  it('refuses to save when disk is nearly full', async () => {
    const kv = new MemoryKv();
    kv.free = 5_000_000;
    const nb = new Notebook(kv);
    await expect(nb.saveNew({}, [photo()])).rejects.toMatchObject({ code: 'disk_full' });
    expect(kv.blobs.size).toBe(0);
  });

  it('revisions append and never replace original bytes; redaction keeps original', async () => {
    const nb = new Notebook(new MemoryKv());
    const { observation, attachments } = await nb.saveNew({ category: 'alpr' }, [photo()]);
    const r2 = await nb.revise(observation.id, { localNotes: 'later' }, 'Added note');
    expect(r2.revision).toBe(2);
    const revs = await nb.revisions(observation.id);
    expect(revs).toHaveLength(2);
    expect(verifyChain(revs)).toBe(-1);
    const before = await nb.attachmentBytes(attachments[0].id);
    await nb.setRedaction(attachments[0].id, [{ type: 'mask', shape: 'rect', x: 0, y: 0, w: 0.5, h: 0.5 }], true);
    const after = await nb.attachmentBytes(attachments[0].id);
    expect(after).toEqual(before);
  });

  it('delete removes revisions and private bytes', async () => {
    const kv = new MemoryKv();
    const nb = new Notebook(kv);
    const { observation } = await nb.saveNew({}, [photo()]);
    await nb.delete(observation.id);
    expect(await nb.get(observation.id)).toBeNull();
    expect(kv.blobs.size).toBe(0);
    expect((await kv.list('att/')).length).toBe(0);
  });

  it('encrypted backup round-trips into a fresh install, and restoring twice keeps no duplicates', async () => {
    const nb = new Notebook(new MemoryKv());
    await nb.saveNew({ category: 'video', localNotes: 'backup me' }, [photo(2000)]);
    await nb.toggleBookmark('osm:node/1', 'Test');
    const exp = await nb.exportForBackup();
    const s = await nb.stats();
    const file = await createBackup({ notebook: exp.notebook, media: exp.media }, 'correct horse battery', { observations: s.observations, media: s.media, bookmarks: s.bookmarks, collections: s.collections }, { kdf: { N: 2 ** 14, r: 8, p: 1 } });
    const { contents: opened } = await openBackup(file, 'correct horse battery');
    const fresh = new Notebook(new MemoryKv());
    const r1 = await fresh.restore(opened);
    expect(r1.added).toBe(1);
    const r2 = await fresh.restore(opened);
    expect(r2.skipped).toBe(1);
    expect(await fresh.listLatest()).toHaveLength(1);
    expect((await fresh.listLatest())[0].localNotes).toBe('backup me');
    expect(await fresh.bookmarks()).toHaveLength(1);
  });
});
