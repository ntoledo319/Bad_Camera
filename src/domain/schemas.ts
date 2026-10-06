/**
 * Runtime-validated data model for Sightline.
 * Principle: claims before conclusions. A source claim is never a global "verified" flag.
 */
import { z } from 'zod';

export const SCHEMA_VERSION = 1 as const;

export const Category = z.enum(['alpr', 'video', 'enforcement', 'acoustic', 'unknown']);
export type Category = z.infer<typeof Category>;

export const Capability = z.enum([
  'plate_recognition',
  'vehicle_attributes',
  'video',
  'ptz',
  'acoustic_detection',
  'speed_enforcement',
  'red_light_enforcement',
  'integration_platform',
  'unknown',
]);

export const DeploymentMode = z.enum(['fixed', 'relocatable', 'vehicle_mounted', 'trailer', 'unknown']);
export type DeploymentMode = z.infer<typeof DeploymentMode>;

export const Lifecycle = z.enum(['reportedPresent', 'removalReported', 'removedDocumented', 'disputed', 'unknown']);
export type Lifecycle = z.infer<typeof Lifecycle>;

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'invalid ISO date');
const lat = z.number().finite().min(-90).max(90);
const lon = z.number().finite().min(-180).max(180);

export const ExternalId = z.object({
  namespace: z.string().min(1),
  elementType: z.string().min(1),
  id: z.string().min(1),
  version: z.string().nullable(),
});

export const GeometryMethod = z.enum(['source_map', 'user_placed', 'photo_metadata', 'relation_centroid', 'unknown']);

export const Geometry = z.object({
  lat,
  lon,
  precisionMeters: z.number().nonnegative().nullable(),
  method: GeometryMethod,
  sourceId: z.string().nullable(),
});

export const Orientation = z.object({
  degrees: z.number().min(0).max(360),
  trueOrMagnetic: z.enum(['true', 'magnetic', 'unknown']),
  sourceId: z.string(),
  quality: z.enum(['sourceReported', 'userEntered', 'unknown']),
});

export const CameraInstallation = z.object({
  id: z.string().min(1),
  externalIds: z.array(ExternalId),
  category: Category,
  capabilities: z.array(Capability),
  manufacturerId: z.string().nullable(),
  familyId: z.string().nullable(),
  modelId: z.string().nullable(),
  deploymentMode: DeploymentMode,
  geometry: Geometry.nullable(),
  orientations: z.array(Orientation),
  operatorClaimIds: z.array(z.string()),
  networkClaimIds: z.array(z.string()),
  lifecycle: Lifecycle,
  firstReportedAt: isoDate.nullable(),
  lastObservedAt: isoDate.nullable(),
  sourceModifiedAt: isoDate.nullable(),
  fetchedAt: isoDate,
  sourceClaimIds: z.array(z.string()),
  regionIds: z.array(z.string()),
  privateOverrideIds: z.array(z.string()),
  /** Raw upstream tags preserved verbatim for auditability. */
  rawTags: z.record(z.string(), z.string()).optional(),
  isDemo: z.boolean().optional(),
  schemaVersion: z.literal(SCHEMA_VERSION),
});
export type CameraInstallation = z.infer<typeof CameraInstallation>;

export const SourceKind = z.enum(['officialRecord', 'manufacturer', 'communityMap', 'userPhoto', 'news', 'other']);
export type SourceKind = z.infer<typeof SourceKind>;

export const Source = z.object({
  id: z.string().min(1),
  kind: SourceKind,
  title: z.string().min(1),
  publisher: z.string(),
  url: z.string().nullable(),
  publishedAt: isoDate.nullable(),
  accessedAt: isoDate,
  licenseId: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  sourceVersion: z.string().nullable(),
  documentPageOrSection: z.string().nullable(),
  localSnapshotPath: z.string().nullable(),
  snapshotSha256: z.string().nullable(),
  availability: z.enum(['available', 'unavailable', 'unknown', 'notChecked']),
  attribution: z.string(),
  retrievalMethod: z.string(),
  /** Scope the source can support: agency-level documents never become physical pins. */
  scope: z.enum(['installation', 'agency', 'productFamily', 'legal', 'methodology']).default('installation'),
});
export type Source = z.infer<typeof Source>;

export const ClaimBasis = z.enum(['sourceReported', 'directlyObserved', 'inferred']);
export const ClaimStatus = z.enum(['unreviewed', 'supported', 'disputed', 'superseded']);

export const Claim = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  fieldPath: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  sourceId: z.string().min(1),
  evidenceAttachmentIds: z.array(z.string()),
  basis: ClaimBasis,
  status: ClaimStatus,
  notes: z.string(),
  validFrom: isoDate.nullable(),
  validTo: isoDate.nullable(),
  createdAt: isoDate,
  supersedesClaimId: z.string().nullable(),
});
export type Claim = z.infer<typeof Claim>;

export const ObserverLocation = z.object({
  lat,
  lon,
  horizontalAccuracyM: z.number().nonnegative().nullable(),
  fixTimestamp: isoDate.nullable(),
  method: z.enum(['gps_fix', 'manual_reference', 'photo_metadata']),
});
export type ObserverLocation = z.infer<typeof ObserverLocation>;

export const EquipmentLocation = z.object({
  lat,
  lon,
  uncertaintyM: z.number().nonnegative().nullable(),
  method: z.enum(['source_map', 'user_placed', 'photo_metadata', 'approximate_area']),
});
export type EquipmentLocation = z.infer<typeof EquipmentLocation>;

export const DistanceSnapshot = z.object({
  meters: z.number().nonnegative(),
  algorithm: z.literal('haversine-r6371008.8'),
  computedAt: isoDate,
  referenceKind: z.enum(['current_fix', 'manual_reference', 'photo_metadata']),
  inputsVersion: z.string(),
});

export const TransformationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rotate'), degrees: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]) }),
  z.object({ type: z.literal('crop'), x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive() }),
  z.object({
    type: z.literal('mask'),
    shape: z.enum(['rect', 'ellipse']),
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
  }),
]);
export type Transformation = z.infer<typeof TransformationSchema>;

export const Attachment = z.object({
  id: z.string().min(1),
  relativePrivatePath: z.string().min(1),
  mime: z.string(),
  bytes: z.number().int().nonnegative(),
  originalFilenamePrivate: z.string().nullable(),
  origin: z.enum(['inAppCapture', 'import']),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  originalMetadataPrivate: z.record(z.string(), z.unknown()),
  acquiredAt: isoDate,
  derivativeOf: z.string().nullable(),
  transformations: z.array(TransformationSchema),
  publicDerivativePath: z.string().nullable(),
  publicDerivativeSha256: z.string().nullable(),
  redactionReviewedAt: isoDate.nullable().default(null),
  /** Honest note when the picker transcoded the image before Sightline received it. */
  receivedBytesNote: z.string().nullable().default(null),
});
export type Attachment = z.infer<typeof Attachment>;

export const IdentificationBasis = z.enum([
  'unknown',
  'possible_family_visual_features',
  'readable_label_or_documentation',
  'linked_public_record',
]);
export type IdentificationBasis = z.infer<typeof IdentificationBasis>;

export const ObservationFeatures = z.object({
  mounting: z.enum(['pole', 'streetlight', 'building', 'gantry', 'trailer', 'vehicle', 'other', 'unknown']),
  form: z.enum(['box', 'bullet', 'dome', 'multi_lens', 'sensor', 'unknown']),
  visibleText: z.string(),
  solarPanel: z.enum(['yes', 'no', 'unknown']),
  apparentOrientation: z.string(),
  categoryReason: z.string(),
});
export type ObservationFeatures = z.infer<typeof ObservationFeatures>;

export const Observation = z.object({
  id: z.string().min(1),
  installationId: z.string().nullable(),
  revision: z.number().int().positive(),
  observedAt: isoDate.nullable(),
  observedAtBasis: z.enum(['device_clock_at_capture', 'photo_metadata', 'user_entered', 'unknown']),
  deviceRecordedAt: isoDate,
  deviceTimeZone: z.string(),
  importedAt: isoDate.nullable(),
  observerLocation: ObserverLocation.nullable(),
  equipmentLocation: EquipmentLocation.nullable(),
  equipmentLocationUncertainNote: z.string().nullable().default(null),
  distanceSnapshot: DistanceSnapshot.nullable(),
  direction: z.object({ degrees: z.number().min(0).max(360).nullable(), cardinal: z.string().nullable() }).nullable().default(null),
  category: Category,
  candidateFamilyIds: z.array(z.string()),
  selectedFamilyId: z.string().nullable(),
  selectedModelId: z.string().nullable().default(null),
  identificationBasis: IdentificationBasis,
  identificationLevel: z.enum(['unknown', 'possible_family', 'exact_model']).default('unknown'),
  features: ObservationFeatures.nullable().default(null),
  placeLabel: z.string().default(''),
  localNotes: z.string(),
  attachments: z.array(z.string()),
  sources: z.array(z.string()),
  /** Links the user attached themselves (never fetched by the app). Optional so older revisions hash unchanged. */
  userSources: z.array(Source).optional(),
  claimIds: z.array(z.string()),
  sourceRecordSnapshot: z.unknown().nullable(),
  collectionIds: z.array(z.string()),
  visibility: z.literal('private'),
  isDemo: z.boolean().default(false),
  schemaVersion: z.literal(SCHEMA_VERSION),
  previousRevisionHash: z.string().nullable(),
  revisionHash: z.string().nullable().default(null),
  revisionReason: z.string().nullable().default(null),
});
export type Observation = z.infer<typeof Observation>;

export const Collection = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  createdAt: isoDate,
  description: z.string().default(''),
});
export type Collection = z.infer<typeof Collection>;

export const Bookmark = z.object({
  id: z.string(),
  installationId: z.string(),
  externalRef: z.string().nullable(),
  label: z.string(),
  createdAt: isoDate,
  collectionIds: z.array(z.string()).default([]),
});
export type Bookmark = z.infer<typeof Bookmark>;

export const DataRegionManifest = z.object({
  id: z.string(),
  name: z.string(),
  bbox: z.tuple([lon, lat, lon, lat]),
  provider: z.string(),
  endpoint: z.string().nullable(),
  query: z.string().nullable(),
  fetchedAt: isoDate,
  upstreamTimestamp: isoDate.nullable(),
  recordCount: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().nullable(),
  attribution: z.string(),
  licenseId: z.string(),
  normalizationVersion: z.string(),
  status: z.enum(['current', 'stale', 'refreshFailed']),
  lastError: z.string().nullable(),
  isDemo: z.boolean().default(false),
});
export type DataRegionManifest = z.infer<typeof DataRegionManifest>;

export const ExportFile = z.object({
  relativePath: z.string(),
  mime: z.string(),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export const ExportManifest = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  format: z.literal('sightline-evidence'),
  exportId: z.string(),
  recordId: z.string(),
  recordRevision: z.number().int(),
  exportCreatedAt: isoDate,
  selectedDisclosureProfile: z.enum(['public-default', 'public-with-equipment-coordinates', 'private-full-evidence']),
  exportedClaims: z.array(z.unknown()),
  sourceRefs: z.array(z.unknown()),
  limitations: z.array(z.string()),
  files: z.array(ExportFile),
  attribution: z.array(z.string()),
  derivedFromRecordDigest: z.string().nullable(),
  demonstration: z.boolean(),
});
export type ExportManifest = z.infer<typeof ExportManifest>;

export const LegalArticle = z.object({
  id: z.string(),
  jurisdiction: z.string(),
  title: z.string(),
  subtitle: z.string(),
  lead: z.string(),
  sections: z.array(z.object({ id: z.string(), title: z.string(), body: z.string(), sourceIds: z.array(z.string()) })),
  sourceIds: z.array(z.string()),
  sourceCheckedAt: isoDate,
  effectiveDateNotes: z.string(),
  reviewStatus: z.enum(['not_attorney_reviewed', 'attorney_reviewed']),
  validationStatus: z.string(),
});
export type LegalArticle = z.infer<typeof LegalArticle>;

export const CatalogEntry = z.object({
  id: z.string(),
  manufacturer: z.string(),
  familyLabel: z.string(),
  currentLabels: z.array(z.string()),
  legacyAliases: z.array(z.string()),
  category: Category,
  deploymentModes: z.array(DeploymentMode),
  kind: z.enum(['physical_device', 'software_or_platform', 'deployment_form', 'generic']),
  summary: z.string(),
  whatItDoes: z.string(),
  visibleCues: z.array(z.string()),
  confirmedFeatures: z.array(z.string()),
  unknowns: z.array(z.string()),
  lookalikes: z.array(z.string()),
  distinguishers: z.array(z.string()),
  matchHints: z.object({
    mounting: z.array(z.string()),
    form: z.array(z.string()),
    solar: z.enum(['common', 'rare', 'any']),
    textPatterns: z.array(z.string()),
  }),
  sourceIds: z.array(z.string()),
  schematic: z.string(),
});
export type CatalogEntry = z.infer<typeof CatalogEntry>;

export const Settings = z.object({
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  units: z.enum(['imperial', 'metric']).default('imperial'),
  haptics: z.boolean().default(true),
  appLock: z.boolean().default(false),
  locationBehavior: z.enum(['ask_each_time', 'use_when_exploring']).default('ask_each_time'),
  offlineOnly: z.boolean().default(false),
  remoteGeocoding: z.boolean().default(false),
  analytics: z.literal(false).default(false),
  demoMode: z.boolean().default(false),
  onboarded: z.boolean().default(false),
  filters: z
    .object({
      categories: z.array(Category).default([]),
      manufacturers: z.array(z.string()).default([]),
      deployment: z.array(z.enum(['fixed', 'relocatable', 'historical_mobile'])).default([]),
      sourceStatus: z.array(z.enum(['source_backed', 'community_reported', 'disputed'])).default([]),
      maxObservationAgeDays: z.number().nullable().default(null),
      includeRemoved: z.boolean().default(false),
    })
    .default({ categories: [], manufacturers: [], deployment: [], sourceStatus: [], maxObservationAgeDays: null, includeRemoved: false }),
});
export type Settings = z.infer<typeof Settings>;
export type FilterState = Settings['filters'];
export const defaultSettings = (): Settings => Settings.parse({});
