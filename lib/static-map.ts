import { latLngToCell, cellToBoundary } from 'h3-js';
import { HEX_RES } from './h3-utils';

const BRAND = '#5eead4';

/**
 * Mapbox Static Images URL for a single hex: a zoomed-in satellite shot
 * centered on the tile with its res-12 cell drawn as a brand-teal outline.
 *
 * Used as the preview image on /marketplace/[id]. Returns null when no Mapbox
 * token is configured so the caller can fall back to a placeholder.
 */
export function hexStaticMapUrl({
  lat,
  lng,
  width = 760,
  height = 570,
  zoom = 18,
}: {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
  zoom?: number;
}): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const cell = latLngToCell(lat, lng, HEX_RES);
  // cellToBoundary returns [lat, lng]; GeoJSON wants [lng, lat], ring closed.
  const ring = (cellToBoundary(cell) as [number, number][]).map(([la, ln]) => [ln, la]);
  ring.push(ring[0]);

  const feature = {
    type: 'Feature',
    properties: {
      stroke: BRAND,
      'stroke-width': 3,
      'stroke-opacity': 1,
      fill: BRAND,
      'fill-opacity': 0.2,
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };

  const overlay = `geojson(${encodeURIComponent(JSON.stringify(feature))})`;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${overlay}/${lng},${lat},${zoom}/${width}x${height}@2x?access_token=${token}`;
}
