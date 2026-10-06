/**
 * Deterministic PUBLIC PROJECTION shared by every export format (cards, captions, PDF, ZIP).
 * Allowlist only. Never exports DB rows, local paths, observer coordinates, private notes,
 * original filenames, EXIF, device identifiers or precise times unless explicitly chosen
 * (and observer coordinates are never exportable through this projection at all).
 */
import type { Observation, Source, Claim, CameraInstallation, Category } from './schemas';
import { CATALOG_BY_ID } from '../../content/catalog/catalog';

export type DateGranularity = 'day' | 'month' | 'year' | 'none';

export interface DisclosureChoices {
  includePhoto: boolean;
  includeEquipmentCoordinates: boolean;
  /** Coordinates are rounded to this many decimals if included (4 ≈ 11 m). */
  coordinateDecimals: 3 | 4 | 5;
  dateGranularity: DateGranularity;
  locationLabel: 'place' | 'generalized' | 'none';
  includeSources: boolean;
  includeObserverDistance: boolean;
  generalizedLabel?: string;
}

export const DEFAULT_DISCLOSURE: DisclosureChoices = {
  includePhoto: true,
  includeEquipmentCoordinates: false,
  coordinateDecimals: 4,
  dateGranularity: 'month',
  locationLabel: 'place',
  includeSources: true,
  includeObserverDistance: false,
};

export const CATEGORY_LABEL: Record<Category, string> = {
  alpr: 'Plate reader (ALPR)',
  video: 'Video camera',
  enforcement: 'Enforcement camera',
  acoustic: 'Acoustic sensor (not a camera)',
  unknown: 'Unidentified equipment',
};
export const CATEGORY_NOUN: Record<Category, string> = {
  alpr: 'plate reader',
  video: 'video camera',
  enforcement: 'enforcement camera',
  acoustic: 'acoustic sensor',
  unknown: 'piece of surveillance equipment',
};

export const LIMITATIONS: string[] = [
  'Mapping/source claims can be wrong or stale.',
  'Phone time, GPS and imported metadata are not independently attested.',
  'A checksum detects a change relative to a known digest; it does not prove the scene, time, location or claim is true.',
  'These materials do not establish that a camera recorded any person or vehicle.',
  'Legal admissibility depends on context; the app does not certify it.',
];

export const DEMO_BANNER = 'DEMONSTRATION — NOT A REAL SIGHTING';

export function formatDate(iso: string | null, g: DateGranularity): string | null {
  if (!iso || g === 'none') return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  if (g === 'year') return String(y);
  if (g === 'month') return `${m} ${y}`;
  return `${m} ${d.getUTCDate()}, ${y}`;
}

export interface PublicSourceRef {
  id: string;
  kind: Source['kind'];
  title: string;
  publisher: string;
  url: string | null;
  accessedAt: string;
  licenseId: string | null;
  attribution: string;
}

export interface PublicClaim {
  fieldPath: string;
  value: string | number | boolean | null;
  basis: Claim['basis'];
  status: Claim['status'];
  sourceId: string;
}

export interface PublicProjection {
  recordId: string;
  recordRevision: number;
  demonstration: boolean;
  category: Category;
  categoryLabel: string;
  headline: string;
  identification: { level: string; familyLabel: string | null; basisLabel: string };
  placeLabel: string | null;
  observedDateText: string | null;
  sourceRetrievedText: string | null;
  lastSourceObservationText: string | null;
  equipmentCoordinates: { lat: number; lon: number; method: string } | null;
  observerDistanceText: string | null;
  sourceStatus: string;
  sources: PublicSourceRef[];
  claims: PublicClaim[];
  limitations: string[];
  attribution: string[];
  footer: string;
  footerAccessible: string;
}

export interface ProjectionInput {
  observation: Observation;
  sources: Source[];
  claims: Claim[];
  installation: CameraInstallation | null;
  observerDistanceText?: string | null;
}

const BASIS_LABEL: Record<string, string> = {
  unknown: 'Not identified — type recorded as unknown',
  possible_family_visual_features: 'Possible family, based on visible features only',
  readable_label_or_documentation: 'Readable label or documentation',
  linked_public_record: 'Linked to a public map record',
};

export function sourceStatusLabel(sources: Pick<Source, 'kind'>[], claims: Pick<Claim, 'status'>[]): string {
  if (claims.some((c) => c.status === 'disputed')) return 'Disputed';
  if (sources.some((s) => s.kind === 'officialRecord')) return 'Official record cited';
  if (sources.some((s) => s.kind === 'communityMap')) return 'Community-mapped';
  if (sources.some((s) => s.kind === 'userPhoto')) return 'Personal observation';
  return 'No source attached';
}

function round(n: number, d: number) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function projectPublic(input: ProjectionInput, choices: DisclosureChoices = DEFAULT_DISCLOSURE): PublicProjection {
  const o = input.observation;
  const fam = o.selectedFamilyId ? CATALOG_BY_ID[o.selectedFamilyId] : null;
  const placeLabel =
    choices.locationLabel === 'none' ? null : choices.locationLabel === 'generalized' ? (choices.generalizedLabel?.trim() || 'an undisclosed location') : o.placeLabel?.trim() || null;
  const noun = CATEGORY_NOUN[o.category];
  const adj = input.sources.some((s) => s.kind !== 'userPhoto') ? 'documented' : 'observed';
  const article = /^[aeiou]/i.test(adj) ? 'An' : 'A';
  const headline = `${article} ${adj} ${noun}${placeLabel ? ` near ${placeLabel}` : ''}.`;
  const publicSources: PublicSourceRef[] = choices.includeSources
    ? input.sources
        .filter((s) => s.kind !== 'userPhoto')
        .map((s) => ({ id: s.id, kind: s.kind, title: s.title, publisher: s.publisher, url: safeUrl(s.url), accessedAt: s.accessedAt, licenseId: s.licenseId, attribution: s.attribution }))
    : [];
  const attribution = Array.from(new Set(input.sources.filter((s) => s.licenseId === 'ODbL-1.0').map(() => '© OpenStreetMap contributors, ODbL 1.0 — openstreetmap.org/copyright')));
  const claims: PublicClaim[] = input.claims
    .filter((c) => !c.fieldPath.startsWith('private.') && !c.fieldPath.startsWith('observer.'))
    .filter((c) => choices.includeEquipmentCoordinates || c.fieldPath !== 'location.coordinates')
    .map((c) => ({ fieldPath: c.fieldPath, value: c.value, basis: c.basis, status: c.status, sourceId: c.sourceId }));
  const eq = o.equipmentLocation;
  const equipmentCoordinates =
    choices.includeEquipmentCoordinates && eq ? { lat: round(eq.lat, choices.coordinateDecimals), lon: round(eq.lon, choices.coordinateDecimals), method: eq.method } : null;
  const retrieved = input.sources.map((s) => s.accessedAt).sort().at(-1) ?? null;
  return {
    recordId: o.id,
    recordRevision: o.revision,
    demonstration: !!o.isDemo,
    category: o.category,
    categoryLabel: CATEGORY_LABEL[o.category],
    headline,
    identification: {
      level: o.identificationLevel,
      familyLabel: fam && o.identificationLevel !== 'unknown' ? `${o.identificationLevel === 'possible_family' ? 'Possibly ' : ''}${fam.familyLabel}` : null,
      basisLabel: BASIS_LABEL[o.identificationBasis] ?? 'Not stated',
    },
    placeLabel,
    observedDateText: formatDate(o.observedAt, choices.dateGranularity),
    sourceRetrievedText: formatDate(retrieved, choices.dateGranularity === 'none' ? 'none' : 'day'),
    lastSourceObservationText: formatDate(input.installation?.lastObservedAt ?? null, choices.dateGranularity === 'none' ? 'none' : 'day'),
    equipmentCoordinates,
    observerDistanceText: choices.includeObserverDistance ? (input.observerDistanceText ?? null) : null,
    sourceStatus: sourceStatusLabel(input.sources, input.claims),
    sources: publicSources,
    claims,
    limitations: LIMITATIONS,
    attribution,
    footer: 'Location report ≠ proof of recording.',
    footerAccessible: 'A location report is not proof of recording.',
  };
}

export function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const p = new URL(u);
    return p.protocol === 'https:' || p.protocol === 'http:' ? p.toString() : null;
  } catch {
    return null;
  }
}

export function shortUrl(u: string | null): string | null {
  if (!u) return null;
  return u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

/** Deterministic captions generated only from supported claims. */
export function captions(p: PublicProjection): { neutral: string; question: string; alt: string } {
  const src = p.sources[0];
  const srcName = src ? `${src.publisher}${src.title ? ` (${src.title})` : ''}` : 'my own observation';
  const retrieved = p.sourceRetrievedText ?? 'on an unrecorded date';
  const lastObs = p.lastSourceObservationText ?? p.observedDateText ?? 'unknown';
  const where = p.placeLabel ? `near ${p.placeLabel} ` : '';
  const neutral =
    (p.demonstration ? `[${DEMO_BANNER}] ` : '') +
    `This location ${where}is listed as a ${CATEGORY_NOUN[p.category]} in ${srcName}. The record was retrieved ${retrieved}; its last in-person observation is ${lastObs}. This does not establish whether the device is operating or recorded anyone.` +
    (src?.url ? ` Source: ${src.url}` : '');
  const question =
    (p.demonstration ? `[${DEMO_BANNER}] ` : '') +
    `What is the policy for this camera's retention and data sharing? Here is the documented location and source.` +
    (src?.url ? ` ${src.url}` : '');
  const alt = `${p.demonstration ? DEMO_BANNER + '. ' : ''}Sightline card. ${p.headline} Type: ${p.categoryLabel}. Source status: ${p.sourceStatus}. ${p.observedDateText ? `Observed ${p.observedDateText}. ` : ''}${p.footerAccessible}`;
  return { neutral, question, alt };
}
