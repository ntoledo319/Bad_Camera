import { describe, it, expect } from 'vitest';
import { createObservation, reviseObservation, verifyChain } from '../../src/domain/observation';
import { candidatesFor, validateIdentification, PHOTO_AI_ENABLED } from '../../src/domain/identify';
import { CATALOG } from '../../content/catalog/catalog';
import { buildRecordsRequest } from '../../src/domain/records';
import { safeUrl, projectPublic } from '../../src/domain/projection';
import { CatalogEntry, LegalArticle } from '../../src/domain/schemas';
import { LEGAL_ARTICLES } from '../../content/legal/legal';
import { SOURCE_BY_ID } from '../../content/sources';
import { demoObservationRevisions, DEMO_SOURCE, DEMO_CLAIMS, DEMO_INSTALLATION } from '../../src/domain/demo';

describe('observation revisions (A13)', () => {
  it('appends revisions, keeps attachments, and the hash chain verifies', () => {
    const r1 = createObservation({ category: 'alpr', attachments: ['att1'], localNotes: 'n1' }, '2026-01-01T00:00:00Z', 'o1');
    const r2 = reviseObservation(r1, { localNotes: 'n2', appendAttachments: ['att2'] }, 'Added note', '2026-01-02T00:00:00Z');
    expect(r2.revision).toBe(2);
    expect(r2.attachments).toEqual(['att1', 'att2']);
    expect(r2.previousRevisionHash).toBe(r1.revisionHash);
    expect(verifyChain([r1, r2])).toBe(-1);
    expect(verifyChain([r1, { ...r2, localNotes: 'tampered' }])).toBe(1);
    expect(() => reviseObservation(r1, {}, '  ')).toThrow();
  });
  it('a correction can supersede classification without deleting history', () => {
    const r1 = createObservation({ category: 'alpr' }, '2026-01-01T00:00:00Z', 'o1');
    const r2 = reviseObservation(r1, { category: 'video' }, 'Reclassified after closer look');
    expect(r1.category).toBe('alpr');
    expect(r2.category).toBe('video');
  });
  it('observations are always private', () => {
    expect(createObservation({}).visibility).toBe('private');
  });
});

describe('identification is honest (A11)', () => {
  it('no AI provider is enabled and exact model needs documentation', () => {
    expect(PHOTO_AI_ENABLED).toBe(false);
    expect(validateIdentification('exact_model', 'possible_family_visual_features')).not.toBeNull();
    expect(validateIdentification('exact_model', 'readable_label_or_documentation')).toBeNull();
    expect(() => createObservation({ identificationLevel: 'exact_model', identificationBasis: 'unknown' })).toThrow();
  });
  it('platforms are only suggested on explicit visible text', () => {
    const noText = candidatesFor({ mounting: 'pole', form: 'box' }, CATALOG, 'alpr');
    expect(noText.some((c) => c.entry.kind === 'software_or_platform')).toBe(false);
    const fusus = candidatesFor({ visibleText: 'fusus' }, CATALOG, null);
    expect(fusus[0]?.textMatched).toBe(true);
  });
  it('catalog entries validate and every source id resolves', () => {
    for (const c of CATALOG) {
      expect(CatalogEntry.safeParse(c).success, c.id).toBe(true);
      for (const s of c.sourceIds) expect(SOURCE_BY_ID[s], `${c.id} → ${s}`).toBeDefined();
    }
  });
});

describe('legal content (A21)', () => {
  it('articles validate, cite resolvable sources and are not marked attorney-reviewed', () => {
    for (const a of LEGAL_ARTICLES) {
      expect(LegalArticle.safeParse(a).success).toBe(true);
      expect(a.reviewStatus).toBe('not_attorney_reviewed');
      for (const s of [...a.sourceIds, ...a.sections.flatMap((x) => x.sourceIds)]) expect(SOURCE_BY_ID[s], s).toBeDefined();
    }
  });
});

describe('records request template (A22)', () => {
  it('uses placeholders, invents nothing, and lists missing fields', () => {
    const r = buildRecordsRequest({ agency: '', system: '', dateRange: '', categories: [], feeLimit: '', signature: '', jurisdiction: 'generic' });
    expect(r.body).toContain('[agency]');
    expect(r.missing).toEqual(['agency', 'system', 'date range', 'categories', 'fee limit']);
    const ct = buildRecordsRequest({ agency: 'Town of Fairfield Police Department', system: 'automated license plate readers', dateRange: 'January 1, 2025 to present', categories: ['contracts', 'locations'], feeLimit: '$25', signature: '', jurisdiction: 'CT' });
    expect(ct.body).toContain('1-210');
    expect(ct.body).toContain('- Contracts and amendments');
    expect(ct.body).not.toMatch(/waive/i);
  });
});

describe('URL safety', () => {
  it('blocks javascript/file schemes', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('file:///etc/passwd')).toBeNull();
    expect(safeUrl('https://example.org/x')).toBe('https://example.org/x');
  });
});

describe('demo separation', () => {
  it('demo projection is flagged', () => {
    const p = projectPublic({ observation: demoObservationRevisions()[1], sources: [DEMO_SOURCE], claims: DEMO_CLAIMS, installation: DEMO_INSTALLATION });
    expect(p.demonstration).toBe(true);
  });
});
