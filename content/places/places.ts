/**
 * Small bundled place index for offline search (no Nominatim autocomplete — spec §9, D5).
 * Coordinates are approximate area centroids, hand-entered for navigation only; they are not
 * camera locations and are never exported as evidence.
 */
export interface Place {
  id: string;
  name: string;
  context: string;
  lat: number;
  lon: number;
  zoom: number;
}

export const PLACES: Place[] = [
  { id: 'fairfield-ct', name: 'Fairfield', context: 'Connecticut', lat: 41.1412, lon: -73.2637, zoom: 12.5 },
  { id: 'fairfield-center', name: 'Fairfield Center', context: 'Fairfield, CT', lat: 41.1418, lon: -73.2556, zoom: 15 },
  { id: 'southport', name: 'Southport', context: 'Fairfield, CT', lat: 41.1357, lon: -73.2866, zoom: 15 },
  { id: 'stratfield', name: 'Stratfield', context: 'Fairfield, CT', lat: 41.1886, lon: -73.2236, zoom: 14.5 },
  { id: 'greenfield-hill', name: 'Greenfield Hill', context: 'Fairfield, CT', lat: 41.1786, lon: -73.2912, zoom: 14.5 },
  { id: 'tunxis-hill', name: 'Tunxis Hill', context: 'Fairfield, CT', lat: 41.1660, lon: -73.2304, zoom: 15 },
  { id: 'black-rock-turnpike', name: 'Black Rock Turnpike', context: 'Fairfield, CT', lat: 41.1700, lon: -73.2420, zoom: 14.5 },
  { id: 'post-road-fairfield', name: 'Post Road (US-1)', context: 'Fairfield, CT', lat: 41.1395, lon: -73.2480, zoom: 14.5 },
  { id: 'bridgeport', name: 'Bridgeport', context: 'Connecticut', lat: 41.1865, lon: -73.1952, zoom: 12.5 },
  { id: 'westport', name: 'Westport', context: 'Connecticut', lat: 41.1415, lon: -73.3579, zoom: 12.5 },
  { id: 'trumbull', name: 'Trumbull', context: 'Connecticut', lat: 41.2429, lon: -73.2007, zoom: 12.5 },
  { id: 'easton', name: 'Easton', context: 'Connecticut', lat: 41.2529, lon: -73.2979, zoom: 12.5 },
];

export function searchPlaces(q: string, limit = 8): Place[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return PLACES.filter((p) => `${p.name} ${p.context}`.toLowerCase().includes(s)).slice(0, limit);
}
