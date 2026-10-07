/**
 * Published camera-data tiles (static host, e.g. Cloudflare Pages). Shared by the build tool,
 * the verifier and the app so all three agree on one format.
 *
 * A tile carries compact raw OpenStreetMap elements; the app normalizes them locally with
 * normalizeOsm(), exactly as it does for a direct Overpass download. Tiles start as 1°×1° cells
 * and are split into quarters while they hold more than MAX_ELEMENTS_PER_TILE elements.
 */
import { z } from 'zod';

export const SITE_SCHEMA_VERSION = 1;
export const MAX_ELEMENTS_PER_TILE = 4000;

const bbox = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90), z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const OsmElementSchema = z.object({
  type: z.enum(['node', 'way', 'relation']),
  id: z.number().int().positive(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
  timestamp: z.string().optional(),
  version: z.number().int().optional(),
  tags: z.record(z.string(), z.string()).optional(),
  /** Publisher bookkeeping: the U.S. state query that returned this element (not an OSM field). */
  r: z.string().optional(),
});

export const TileFile = z.object({
  schemaVersion: z.literal(SITE_SCHEMA_VERSION),
  id: z.string().regex(/^[a-z0-9_.-]+$/),
  bbox,
  generatedAt: z.string(),
  upstreamTimestamp: z.string().nullable(),
  attribution: z.string(),
  license: z.literal('ODbL-1.0'),
  elements: z.array(OsmElementSchema),
});
export type TileFile = z.infer<typeof TileFile>;

export const TileEntry = z.object({
  id: z.string().regex(/^[a-z0-9_.-]+$/),
  bbox,
  path: z.string().regex(/^tiles\/[a-z0-9_.-]+\.json$/),
  count: z.number().int().nonnegative(),
  bytes: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  name: z.string(),
});
export type TileEntry = z.infer<typeof TileEntry>;

export const SiteManifest = z.object({
  schemaVersion: z.literal(SITE_SCHEMA_VERSION),
  generatedAt: z.string(),
  upstreamTimestamp: z.string().nullable(),
  provider: z.string(),
  license: z.literal('ODbL-1.0'),
  attribution: z.string(),
  licenseUrl: z.string(),
  normalizationVersion: z.string(),
  totalRecords: z.number().int().nonnegative(),
  regions: z.array(z.object({ code: z.string(), name: z.string(), count: z.number().int().nonnegative(), status: z.enum(['fresh', 'kept-previous', 'missing']), fetchedAt: z.string().nullable() })),
  tiles: z.array(TileEntry),
});
export type SiteManifest = z.infer<typeof SiteManifest>;

export type Bbox = [number, number, number, number];

export function intersects(a: Bbox, b: Bbox): boolean {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

/** Tile id from its south-west corner and size, e.g. "t41_-74_1" or "t40.5_-74_0.5". */
export function tileId(b: Bbox): string {
  const n = (x: number) => String(Math.round(x * 1e4) / 1e4);
  return `t${n(b[1])}_${n(b[0])}_${n(b[2] - b[0])}`;
}

/** Tiles to download for a view: those intersecting it, nearest the view centre first. */
export function tilesForView(m: SiteManifest, view: Bbox, limit = 12): TileEntry[] {
  const cx = (view[0] + view[2]) / 2;
  const cy = (view[1] + view[3]) / 2;
  const d = (t: TileEntry) => Math.hypot((t.bbox[0] + t.bbox[2]) / 2 - cx, (t.bbox[1] + t.bbox[3]) / 2 - cy);
  return m.tiles.filter((t) => intersects(t.bbox as Bbox, view)).sort((a, b) => d(a) - d(b)).slice(0, limit);
}
