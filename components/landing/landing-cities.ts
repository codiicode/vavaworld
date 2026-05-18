export type City = { name: string; lon: number; lat: number; major?: boolean };

/**
 * Globe markers. `major: true` are the world's biggest / most iconic metros
 * (capital or not) — drawn larger with a ring + label. The rest are plain
 * dots and act as arc endpoints.
 */
export const CITIES: City[] = [
  // ── Major world cities (labelled) ───────────────────────────────
  { name: 'Tokyo', lon: 139.69, lat: 35.69, major: true },
  { name: 'New York', lon: -74.01, lat: 40.71, major: true },
  { name: 'London', lon: -0.13, lat: 51.51, major: true },
  { name: 'Paris', lon: 2.35, lat: 48.86, major: true },
  { name: 'Shanghai', lon: 121.47, lat: 31.23, major: true },
  { name: 'Beijing', lon: 116.41, lat: 39.90, major: true },
  { name: 'Delhi', lon: 77.21, lat: 28.61, major: true },
  { name: 'Mumbai', lon: 72.88, lat: 19.08, major: true },
  { name: 'São Paulo', lon: -46.63, lat: -23.55, major: true },
  { name: 'Mexico City', lon: -99.13, lat: 19.43, major: true },
  { name: 'Los Angeles', lon: -118.24, lat: 34.05, major: true },
  { name: 'Moscow', lon: 37.62, lat: 55.75, major: true },
  { name: 'Istanbul', lon: 28.98, lat: 41.01, major: true },
  { name: 'Cairo', lon: 31.24, lat: 30.04, major: true },
  { name: 'Seoul', lon: 126.98, lat: 37.57, major: true },
  { name: 'Singapore', lon: 103.82, lat: 1.35, major: true },
  { name: 'Dubai', lon: 55.27, lat: 25.20, major: true },
  { name: 'Hong Kong', lon: 114.11, lat: 22.40, major: true },
  { name: 'Sydney', lon: 151.21, lat: -33.87, major: true },
  { name: 'Jakarta', lon: 106.85, lat: -6.21, major: true },
  { name: 'Bangkok', lon: 100.50, lat: 13.76, major: true },
  { name: 'Lagos', lon: 3.38, lat: 6.52, major: true },
  // ── Supporting dots (arc endpoints, no label) ───────────────────
  { name: 'Berlin', lon: 13.41, lat: 52.52 },
  { name: 'Stockholm', lon: 18.07, lat: 59.33 },
  { name: 'Lisbon', lon: -9.14, lat: 38.72 },
  { name: 'Madrid', lon: -3.70, lat: 40.42 },
  { name: 'Rome', lon: 12.50, lat: 41.90 },
  { name: 'San Francisco', lon: -122.42, lat: 37.77 },
  { name: 'Chicago', lon: -87.63, lat: 41.88 },
  { name: 'Toronto', lon: -79.38, lat: 43.65 },
  { name: 'Buenos Aires', lon: -58.38, lat: -34.60 },
  { name: 'Rio de Janeiro', lon: -43.17, lat: -22.91 },
  { name: 'Bogotá', lon: -74.07, lat: 4.71 },
  { name: 'Lima', lon: -77.04, lat: -12.05 },
  { name: 'Johannesburg', lon: 28.05, lat: -26.20 },
  { name: 'Nairobi', lon: 36.82, lat: -1.29 },
  { name: 'Tehran', lon: 51.39, lat: 35.69 },
  { name: 'Riyadh', lon: 46.71, lat: 24.71 },
  { name: 'Karachi', lon: 67.01, lat: 24.86 },
  { name: 'Kolkata', lon: 88.36, lat: 22.57 },
  { name: 'Bengaluru', lon: 77.59, lat: 12.97 },
  { name: 'Manila', lon: 120.98, lat: 14.60 },
  { name: 'Osaka', lon: 135.50, lat: 34.69 },
  { name: 'Shenzhen', lon: 114.06, lat: 22.54 },
  { name: 'Guangzhou', lon: 113.26, lat: 23.13 },
  { name: 'Reykjavík', lon: -21.94, lat: 64.15 },
];
