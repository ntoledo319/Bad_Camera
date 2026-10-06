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
  // U.S. cities and Connecticut towns (approximate city-centre coordinates, for navigation only).
  { id: 'new-york-new-york', name: 'New York', context: 'New York', lat: 40.7128, lon: -74.006, zoom: 12 },
  { id: 'los-angeles-california', name: 'Los Angeles', context: 'California', lat: 34.0522, lon: -118.2437, zoom: 12 },
  { id: 'chicago-illinois', name: 'Chicago', context: 'Illinois', lat: 41.8781, lon: -87.6298, zoom: 12 },
  { id: 'houston-texas', name: 'Houston', context: 'Texas', lat: 29.7604, lon: -95.3698, zoom: 12 },
  { id: 'phoenix-arizona', name: 'Phoenix', context: 'Arizona', lat: 33.4484, lon: -112.074, zoom: 12 },
  { id: 'philadelphia-pennsylvania', name: 'Philadelphia', context: 'Pennsylvania', lat: 39.9526, lon: -75.1652, zoom: 12 },
  { id: 'san-antonio-texas', name: 'San Antonio', context: 'Texas', lat: 29.4241, lon: -98.4936, zoom: 12 },
  { id: 'san-diego-california', name: 'San Diego', context: 'California', lat: 32.7157, lon: -117.1611, zoom: 12 },
  { id: 'dallas-texas', name: 'Dallas', context: 'Texas', lat: 32.7767, lon: -96.797, zoom: 12 },
  { id: 'austin-texas', name: 'Austin', context: 'Texas', lat: 30.2672, lon: -97.7431, zoom: 12 },
  { id: 'jacksonville-florida', name: 'Jacksonville', context: 'Florida', lat: 30.3322, lon: -81.6557, zoom: 12 },
  { id: 'san-jose-california', name: 'San Jose', context: 'California', lat: 37.3382, lon: -121.8863, zoom: 12 },
  { id: 'fort-worth-texas', name: 'Fort Worth', context: 'Texas', lat: 32.7555, lon: -97.3308, zoom: 12 },
  { id: 'columbus-ohio', name: 'Columbus', context: 'Ohio', lat: 39.9612, lon: -82.9988, zoom: 12 },
  { id: 'charlotte-north-carolina', name: 'Charlotte', context: 'North Carolina', lat: 35.2271, lon: -80.8431, zoom: 12 },
  { id: 'indianapolis-indiana', name: 'Indianapolis', context: 'Indiana', lat: 39.7684, lon: -86.1581, zoom: 12 },
  { id: 'san-francisco-california', name: 'San Francisco', context: 'California', lat: 37.7749, lon: -122.4194, zoom: 12 },
  { id: 'seattle-washington', name: 'Seattle', context: 'Washington', lat: 47.6062, lon: -122.3321, zoom: 12 },
  { id: 'denver-colorado', name: 'Denver', context: 'Colorado', lat: 39.7392, lon: -104.9903, zoom: 12 },
  { id: 'washington-district-of-columbia', name: 'Washington', context: 'District of Columbia', lat: 38.9072, lon: -77.0369, zoom: 12 },
  { id: 'nashville-tennessee', name: 'Nashville', context: 'Tennessee', lat: 36.1627, lon: -86.7816, zoom: 12 },
  { id: 'oklahoma-city-oklahoma', name: 'Oklahoma City', context: 'Oklahoma', lat: 35.4676, lon: -97.5164, zoom: 12 },
  { id: 'el-paso-texas', name: 'El Paso', context: 'Texas', lat: 31.7619, lon: -106.485, zoom: 12 },
  { id: 'boston-massachusetts', name: 'Boston', context: 'Massachusetts', lat: 42.3601, lon: -71.0589, zoom: 12 },
  { id: 'portland-oregon', name: 'Portland', context: 'Oregon', lat: 45.5152, lon: -122.6784, zoom: 12 },
  { id: 'las-vegas-nevada', name: 'Las Vegas', context: 'Nevada', lat: 36.1699, lon: -115.1398, zoom: 12 },
  { id: 'detroit-michigan', name: 'Detroit', context: 'Michigan', lat: 42.3314, lon: -83.0458, zoom: 12 },
  { id: 'memphis-tennessee', name: 'Memphis', context: 'Tennessee', lat: 35.1495, lon: -90.049, zoom: 12 },
  { id: 'louisville-kentucky', name: 'Louisville', context: 'Kentucky', lat: 38.2527, lon: -85.7585, zoom: 12 },
  { id: 'baltimore-maryland', name: 'Baltimore', context: 'Maryland', lat: 39.2904, lon: -76.6122, zoom: 12 },
  { id: 'milwaukee-wisconsin', name: 'Milwaukee', context: 'Wisconsin', lat: 43.0389, lon: -87.9065, zoom: 12 },
  { id: 'albuquerque-new-mexico', name: 'Albuquerque', context: 'New Mexico', lat: 35.0844, lon: -106.6504, zoom: 12 },
  { id: 'tucson-arizona', name: 'Tucson', context: 'Arizona', lat: 32.2226, lon: -110.9747, zoom: 12 },
  { id: 'fresno-california', name: 'Fresno', context: 'California', lat: 36.7378, lon: -119.7871, zoom: 12 },
  { id: 'sacramento-california', name: 'Sacramento', context: 'California', lat: 38.5816, lon: -121.4944, zoom: 12 },
  { id: 'kansas-city-missouri', name: 'Kansas City', context: 'Missouri', lat: 39.0997, lon: -94.5786, zoom: 12 },
  { id: 'atlanta-georgia', name: 'Atlanta', context: 'Georgia', lat: 33.749, lon: -84.388, zoom: 12 },
  { id: 'miami-florida', name: 'Miami', context: 'Florida', lat: 25.7617, lon: -80.1918, zoom: 12 },
  { id: 'raleigh-north-carolina', name: 'Raleigh', context: 'North Carolina', lat: 35.7796, lon: -78.6382, zoom: 12 },
  { id: 'omaha-nebraska', name: 'Omaha', context: 'Nebraska', lat: 41.2565, lon: -95.9345, zoom: 12 },
  { id: 'minneapolis-minnesota', name: 'Minneapolis', context: 'Minnesota', lat: 44.9778, lon: -93.265, zoom: 12 },
  { id: 'tulsa-oklahoma', name: 'Tulsa', context: 'Oklahoma', lat: 36.154, lon: -95.9928, zoom: 12 },
  { id: 'cleveland-ohio', name: 'Cleveland', context: 'Ohio', lat: 41.4993, lon: -81.6944, zoom: 12 },
  { id: 'new-orleans-louisiana', name: 'New Orleans', context: 'Louisiana', lat: 29.9511, lon: -90.0715, zoom: 12 },
  { id: 'tampa-florida', name: 'Tampa', context: 'Florida', lat: 27.9506, lon: -82.4572, zoom: 12 },
  { id: 'pittsburgh-pennsylvania', name: 'Pittsburgh', context: 'Pennsylvania', lat: 40.4406, lon: -79.9959, zoom: 12 },
  { id: 'cincinnati-ohio', name: 'Cincinnati', context: 'Ohio', lat: 39.1031, lon: -84.512, zoom: 12 },
  { id: 'st-louis-missouri', name: 'St. Louis', context: 'Missouri', lat: 38.627, lon: -90.1994, zoom: 12 },
  { id: 'orlando-florida', name: 'Orlando', context: 'Florida', lat: 28.5383, lon: -81.3792, zoom: 12 },
  { id: 'salt-lake-city-utah', name: 'Salt Lake City', context: 'Utah', lat: 40.7608, lon: -111.891, zoom: 12 },
  { id: 'honolulu-hawaii', name: 'Honolulu', context: 'Hawaii', lat: 21.3069, lon: -157.8583, zoom: 12 },
  { id: 'anchorage-alaska', name: 'Anchorage', context: 'Alaska', lat: 61.2181, lon: -149.9003, zoom: 12 },
  { id: 'richmond-virginia', name: 'Richmond', context: 'Virginia', lat: 37.5407, lon: -77.436, zoom: 12 },
  { id: 'providence-rhode-island', name: 'Providence', context: 'Rhode Island', lat: 41.824, lon: -71.4128, zoom: 12 },
  { id: 'buffalo-new-york', name: 'Buffalo', context: 'New York', lat: 42.8864, lon: -78.8784, zoom: 12 },
  { id: 'burlington-vermont', name: 'Burlington', context: 'Vermont', lat: 44.4759, lon: -73.2121, zoom: 12 },
  { id: 'portland-maine', name: 'Portland', context: 'Maine', lat: 43.6591, lon: -70.2568, zoom: 12 },
  { id: 'manchester-new-hampshire', name: 'Manchester', context: 'New Hampshire', lat: 42.9956, lon: -71.4548, zoom: 12 },
  { id: 'newark-new-jersey', name: 'Newark', context: 'New Jersey', lat: 40.7357, lon: -74.1724, zoom: 12 },
  { id: 'wilmington-delaware', name: 'Wilmington', context: 'Delaware', lat: 39.7391, lon: -75.5398, zoom: 12 },
  { id: 'boise-idaho', name: 'Boise', context: 'Idaho', lat: 43.615, lon: -116.2023, zoom: 12 },
  { id: 'des-moines-iowa', name: 'Des Moines', context: 'Iowa', lat: 41.5868, lon: -93.625, zoom: 12 },
  { id: 'little-rock-arkansas', name: 'Little Rock', context: 'Arkansas', lat: 34.7465, lon: -92.2896, zoom: 12 },
  { id: 'jackson-mississippi', name: 'Jackson', context: 'Mississippi', lat: 32.2988, lon: -90.1848, zoom: 12 },
  { id: 'birmingham-alabama', name: 'Birmingham', context: 'Alabama', lat: 33.5186, lon: -86.8104, zoom: 12 },
  { id: 'charleston-south-carolina', name: 'Charleston', context: 'South Carolina', lat: 32.7765, lon: -79.9311, zoom: 12 },
  { id: 'charleston-west-virginia', name: 'Charleston', context: 'West Virginia', lat: 38.3498, lon: -81.6326, zoom: 12 },
  { id: 'fargo-north-dakota', name: 'Fargo', context: 'North Dakota', lat: 46.8772, lon: -96.7898, zoom: 12 },
  { id: 'sioux-falls-south-dakota', name: 'Sioux Falls', context: 'South Dakota', lat: 43.5446, lon: -96.7311, zoom: 12 },
  { id: 'billings-montana', name: 'Billings', context: 'Montana', lat: 45.7833, lon: -108.5007, zoom: 12 },
  { id: 'cheyenne-wyoming', name: 'Cheyenne', context: 'Wyoming', lat: 41.14, lon: -104.8202, zoom: 12 },
  { id: 'wichita-kansas', name: 'Wichita', context: 'Kansas', lat: 37.6872, lon: -97.3301, zoom: 12 },
  { id: 'new-haven-connecticut', name: 'New Haven', context: 'Connecticut', lat: 41.3083, lon: -72.9279, zoom: 12 },
  { id: 'hartford-connecticut', name: 'Hartford', context: 'Connecticut', lat: 41.7658, lon: -72.6734, zoom: 12 },
  { id: 'stamford-connecticut', name: 'Stamford', context: 'Connecticut', lat: 41.0534, lon: -73.5387, zoom: 12 },
  { id: 'norwalk-connecticut', name: 'Norwalk', context: 'Connecticut', lat: 41.1177, lon: -73.4082, zoom: 12 },
  { id: 'stratford-connecticut', name: 'Stratford', context: 'Connecticut', lat: 41.1845, lon: -73.1332, zoom: 12 },
  { id: 'milford-connecticut', name: 'Milford', context: 'Connecticut', lat: 41.2223, lon: -73.0565, zoom: 12 },
  { id: 'new-london-connecticut', name: 'New London', context: 'Connecticut', lat: 41.3557, lon: -72.0995, zoom: 12 },
  { id: 'waterbury-connecticut', name: 'Waterbury', context: 'Connecticut', lat: 41.5582, lon: -73.0515, zoom: 12 },
  { id: 'danbury-connecticut', name: 'Danbury', context: 'Connecticut', lat: 41.3948, lon: -73.454, zoom: 12 },
  { id: 'greenwich-connecticut', name: 'Greenwich', context: 'Connecticut', lat: 41.0262, lon: -73.6282, zoom: 12 },
];

export function searchPlaces(q: string, limit = 8): Place[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const hits = PLACES.filter((p) => `${p.name} ${p.context}`.toLowerCase().includes(s));
  // Names that start with the query first ("Port" → Portland before Southport).
  const starts = (p: Place) => (p.name.toLowerCase().startsWith(s) ? 0 : 1);
  return hits.sort((a, b) => starts(a) - starts(b)).slice(0, limit);
}
