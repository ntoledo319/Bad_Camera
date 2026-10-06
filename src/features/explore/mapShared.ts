import type { CameraInstallation } from '../../domain/schemas';
import type { Palette } from '../../design/tokens';

export interface MapViewProps {
  installations: CameraInstallation[];
  selectedId: string | null;
  reference: { lat: number; lon: number; kind: string } | null;
  center: { lat: number; lon: number; zoom: number };
  /** Increment to force the camera to move to `center`. */
  centerNonce: number;
  dark: boolean;
  offline: boolean;
  palette: Palette;
  onSelect: (id: string | null) => void;
  onRegion: (bbox: [number, number, number, number], center: { lat: number; lon: number; zoom: number }) => void;
  /** When set, tapping the map places a point (used by the equipment / reference pickers). */
  onPlace?: (p: { lat: number; lon: number }) => void;
  placed?: { lat: number; lon: number } | null;
  observer?: { lat: number; lon: number } | null;
}

/** OpenFreeMap: OSM-based, no API key, attribution required, no bulk offline prefetch (docs/DECISIONS.md D4). */
export const STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/positron';
export const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';
export const OSM_MAP_ATTRIBUTION = '© OpenStreetMap contributors · OpenFreeMap · OpenMapTiles';

export const offlineStyle = (bg: string) => ({ version: 8 as const, name: 'offline', sources: {}, layers: [{ id: 'bg', type: 'background' as const, paint: { 'background-color': bg } }] });

export function toGeoJSON(items: CameraInstallation[], selectedId: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: items
      .filter((i) => i.geometry)
      .map((i) => ({
        type: 'Feature' as const,
        id: i.id,
        geometry: { type: 'Point' as const, coordinates: [i.geometry!.lon, i.geometry!.lat] },
        properties: { id: i.id, category: i.category, selected: i.id === selectedId ? 1 : 0, approx: i.geometry!.method === 'relation_centroid' ? 1 : 0, demo: i.isDemo ? 1 : 0 },
      })),
  };
}

export function pinColorExpr(c: Palette) {
  return ['match', ['get', 'category'], 'alpr', c.mapPinAlpr, 'video', c.mapPinVideo, 'enforcement', c.mapPinEnforcement, 'acoustic', c.mapPinAcoustic, c.mapPinUnknown] as unknown as string;
}

/** Category letter inside each pin so type is not conveyed by colour alone. */
export const pinGlyphExpr = ['match', ['get', 'category'], 'alpr', 'P', 'video', 'V', 'enforcement', 'E', 'acoustic', 'S', '?'] as unknown as string;
