import { describe, it, expect } from 'vitest';
import { strFromU8 } from 'fflate';
import { makeUserSource, validateSourceUrl } from '../../src/domain/userSource';
import { reviseObservation, verifyChain } from '../../src/domain/observation';
import { buildEvidenceZip, verifyEvidenceZip } from '../../src/domain/evidence';
import { projectPublic, sourceStatusLabel } from '../../src/domain/projection';
import { readZipSafely } from '../../src/domain/safezip';
import { demoObservationRevisions } from '../../src/domain/demo';
import { claimDisplay, directionLabel } from '../../src/features/format';

describe('user-added source links', () => {
  it('accepts http(s) links and normalises bare domains', () => {
    expect(validateSourceUrl('example.org/minutes.pdf')).toEqual({ ok: true, url: 'https://example.org/minutes.pdf' });
    expect(validateSourceUrl('http://town.gov/doc')).toMatchObject({ ok: true });
  });

  it('rejects script, file, data, credential and host-less links', () => {
    for (const bad of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,hi', 'https://user:pw@example.org/', 'https://localhost/x', '', 'not a url at all']) {
      expect(validateSourceUrl(bad).ok, bad).toBe(false);
    }
  });

  it('builds a Source labelled as user-entered and never fetched', () => {
    const r = makeUserSource({ title: '', url: 'https://www.example.org/a', kind: 'news' }, '2026-10-06T00:00:00.000Z');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.source.id.startsWith('usr-')).toBe(true);
    expect(r.source.title).toBe('example.org');
    expect(r.source.availability).toBe('notChecked');
    expect(r.source.retrievalMethod).toMatch(/not fetched/);
  });

  it('adding a source appends a revision and keeps the chain intact', () => {
    const revs = demoObservationRevisions();
    const src = makeUserSource({ title: 'Minutes', url: 'https://example.org/m', kind: 'officialRecord' });
    if (!src.ok) throw new Error(src.message);
    const next = reviseObservation(revs.at(-1)!, { userSources: [src.source] }, 'Added source');
    expect(next.revision).toBe(revs.at(-1)!.revision + 1);
    expect(verifyChain([...revs, next])).toBe(-1);
  });

  it('flows into the public projection and evidence package with its own status', async () => {
    const revs = demoObservationRevisions();
    const src = makeUserSource({ title: 'Council minutes', url: 'https://example.org/m.pdf', kind: 'news' });
    if (!src.ok) throw new Error(src.message);
    const obs = { ...revs.at(-1)!, userSources: [src.source] };
    const p = projectPublic({ observation: obs, sources: [src.source], claims: [], installation: null });
    expect(p.sourceStatus).toBe('News report cited');
    expect(p.sources.some((s) => s.url === 'https://example.org/m.pdf')).toBe(true);
    const ev = await buildEvidenceZip({ observation: obs, sources: [src.source], claims: [], installation: null, photos: [], revisions: [], createdAt: '2026-10-06T00:00:00.000Z', exportId: 'u1' });
    expect(verifyEvidenceZip(ev.zip).status).toBe('match');
    const sources = strFromU8(readZipSafely(ev.zip).get('sources/sources.json')!);
    expect(sources).toContain('Council minutes');
  });

  it('source status distinguishes each source kind', () => {
    expect(sourceStatusLabel([{ kind: 'manufacturer' }], [])).toBe('Manufacturer page cited');
    expect(sourceStatusLabel([{ kind: 'other' }], [])).toBe('Source cited');
    expect(sourceStatusLabel([], [])).toBe('No source attached');
  });
});

describe('claim display labels', () => {
  it('turns raw field paths and values into readable text without changing meaning', () => {
    expect(claimDisplay('category', 'alpr')).toEqual({ label: 'Equipment type', value: 'Plate reader (ALPR)' });
    expect(claimDisplay('hardware.mount', 'pole').value).toBe('Pole');
    expect(claimDisplay('operator.name', 'Fairfield Police Department').value).toBe('Fairfield Police Department');
    expect(claimDisplay('location.coordinates', '41.1640694,-73.2338514').value).toBe('41.16407, -73.23385');
    expect(claimDisplay('operator.name', null).value).toBe('Not established');
    expect(claimDisplay('some.unknown_field', 'x').label).toBe('some.unknown_field');
  });

  it('formats numeric bearings with a cardinal and keeps free text as written', () => {
    expect(directionLabel('120')).toBe('120° (SE)');
    expect(directionLabel('359')).toBe('359° (N)');
    expect(directionLabel('-90')).toBe('-90° (W)');
    expect(directionLabel('northbound')).toBe('northbound');
  });
});
