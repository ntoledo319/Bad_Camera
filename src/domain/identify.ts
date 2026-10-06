/**
 * Guided identification rules. Rules FILTER candidates and explain why; they never output
 * probabilities. "Looks like" never becomes "confirmed".
 */
import type { CatalogEntry, ObservationFeatures, Category } from './schemas';

export interface Candidate {
  entry: CatalogEntry;
  whyMatch: string[];
  distinguish: string[];
  textMatched: boolean;
}

const MOUNT_ALIAS: Record<string, string[]> = {
  pole: ['pole'],
  streetlight: ['streetlight', 'pole'],
  building: ['building'],
  gantry: ['gantry'],
  trailer: ['trailer'],
  vehicle: ['vehicle'],
  other: ['other'],
};

export function candidatesFor(features: Partial<ObservationFeatures>, catalog: CatalogEntry[], category?: Category | null): Candidate[] {
  const text = (features.visibleText ?? '').toLowerCase().trim();
  const out: Candidate[] = [];
  for (const entry of catalog) {
    const why: string[] = [];
    const h = entry.matchHints;
    let excluded = false;
    const textMatched = !!text && h.textPatterns.some((p) => text.includes(p));
    if (textMatched) why.push(`Visible text matches “${h.textPatterns.find((p) => text.includes(p))}”`);

    if (features.mounting && features.mounting !== 'unknown') {
      const ok = h.mounting.length === 0 || MOUNT_ALIAS[features.mounting]?.some((m) => h.mounting.includes(m));
      if (ok && h.mounting.length) why.push(`Mounting (${features.mounting}) is consistent with this family`);
      if (!ok && !textMatched) excluded = true;
    }
    if (features.form && features.form !== 'unknown') {
      const ok = h.form.length === 0 || h.form.includes(features.form) || h.form.includes('unknown');
      if (ok && h.form.length) why.push(`Housing form (${features.form.replace('_', '-')}) is consistent`);
      if (!ok && !textMatched) excluded = true;
    }
    if (features.solarPanel === 'yes' && h.solar === 'common') why.push('A solar panel is commonly seen with this family');
    if (features.solarPanel === 'yes' && h.solar === 'rare' && !textMatched) excluded = true;
    if (category && category !== 'unknown' && entry.category !== category && entry.category !== 'unknown' && !textMatched) excluded = true;
    if (entry.kind === 'software_or_platform' && !textMatched) {
      // Platforms are not identifiable from appearance; only surface them on explicit text.
      excluded = true;
    }
    if (excluded) continue;
    out.push({ entry, whyMatch: why, distinguish: entry.distinguishers, textMatched });
  }
  // Deterministic order: text match first, then number of reasons, then id. No scores shown.
  return out.sort((a, b) => Number(b.textMatched) - Number(a.textMatched) || b.whyMatch.length - a.whyMatch.length || a.entry.id.localeCompare(b.entry.id));
}

/** Validates an identification choice. Exact model requires readable labelling/documentation. */
export function validateIdentification(level: 'unknown' | 'possible_family' | 'exact_model', basis: string): string | null {
  if (level === 'exact_model' && basis !== 'readable_label_or_documentation' && basis !== 'linked_public_record')
    return 'An exact model needs readable labelling or documentation. Choose “Possible family” instead.';
  return null;
}

/** Photo AI extension point. Disabled by default; there is no bundled model and no fake inference. */
export interface PhotoAnalysisProvider {
  readonly id: string;
  readonly requiresNetwork: boolean;
  proposeCandidates(imageUri: string, consentToken: string): Promise<{ familyId: string; rationale: string }[]>;
}
export const PHOTO_AI_ENABLED = false;
export const photoAnalysisProviders: PhotoAnalysisProvider[] = [];
