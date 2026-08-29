/**
 * Mapbox Static Images URL for a single hex: a zoomed-in satellite shot
 * centered on the tile (no overlay - just the place).
 *
 * Used as the preview image on /marketplace/[id]. Returns null when no Mapbox
 * token is configured so the caller can fall back to a placeholder.
 */
export function hexStaticMapUrl({
  lat,
  lng,
  width = 760,
  height = 570,
  zoom = 17,
}: {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
  zoom?: number;
}): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${zoom}/${width}x${height}@2x?logo=false&attribution=false&access_token=${token}`;
}
