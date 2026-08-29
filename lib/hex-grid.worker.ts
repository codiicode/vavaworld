/// <reference lib="webworker" />
import { polygonToCells, cellToBoundary, cellToLatLng } from 'h3-js';
import { classifyTier } from './tier';

// Off-main-thread hex grid builder. A z16 viewport is ~3k res-12 cells;
// polygonToCells + per-cell boundaries + feature objects cost 40-90ms of
// CPU - run synchronously on the main thread that was a guaranteed
// multi-frame hitch at every zoom/pan pause. Here the main thread only
// pays the structured-clone receive (~10ms) and the setData handoff.

export type GridRequest = {
  seq: number;
  bbox: [west: number, south: number, east: number, north: number];
};

export type GridResponse = {
  seq: number;
  cells: string[];
  features: unknown[];
  /** [h3, lat, lng, tier] per cell - lets the main thread warm its meta cache. */
  meta: Array<[string, number, number, number]>;
};

const RES = 12;
// Mirrors SAFETY_CAP in h3-utils: bounds worst-case work per request.
const CAP = 4000;

self.onmessage = (e: MessageEvent<GridRequest>) => {
  const { seq, bbox } = e.data;
  const [w, s, east, n] = bbox;
  const ring: [number, number][] = [
    [s, w],
    [s, east],
    [n, east],
    [n, w],
    [s, w],
  ];
  let cells: string[];
  try {
    cells = polygonToCells([ring], RES);
  } catch {
    cells = [];
  }
  if (cells.length > CAP) cells = cells.slice(0, CAP);

  const features: unknown[] = new Array(cells.length);
  const meta: Array<[string, number, number, number]> = new Array(cells.length);
  for (let i = 0; i < cells.length; i++) {
    const h3 = cells[i];
    const b = cellToBoundary(h3) as [number, number][];
    const coords: [number, number][] = new Array(b.length + 1);
    for (let j = 0; j < b.length; j++) coords[j] = [b[j][1], b[j][0]];
    coords[b.length] = coords[0];
    const [lat, lng] = cellToLatLng(h3);
    const tier = classifyTier(lat, lng);
    features[i] = {
      id: h3,
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [coords] },
      properties: { h3, tier },
    };
    meta[i] = [h3, lat, lng, tier];
  }
  const res: GridResponse = { seq, cells, features, meta };
  (self as unknown as Worker).postMessage(res);
};
