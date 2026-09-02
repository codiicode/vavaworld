'use client';

import type { Map as MapboxMap } from 'mapbox-gl';
import { cellToBoundary } from 'h3-js';
import type { ClaimedInfo } from './use-claimed-registry';

/**
 * Renders property images INSIDE their hexes. Each imaged hex gets its own
 * geo-anchored raster: the photo is clipped to that cell's exact hexagon
 * outline (H3 orientation varies with longitude, so the clip path comes
 * from the real boundary) and pinned to the cell's ground coordinates, so
 * it fills the hex edge to edge at every zoom and tilt. Only visible from
 * the zoom where the grid itself appears.
 */

/** Must match MIN_ZOOM_FOR_HEXES in MapView - no picture without its hex. */
const MIN_ZOOM = 16;
/** Bitmap edge in px - one hex is at most ~600px on screen at z22. */
const BITMAP = 512;
const M_PER_DEG_LAT = 111_320;

const sourceId = (h3: string) => `prop-img:${h3}`;
const layerId = (h3: string) => `prop-img-layer:${h3}`;

/** url -> hex-clipped PNG data URL (one bitmap per property photo). */
const bitmaps = new Map<string, Promise<string>>();
/** h3 -> url currently placed on the map. */
const placed = new Map<string, string>();

export function syncPropertyImages(
  map: MapboxMap,
  registry: Map<string, ClaimedInfo>,
  beforeLayer?: string,
): void {
  const wanted = new Map<string, string>();
  for (const [h3, info] of registry) if (info.imageUrl) wanted.set(h3, info.imageUrl);

  // Drop hexes whose image was removed or replaced.
  for (const [h3, url] of placed) {
    if (wanted.get(h3) !== url) {
      removeHex(map, h3);
      placed.delete(h3);
    }
  }

  for (const [h3, url] of wanted) {
    // A style toggle wipes custom sources; re-place anything that vanished.
    if (placed.get(h3) === url && map.getSource(sourceId(h3))) continue;
    placed.set(h3, url);

    let bmp = bitmaps.get(url);
    if (!bmp) {
      bmp = makeHexBitmap(url, h3);
      bitmaps.set(url, bmp);
    }
    void bmp
      .then((dataUrl) => {
        // Registry may have moved on while the image loaded.
        if (placed.get(h3) !== url || map.getSource(sourceId(h3))) return;
        map.addSource(sourceId(h3), {
          type: 'image',
          url: dataUrl,
          coordinates: bitmapCorners(h3),
        });
        map.addLayer(
          {
            id: layerId(h3),
            type: 'raster',
            source: sourceId(h3),
            minzoom: MIN_ZOOM,
            paint: {
              'raster-opacity': 0.92,
              'raster-fade-duration': 0,
              'raster-resampling': 'linear',
            },
          },
          beforeLayer && map.getLayer(beforeLayer) ? beforeLayer : undefined,
        );
      })
      .catch(() => {
        // Broken image: the hex simply keeps its plain owner fill.
        bitmaps.delete(url);
        placed.delete(h3);
      });
  }
}

function removeHex(map: MapboxMap, h3: string): void {
  if (map.getLayer(layerId(h3))) map.removeLayer(layerId(h3));
  if (map.getSource(sourceId(h3))) map.removeSource(sourceId(h3));
}

/**
 * The square bitmap covers the hex's longitude span, centred on the hex.
 * These are its four corners in the order Mapbox wants: TL, TR, BR, BL.
 */
type Corner = [number, number];

function bitmapCorners(h3: string): [Corner, Corner, Corner, Corner] {
  const g = hexGeometry(h3);
  const halfLat = g.spanM / 2 / M_PER_DEG_LAT;
  const midLat = (g.minLat + g.maxLat) / 2;
  return [
    [g.minLng, midLat + halfLat],
    [g.maxLng, midLat + halfLat],
    [g.maxLng, midLat - halfLat],
    [g.minLng, midLat - halfLat],
  ];
}

function hexGeometry(h3: string) {
  const b = cellToBoundary(h3); // [lat, lng] x6
  const lats = b.map((p) => p[0]);
  const lngs = b.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const mPerDegLng = M_PER_DEG_LAT * Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  return { b, minLat, maxLat, minLng, maxLng, mPerDegLng, spanM: (maxLng - minLng) * mPerDegLng };
}

/** Fetch the photo and clip it to this cell's exact hexagon outline. */
async function makeHexBitmap(url: string, h3: string): Promise<string> {
  const img = await loadImage(url);
  const g = hexGeometry(h3);
  // Square canvas = spanM metres on both axes; the hexagon is centred.
  const pxPerM = BITMAP / g.spanM;
  const midLat = (g.minLat + g.maxLat) / 2;
  const toPx = ([lat, lng]: number[]) => ({
    x: (lng - g.minLng) * g.mPerDegLng * pxPerM,
    y: BITMAP / 2 - (lat - midLat) * M_PER_DEG_LAT * pxPerM,
  });

  const canvas = document.createElement('canvas');
  canvas.width = BITMAP;
  canvas.height = BITMAP;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  ctx.beginPath();
  g.b.forEach((p, i) => {
    const { x, y } = toPx(p);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.clip();

  // cover-fit the photo into the square
  const s = Math.max(BITMAP / img.width, BITMAP / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (BITMAP - dw) / 2, (BITMAP - dh) / 2, dw, dh);

  return canvas.toDataURL('image/png');
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}
