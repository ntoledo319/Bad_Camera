import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readExif, jpegSize } from '../../src/domain/exif';

describe('EXIF reader (photo metadata is labelled, never verified)', () => {
  const b = new Uint8Array(readFileSync('tests/fixtures/demo-photo-with-exif.jpg'));
  it('reads GPS, make/model and date from the sensitive fixture', () => {
    const m = readExif(b);
    expect(m.make).toBe('DemoMake');
    expect(m.model).toBe('DemoPhone 1');
    expect(m.dateTimeOriginal).toBe('2026-09-14T11:12:00');
    expect(m.gps!.lat).toBeCloseTo(41.149, 3);
    expect(m.gps!.lon).toBeCloseTo(-73.251, 3);
    expect(jpegSize(b)).toEqual({ width: 1600, height: 1200 });
  });
  it('never throws on garbage or truncated input', () => {
    expect(readExif(new Uint8Array([1, 2, 3])).gps).toBeNull();
    expect(readExif(b.slice(0, 40)).gps).toBeNull();
    const junk = b.slice(); for (let i = 20; i < 200; i++) junk[i] = 0xff;
    expect(() => readExif(junk)).not.toThrow();
  });
});
