'use client';

import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl';
import { cellToBoundary, cellToLatLng } from 'h3-js';
import type { ClaimedInfo } from './use-claimed-registry';

/**
 * Renders property images INSIDE their hexes (the on-map layer, visible
 * from the zoom where the grid appears). One bitmap per property: the
 * image is clipped to the property's exact hexagon shape (H3 cell
 * orientation varies with longitude, so the clip path is computed from a
 * real cell boundary) and stamped as a symbol at every hex centre, sized
 * to match the cell's ground footprint at every zoom.
 */

const SOURCE = 'property-images';
const LAYER = 'property-images-symbols';
/** Bitmap edge in px - one hex is at most ~600px on screen at z22. */
const BITMAP = 512;
const MIN_ZOOM = 14.5;

const loadedIcons = new Set<string>();
const inFlight = new Set<string>();

export function syncPropertyImages(
  map: MapboxMap,
  registry: Map<string, ClaimedInfo>,
  beforeLayer?: string,
): void {
  ensureLayer(map, beforeLayer);

  // Group image-bearing hexes by URL (one property = one URL).
  const byUrl = new Map<string, string[]>();
  for (const [h3, info] of registry) {
    if (info.imageUrl) {
      const list = byUrl.get(info.imageUrl);
      if (list) list.push(h3);
      else byUrl.set(info.imageUrl, [h3]);
    }
  }

  const features: GeoJSON.Feature[] = [];
  for (const [url, h3s] of byUrl) {
    const iconId = `prop:${url}`;
    if (!loadedIcons.has(iconId) && !inFlight.has(iconId)) {
      inFlight.add(iconId);
      void makeHexIcon(url, h3s[0])
        .then((bitmap) => {
          if (!map.hasImage(iconId)) map.addImage(iconId, bitmap);
          loadedIcons.add(iconId);
          // Re-run so the features referencing this icon appear.
          syncPropertyImages(map, registry, beforeLayer);
        })
        .catch(() => {
          /* broken image - hex simply keeps its plain owner fill */
        })
        .finally(() => inFlight.delete(iconId));
    }
    if (!loadedIcons.has(iconId)) continue;

    for (const h3 of h3s) {
      const [lat, lng] = cellToLatLng(h3);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { icon: iconId, s10: iconScaleAtZ10(h3, lat) },
      });
    }
  }

  const src = map.getSource(SOURCE) as GeoJSONSource | undefined;
  src?.setData({ type: 'FeatureCollection', features });
}

function ensureLayer(map: MapboxMap, beforeLayer?: string): void {
  if (map.getSource(SOURCE)) return;
  map.addSource(SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  map.addLayer(
    {
      id: LAYER,
      type: 'symbol',
      source: SOURCE,
      minzoom: MIN_ZOOM,
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        // s10 = icon-size that renders the hex at true scale at zoom 10;
        // doubling per zoom level keeps it glued to the ground.
        'icon-size': [
          'interpolate',
          ['exponential', 2],
          ['zoom'],
          10,
          ['get', 's10'],
          24,
          ['*', ['get', 's10'], 16384],
        ],
      },
      paint: { 'icon-opacity': 0.92 },
    },
    beforeLayer && map.getLayer(beforeLayer) ? beforeLayer : undefined,
  );
}

/**
 * icon-size multiplier at zoom 10 so BITMAP px covers the hex's real
 * ground width at that zoom (Web Mercator metres-per-pixel at the lat).
 */
function iconScaleAtZ10(h3: string, lat: number): number {
  const widthM = hexWidthMeters(h3);
  const mppZ10 = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** 10;
  return widthM / mppZ10 / BITMAP;
}

function hexWidthMeters(h3: string): number {
  const b = cellToBoundary(h3); // [lat, lng] x6
  const lat0 = (b[0][0] * Math.PI) / 180;
  const mPerDegLng = 111_320 * Math.cos(lat0);
  let maxX = -Infinity, minX = Infinity;
  for (const [, lng] of b) {
    const x = lng * mPerDegLng;
    if (x > maxX) maxX = x;
    if (x < minX) minX = x;
  }
  return maxX - minX;
}

/** Fetch the image and clip it to this cell's exact hexagon outline. */
async function makeHexIcon(url: string, h3: string): Promise<ImageData> {
  const img = await loadImage(url);

  const b = cellToBoundary(h3);
  const lat0 = (b[0][0] * Math.PI) / 180;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(lat0);
  const pts = b.map(([lat, lng]) => ({ x: lng * mPerDegLng, y: -lat * mPerDegLat }));
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  // Canvas is square BITMAP px = spanX metres wide; hexagon is centred.
  const scale = BITMAP / spanX;
  const yOff = (BITMAP - spanY * scale) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = BITMAP;
  canvas.height = BITMAP;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = (p.x - minX) * scale;
    const y = (p.y - minY) * scale + yOff;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.clip();

  // cover-fit the image into the square
  const s = Math.max(BITMAP / img.width, BITMAP / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (BITMAP - dw) / 2, (BITMAP - dh) / 2, dw, dh);

  return ctx.getImageData(0, 0, BITMAP, BITMAP);
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
