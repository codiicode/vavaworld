'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Map, { type MapRef, type MapMouseEvent } from 'react-map-gl/mapbox';
import type { Feature, FeatureCollection, Polygon, Position } from 'geojson';
import type { GeoJSONSource } from 'mapbox-gl';
import { hexCenter, hexToFeature, hexesForBounds } from '@/lib/h3-utils';
import { TIER_FILL, type Tier, classifyTier } from '@/lib/tier';
import { useTiles } from '@/lib/use-tiles';
import { ownerColor } from '@/lib/owner-color';
import { PublicKey } from '@solana/web3.js';

// Per-hex geometry/tier cache. h3 IDs are deterministic so coords + center +
// tier never change for a given cell - compute once, reuse across every
// rebuild. Bounded with a simple FIFO evict so long pan sessions don't leak.
type HexMeta = { coords: Position[]; lat: number; lng: number; tier: Tier };
const HEX_META_CAP = 200_000;
const hexMetaCache: globalThis.Map<string, HexMeta> = new globalThis.Map();
function getHexMeta(h3: string): HexMeta {
  let m = hexMetaCache.get(h3);
  if (!m) {
    const f = hexToFeature(h3);
    const ring = (f.geometry.coordinates[0] ?? []) as Position[];
    const c = hexCenter(h3);
    m = { coords: ring, lat: c.lat, lng: c.lng, tier: classifyTier(c.lat, c.lng) };
    if (hexMetaCache.size >= HEX_META_CAP) {
      // Evict the oldest ~10% in insertion order to amortise the cost.
      let n = Math.ceil(HEX_META_CAP * 0.1);
      for (const key of hexMetaCache.keys()) {
        hexMetaCache.delete(key);
        if (--n <= 0) break;
      }
    }
    hexMetaCache.set(h3, m);
  }
  return m;
}

// PublicKey.toBytes + base58 parse is expensive per-tile. The color is purely a
// function of the address string, so memoize per owner.
const ownerColorCache: globalThis.Map<string, string> = new globalThis.Map();
function getOwnerColor(addr: string): string {
  let c = ownerColorCache.get(addr);
  if (!c) {
    c = ownerColor(new PublicKey(addr));
    ownerColorCache.set(addr, c);
  }
  return c;
}

// Cheap reference-equality check so we skip React state updates when the
// viewport produced exactly the same hex set (common during a pan/zoom gesture).
function sameViewport(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

const SOURCE_ID = 'h3-grid';
const FILL_LAYER = 'h3-grid-fill';
const LINE_LAYER = 'h3-grid-line';
const CLAIMED_LAYER = 'h3-grid-claimed';
const SELECTED_FILL_LAYER = 'h3-grid-selected-fill';
const SELECTED_LAYER = 'h3-grid-selected';

const AGG_SOURCE = 'country-agg';
const AGG_CIRCLE = 'country-agg-circle';
const AGG_LABEL = 'country-agg-label';

// Two distinct base styles. Satellite (default) is the light satellite-streets
// raster + minimal label overlay - it downloads ONLY satellite tiles. Map view
// is the richer Mapbox Standard vector style. We deliberately do NOT layer one
// over the other (that double-downloads both tile sets and starves the visible
// layer's tiles - the "buffering" the user saw). Toggling swaps the style; the
// style.load handler re-installs the hex layers + re-applies feature-state.
const SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';
const MAP_STYLE = 'mapbox://styles/mapbox/standard';

// Render individual hexes only at zoom >= 16. At z14-15 a res-12 cell is ~1px
// (invisible) yet the viewport holds tens of thousands of them; gating at 16
// keeps the painted set to ~2k and the per-settle rebuild instant. Claim
// identity stays res-12 (HEX_RES) - we never coarsen the rendered grid, so a
// clicked cell is always the exact claimable cell.
const MIN_ZOOM_FOR_HEXES = 16;

// Cap the resolution mapbox renders at. The map paints clientW*clientH*dpr^2
// pixels per frame, so a hi-DPI / large screen (e.g. a retina laptop at dpr 2,
// or a 4K monitor at 150% scale) renders 4-8x the pixels of a small laptop and
// the GPU fill-rate collapses - the "fast on my laptop, JÄTTESEGT on the big
// screen" report. Satellite imagery is lossy enough that beyond ~1.5x the extra
// pixels buy little visible sharpness. We override the *JS* devicePixelRatio
// value mapbox reads when sizing its canvas; this does NOT affect how the
// browser rasterises CSS/text (those use the real hardware dpr independently),
// so the rest of the UI stays crisp. Lower MAX_PIXEL_RATIO toward 1 for more
// speed on very large screens.
const MAX_PIXEL_RATIO = 1.5;
if (typeof window !== 'undefined' && window.devicePixelRatio > MAX_PIXEL_RATIO) {
  try {
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      get: () => MAX_PIXEL_RATIO,
    });
  } catch {
    /* non-configurable in some envs - nothing we can do, leave as-is */
  }
}

type Props = {
  selectedHexes: Set<string>;
  setSelectedHexes: (s: Set<string>) => void;
  mapRef: React.MutableRefObject<MapRef | null>;
  refreshTilesRef?: React.MutableRefObject<((h3s: string[]) => void) | null>;
  satellite?: boolean;
};

export function MapView({
  selectedHexes,
  setSelectedHexes,
  mapRef,
  refreshTilesRef,
  satellite = true,
}: Props) {
  const [ready, setReady] = useState(false);
  const [visibleHexes, setVisibleHexes] = useState<string[]>([]);
  // Tile (claimed-status) fetches run against this settled-after-motion set, not
  // the live viewport, so panning doesn't fire RPC on every frame.
  const [settledHexes, setSettledHexes] = useState<string[]>([]);
  const [zoomedIn, setZoomedIn] = useState(false);
  const { tiles, refresh } = useTiles(settledHexes);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const aggFetchedAt = useRef(0);

  // Latest values tracked in refs so the imperative map handlers (mousedown /
  // mousemove / feature-state sync) read current data without re-binding.
  const selectedRef = useRef(selectedHexes);
  useEffect(() => {
    selectedRef.current = selectedHexes;
  }, [selectedHexes]);
  const visibleRef = useRef<string[]>([]);
  useEffect(() => {
    visibleRef.current = visibleHexes;
  }, [visibleHexes]);
  const tilesRef = useRef(tiles);
  useEffect(() => {
    tilesRef.current = tiles;
  }, [tiles]);
  // Tracks the selection set last written to feature-state so changes apply as
  // a diff (O(changed)) instead of re-touching every visible cell.
  const prevSelectedRef = useRef<Set<string>>(new Set());

  const paintRef = useRef<{
    pressed: boolean;
    moved: boolean;
    hexes: Set<string>;
    startX: number;
    startY: number;
  } | null>(null);

  const skipClickRef = useRef(false);

  useEffect(() => {
    if (refreshTilesRef) refreshTilesRef.current = refresh;
  }, [refresh, refreshTilesRef]);

  // Geometry only. Selection / claimed / owner are driven via feature-state
  // (below), NOT baked into properties, so changing them never rebuilds or
  // re-uploads this collection.
  const buildGeometry = useCallback(
    (ids: string[]): FeatureCollection<Polygon> => ({
      type: 'FeatureCollection',
      features: ids.map((id) => {
        const m = getHexMeta(id);
        const f: Feature<Polygon> = {
          id,
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [m.coords] },
          properties: { h3: id, tier: m.tier },
        };
        return f;
      }),
    }),
    [],
  );

  // Push selection + claimed/owner into Mapbox feature-state for the given ids.
  // setData clears feature-state, so this must run after every geometry rebuild.
  const applyFeatureState = useCallback(
    (ids: string[]) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const sel = selectedRef.current;
      const tl = tilesRef.current;
      for (const id of ids) {
        const claimed = tl.get(id);
        map.setFeatureState(
          { source: SOURCE_ID, id },
          {
            selected: sel.has(id),
            claimed: !!claimed,
            ownerColor: claimed ? getOwnerColor(claimed.owner) : null,
          },
        );
      }
    },
    [mapRef],
  );

  const loadAgg = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const now = Date.now();
    if (now - aggFetchedAt.current < 10000) return;
    aggFetchedAt.current = now;
    try {
      const r = await fetch('/api/countries');
      const j = await r.json();
      const feats = (j.countries ?? [])
        .filter((c: { centroid: [number, number] | null }) => c.centroid)
        .map(
          (c: {
            iso: string;
            name: string;
            claimCount: number;
            floor: number;
            centroid: [number, number];
          }) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: c.centroid },
            properties: {
              label: `${c.name}\n$${c.floor.toFixed(3)} · ${c.claimCount.toLocaleString('en-US')} claims`,
            },
          }),
        );
      const src = map.getSource(AGG_SOURCE) as GeoJSONSource | undefined;
      if (src) src.setData({ type: 'FeatureCollection', features: feats });
    } catch {
      /* offline ok */
    }
  }, [mapRef]);

  const refreshHexes = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const isZoomedIn = map.getZoom() >= MIN_ZOOM_FOR_HEXES;
    setZoomedIn(isZoomedIn);
    const aggVis = isZoomedIn ? 'none' : 'visible';
    if (map.getLayer(AGG_CIRCLE)) map.setLayoutProperty(AGG_CIRCLE, 'visibility', aggVis);
    if (map.getLayer(AGG_LABEL)) map.setLayoutProperty(AGG_LABEL, 'visibility', aggVis);
    if (!isZoomedIn) {
      setVisibleHexes((prev) => (prev.length === 0 ? prev : []));
      void loadAgg();
      return;
    }
    const b = map.getBounds();
    if (!b) return;
    const bbox: [number, number, number, number] = [
      b.getWest(),
      b.getSouth(),
      b.getEast(),
      b.getNorth(),
    ];
    const ids = hexesForBounds(bbox);
    setVisibleHexes((prev) => (sameViewport(prev, ids) ? prev : ids));
  }, [mapRef, loadAgg]);

  // Trailing debounce: the heavy polygonToCells + GeoJSON rebuild runs ONCE
  // ~120ms after motion pauses, never mid-gesture. onMoveEnd fires the
  // authoritative final pass against the exact stopping bounds.
  const refreshTimerRef = useRef<number | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current != null) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      refreshHexes();
    }, 120);
  }, [refreshHexes]);
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current != null) window.clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // Decouple RPC tile fetches from the move stream: only fetch claimed-status
  // for a viewport that's been stable ~250ms. fetchH3s already de-dupes cached
  // cells, so revisiting painted areas costs nothing.
  const settleTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      setSettledHexes(visibleHexes);
    }, 250);
    return () => {
      if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    };
  }, [visibleHexes]);

  // Rebuild geometry only when the visible set changes, then (re)apply
  // feature-state since setData wipes it.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!ready || !map) return;
    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!src) return;
    src.setData(buildGeometry(visibleHexes));
    applyFeatureState(visibleHexes);
    prevSelectedRef.current = new Set(selectedRef.current);
  }, [ready, visibleHexes, buildGeometry, applyFeatureState, mapRef]);

  // Selection change → diff against last-applied set, touch only what changed.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!ready || !map) return;
    const prev = prevSelectedRef.current;
    const next = selectedHexes;
    for (const h of prev) {
      if (!next.has(h)) map.setFeatureState({ source: SOURCE_ID, id: h }, { selected: false });
    }
    for (const h of next) {
      if (!prev.has(h)) map.setFeatureState({ source: SOURCE_ID, id: h }, { selected: true });
    }
    prevSelectedRef.current = new Set(next);
  }, [ready, selectedHexes, mapRef]);

  // Claimed status arrives (settled fetch) → update claimed/owner feature-state
  // for the currently visible cells. No geometry rebuild.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!ready || !map) return;
    for (const id of visibleRef.current) {
      const claimed = tiles.get(id);
      map.setFeatureState(
        { source: SOURCE_ID, id },
        { claimed: !!claimed, ownerColor: claimed ? getOwnerColor(claimed.owner) : null },
      );
    }
  }, [ready, tiles, mapRef]);

  // Idempotent: re-runs after a style toggle (which wipes custom layers).
  const installHexLayers = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      promoteId: 'h3',
      data: { type: 'FeatureCollection', features: [] },
    });
    map.addLayer({
      id: FILL_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': [
          'match',
          ['get', 'tier'],
          1, TIER_FILL[1],
          2, TIER_FILL[2],
          3, TIER_FILL[3],
          TIER_FILL[3],
        ],
        'fill-opacity': 0,
      },
    });
    map.addLayer({
      id: CLAIMED_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': ['coalesce', ['feature-state', 'ownerColor'], '#888'],
        'fill-opacity': ['case', ['boolean', ['feature-state', 'claimed'], false], 0.55, 0.0],
      },
    });
    // Selected hexes glow teal (whole-cell fill) before the outline grid.
    map.addLayer({
      id: SELECTED_FILL_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': '#5eead4',
        'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.55, 0.0],
      },
    });
    map.addLayer({
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#ffffff', 'line-width': 1.2, 'line-opacity': 0.35 },
    });
    map.addLayer({
      id: SELECTED_LAYER,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#ffffff',
        'line-width': 3,
        'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.95, 0.0],
      },
    });

    map.addSource(AGG_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    map.addLayer({
      id: AGG_CIRCLE,
      type: 'circle',
      source: AGG_SOURCE,
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': 6,
        'circle-color': '#14b8a6',
        'circle-opacity': 0.9,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    });
    map.addLayer({
      id: AGG_LABEL,
      type: 'symbol',
      source: AGG_SOURCE,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(8,14,28,0.85)',
        'text-halo-width': 1.4,
      },
    });
  }, [mapRef]);

  // Repaint the grid from the current visible set + feature-state. Needed after
  // a style toggle: setStyle wipes the source, and the geometry effect won't
  // re-fire if visibleHexes is unchanged, so the grid would stay empty.
  const repaintGrid = useCallback(() => {
    const map = mapRef.current?.getMap();
    const ids = visibleRef.current;
    if (!map || ids.length === 0) return;
    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!src) return;
    src.setData(buildGeometry(ids));
    applyFeatureState(ids);
  }, [mapRef, buildGeometry, applyFeatureState]);

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Free up Shift+drag (Mapbox box-zoom) - we use Ctrl+drag for box-select.
    map.boxZoom.disable();

    installHexLayers();

    // Safety net: if a style ever reloads (we no longer trigger it), re-add.
    map.on('style.load', () => {
      installHexLayers();
      repaintGrid();
      refreshHexes();
    });

    // ─── Paint-drag selection ────────────────────────────────────────
    map.on('mousedown', FILL_LAYER, (e) => {
      const ev = e.originalEvent as MouseEvent;
      if (ev.button !== 0) return;
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const h3 = e.features?.[0]?.properties?.h3 as string | undefined;
      if (!h3) return;
      map.dragPan.disable();
      paintRef.current = {
        pressed: true,
        moved: false,
        hexes: new Set([h3]),
        startX: e.point.x,
        startY: e.point.y,
      };
    });

    map.on('mousemove', (e) => {
      const p = paintRef.current;
      if (!p?.pressed) return;
      const wasMoved = p.moved;
      const dx = e.point.x - p.startX;
      const dy = e.point.y - p.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) p.moved = true;
      const feats = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER] });
      const h3 = feats[0]?.properties?.h3 as string | undefined;
      const isNew = !!h3 && !p.hexes.has(h3);
      if (isNew) p.hexes.add(h3!);
      // Live O(1) preview via feature-state - no GeoJSON rebuild per cursor move.
      if (p.moved) {
        if (!wasMoved) {
          // crossed the drag threshold: highlight everything accumulated so far
          for (const h of p.hexes) map.setFeatureState({ source: SOURCE_ID, id: h }, { selected: true });
        } else if (isNew) {
          map.setFeatureState({ source: SOURCE_ID, id: h3! }, { selected: true });
        }
      }
    });

    const endPaint = () => {
      const p = paintRef.current;
      if (!p?.pressed) return;
      map.dragPan.enable();
      if (p.moved && p.hexes.size > 0) {
        const merged = new Set(selectedRef.current);
        for (const h of p.hexes) merged.add(h);
        setSelectedHexes(merged);
        skipClickRef.current = true;
      }
      paintRef.current = null;
    };
    map.on('mouseup', endPaint);
    map.getCanvas().addEventListener('mouseleave', endPaint);

    setReady(true);
    refreshHexes();
  }, [mapRef, refreshHexes, setSelectedHexes, installHexLayers, repaintGrid]);

  const onClick = useCallback(
    (e: MapMouseEvent) => {
      if (skipClickRef.current) {
        skipClickRef.current = false;
        return;
      }
      const map = mapRef.current?.getMap();
      if (!map) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER, CLAIMED_LAYER] });
      if (!feats.length) return;
      const h3 = feats[0].properties?.h3 as string | undefined;
      if (!h3) return;
      const next = new Set(selectedHexes);
      if (next.has(h3)) next.delete(h3);
      else next.add(h3);
      setSelectedHexes(next);
    },
    [selectedHexes, setSelectedHexes, mapRef],
  );

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (!e.ctrlKey) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };

  const handleOverlayMouseUp = (e: React.MouseEvent) => {
    if (!dragStartRef.current) return;
    const start = dragStartRef.current;
    dragStartRef.current = null;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const rect = (map.getContainer() as HTMLElement).getBoundingClientRect();
    const x1 = Math.min(start.x, e.clientX) - rect.left;
    const y1 = Math.min(start.y, e.clientY) - rect.top;
    const x2 = Math.max(start.x, e.clientX) - rect.left;
    const y2 = Math.max(start.y, e.clientY) - rect.top;
    if (Math.abs(x2 - x1) < 5 || Math.abs(y2 - y1) < 5) return;
    const feats = map.queryRenderedFeatures(
      [
        [x1, y1],
        [x2, y2],
      ],
      { layers: [FILL_LAYER] },
    );
    const next = new Set(selectedHexes);
    for (const f of feats) {
      const h3 = f.properties?.h3 as string | undefined;
      if (h3) next.add(h3);
    }
    setSelectedHexes(next);
  };

  if (!token) {
    return (
      <div className="h-full w-full grid place-items-center text-[var(--muted)] text-sm">
        Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
      </div>
    );
  }

  return (
    <>
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{ longitude: 13.405, latitude: 52.52, zoom: 10 }}
        style={{ position: 'absolute', inset: 0 }}
        mapStyle={satellite ? SATELLITE_STYLE : MAP_STYLE}
        projection={{ name: 'globe' }}
        onLoad={onLoad}
        onMove={scheduleRefresh}
        // moveend fires after EVERY wheel tick / micro zoom-ease, not just at
        // the true end of a gesture - route it through the same trailing
        // debounce so the heavy rebuild runs once after motion settles, not
        // dozens of times mid-gesture.
        onMoveEnd={scheduleRefresh}
        onClick={onClick}
        interactiveLayerIds={[FILL_LAYER, CLAIMED_LAYER]}
      />
      <div
        className="absolute inset-0 z-[5]"
        style={{ pointerEvents: 'none' }}
        onMouseDown={(e) => {
          if (e.ctrlKey) {
            (e.currentTarget as HTMLDivElement).style.pointerEvents = 'auto';
            handleOverlayMouseDown(e);
          }
        }}
        onMouseUp={(e) => {
          handleOverlayMouseUp(e);
          (e.currentTarget as HTMLDivElement).style.pointerEvents = 'none';
        }}
      />
      {ready && !zoomedIn && (
        <div
          className="glass glass--strong pointer-events-none absolute z-[6] flex items-center gap-2.5 px-[22px] py-3 text-white"
          style={{
            left: '50%',
            bottom: '28px',
            transform: 'translateX(-50%)',
            borderRadius: 999,
            fontSize: '12.5px',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            className="relative z-[1] grid h-[22px] w-[22px] place-items-center rounded-full"
            style={{ background: 'rgba(94,234,212,0.18)', color: 'var(--brand)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="relative z-[1]">Zoom in to see hexes</span>
        </div>
      )}
    </>
  );
}
