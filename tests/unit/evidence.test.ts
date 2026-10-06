import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { strToU8, zipSync, strFromU8 } from 'fflate';
import { buildEvidenceZip, verifyEvidenceZip, type EvidenceResult } from '../../src/domain/evidence';
import { DEMO_INSTALLATION, DEMO_CLAIMS, DEMO_SOURCE, DEMO_PHOTO_SOURCE, demoObservationRevisions } from '../../src/domain/demo';
import { DEFAULT_DISCLOSURE, projectPublic, captions } from '../../src/domain/projection';
import { readZipSafely, writeZipDeterministic, UnsafeArchiveError } from '../../src/domain/safezip';
import { hasSensitiveMetadata, decodeJpeg, renderPublicDerivative } from '../../src/domain/image';
import { sha256Hex } from '../../src/domain/hash';

const original = new Uint8Array(readFileSync('tests/fixtures/demo-photo-with-exif.jpg'));
const revs = demoObservationRevisions();
const obs = revs[1];
const mask = { type: 'mask' as const, shape: 'rect' as const, x: 0.5, y: 0.5, w: 0.25, h: 0.25 };

async function build(over: Partial<Parameters<typeof buildEvidenceZip>[0]> = {}): Promise<EvidenceResult> {
  return buildEvidenceZip({
    observation: obs,
    sources: [DEMO_SOURCE, DEMO_PHOTO_SOURCE],
    claims: DEMO_CLAIMS,
    installation: DEMO_INSTALLATION,
    photos: [{ attachment: { id: 'a1', sha256: sha256Hex(original), mime: 'image/jpeg', transformations: [mask], redactionReviewedAt: null }, originalBytes: original }],
    revisions: revs.map((r) => ({ revision: r.revision, revisionHash: r.revisionHash, previousRevisionHash: r.previousRevisionHash, recordedAt: r.deviceRecordedAt, reason: r.revisionReason })),
    createdAt: '2026-09-15T09:10:00.000Z',
    exportId: 'test-export',
    ...over,
  });
}

let ev: EvidenceResult;
beforeAll(async () => {
  ev = await build();
});

describe('A15 public projection never leaks private fields', () => {
  it('excludes observer coordinates, notes, device info, filenames and EXIF in every file', () => {
    expect(hasSensitiveMetadata(original).length).toBeGreaterThan(0); // fixture really has EXIF GPS
    const entries = readZipSafely(ev.zip);
    for (const [name, bytes] of entries) {
      const t = Buffer.from(bytes).toString('latin1');
      for (const f of ['DEMO NOTE', '41.14905', '-73.25102', 'DemoPhone', 'DemoMake', 'demo-photo-with-exif', 'America/New_York'])
        expect(t.includes(f), `${f} leaked in ${name}`).toBe(false);
      if (name.endsWith('.jpg')) expect(hasSensitiveMetadata(bytes)).toEqual([]);
    }
  });
  it('equipment coordinates only appear when deliberately selected, and are rounded', async () => {
    expect(ev.projection.equipmentCoordinates).toBeNull();
    expect(ev.projection.claims.find((c) => c.fieldPath === 'location.coordinates')).toBeUndefined();
    const withCoords = projectPublic({ observation: obs, sources: [DEMO_SOURCE], claims: DEMO_CLAIMS, installation: DEMO_INSTALLATION }, { ...DEFAULT_DISCLOSURE, includeEquipmentCoordinates: true, coordinateDecimals: 3 });
    expect(withCoords.equipmentCoordinates).toEqual({ lat: 41.15, lon: -73.25, method: 'source_map' });
  });
  it('precise time is generalized to month by default', () => {
    expect(ev.projection.observedDateText).toBe('September 2026');
  });
  it('demo exports are marked everywhere', () => {
    expect(ev.manifest.demonstration).toBe(true);
    expect(strFromU8(ev.files['README.txt'])).toContain('DEMONSTRATION');
    expect(captions(ev.projection).neutral).toContain('DEMONSTRATION');
  });
  it('private-full-evidence requires explicit confirmation', async () => {
    await expect(build({ profile: 'private-full-evidence' })).rejects.toThrow(/explicit confirmation/);
    const full = await build({ profile: 'private-full-evidence', privateFullConfirmed: true });
    expect(Object.keys(full.files)).toContain('private/original-01.jpg');
    expect(verifyEvidenceZip(full.zip).status).toBe('match');
  });
});

describe('A16 redaction is burned into derivative pixels', () => {
  it('masked region is solid colour in the derivative and original bytes are unchanged', () => {
    const before = sha256Hex(original);
    const d = renderPublicDerivative(original, [mask]);
    const img = decodeJpeg(d.bytes);
    const cx = Math.floor(img.width * 0.625), cy = Math.floor(img.height * 0.625);
    const i = (cy * img.width + cx) * 4;
    // mask colour #172624 (23,38,36) within JPEG tolerance
    expect(Math.abs(img.data[i] - 23)).toBeLessThan(12);
    expect(Math.abs(img.data[i + 1] - 38)).toBeLessThan(12);
    expect(Math.abs(img.data[i + 2] - 36)).toBeLessThan(12);
    expect(sha256Hex(original)).toBe(before);
  });
});

describe('A19 evidence package verification', () => {
  it('has the required layout and checksums cover the manifest but not themselves', () => {
    const names = Object.keys(ev.files).sort();
    for (const n of ['manifest.json', 'records/observation.json', 'records/revisions.json', 'sources/sources.json', 'media/approved-derivative-01.jpg', 'report.pdf', 'README.txt', 'LICENSES.txt', 'checksums.sha256'])
      expect(names).toContain(n);
    const sums = strFromU8(ev.files['checksums.sha256']);
    expect(sums).toContain('  manifest.json');
    expect(sums).not.toContain('checksums.sha256');
    expect(ev.manifest.files.map((f) => f.relativePath)).not.toContain('manifest.json');
    expect(ev.manifest.limitations).toHaveLength(5);
  });
  it('verifies an unmodified package with honest wording', () => {
    const v = verifyEvidenceZip(ev.zip);
    expect(v.status).toBe('match');
    expect(v.headline).toBe('File checksums match this manifest');
  });
  it('detects a modified payload file', () => {
    const files = Object.fromEntries(readZipSafely(ev.zip));
    files['records/observation.json'] = strToU8('{"tampered":true}');
    expect(verifyEvidenceZip(writeZipDeterministic(files)).status).toBe('mismatch');
  });
  it('detects a modified manifest even if payload unchanged', () => {
    const files = Object.fromEntries(readZipSafely(ev.zip));
    const m = JSON.parse(strFromU8(files['manifest.json']));
    m.recordRevision = 99;
    files['manifest.json'] = strToU8(JSON.stringify(m));
    const v = verifyEvidenceZip(writeZipDeterministic(files));
    expect(v.status).toBe('mismatch');
  });
  it('detects unlisted extra files', () => {
    const files = Object.fromEntries(readZipSafely(ev.zip));
    files['media/extra.jpg'] = strToU8('x');
    expect(verifyEvidenceZip(writeZipDeterministic(files)).details).toContain('UNLISTED media/extra.jpg');
  });
  it('rejects path traversal', () => {
    const z = zipSync({ '../evil.txt': strToU8('x'), 'manifest.json': strToU8('{}') });
    const v = verifyEvidenceZip(z);
    expect(v.status).toBe('unsafe');
    expect(() => readZipSafely(z)).toThrow(UnsafeArchiveError);
  });
  it('rejects absolute paths and duplicate entries', () => {
    expect(() => readZipSafely(zipSync({ '/etc/passwd': strToU8('x') }))).toThrow(UnsafeArchiveError);
  });
  it('rejects zip bombs by decompressed size limit', () => {
    const big = new Uint8Array(5_000_000);
    const z = zipSync({ 'a.bin': big }, { level: 9 });
    expect(() => readZipSafely(z, { maxArchiveBytes: 1e8, maxTotalUncompressed: 1_000_000, maxFileBytes: 1_000_000, maxEntries: 10 })).toThrow(UnsafeArchiveError);
  });
  it('rejects unknown schema versions', () => {
    const files = Object.fromEntries(readZipSafely(ev.zip));
    const m = JSON.parse(strFromU8(files['manifest.json']));
    m.schemaVersion = 2;
    files['manifest.json'] = strToU8(JSON.stringify(m));
    const v = verifyEvidenceZip(writeZipDeterministic(files));
    expect(v.status).toBe('unsupported');
  });
  it('output is deterministic for identical input', async () => {
    const again = await build();
    expect(again.zipSha256).toBe(ev.zipSha256);
  });
});
