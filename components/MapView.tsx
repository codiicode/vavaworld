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
// tier never change for a given cell — compute once, reuse across every
// refreshHexes pass. Without this, panning 2 000+ visible hexes re-runs
// cellToBoundary + cellToLatLng + a 200-entry city loop for every single one
// on every move event, which is the bulk of the visible "buffer" delay.
type HexMeta = { coords: Position[]; lat: number; lng: number; tier: Tier };
const hexMetaCache: globalThis.Map<string, HexMeta> = new globalThis.Map();
function getHexMeta(h3: string): HexMeta {
  let m = hexMetaCache.get(h3);
  if (!m) {
    const f = hexToFeature(h3);
    const ring = (f.geometry.coordinates[0] ?? []) as Position[];
    const c = hexCenter(h3);
    m = { coords: ring, lat: c.lat, lng: c.lng, tier: classifyTier(c.lat, c.lng) };
    hexMetaCache.set(h3, m);
  }
  return m;
}

// PublicKey.toBytes + base58 parse is the second-most expensive per-tile op.
// The color is purely a function of the address string, so memoize per owner.
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
// viewport produced exactly the same hex set (common during the dozens of
// rAF ticks fired by a single pan/zoom gesture).
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

type Props = {
  selectedHexes: Set<string>;
  setSelectedHexes: (s: Set<string>) => void;
  mapRef: React.MutableRefObject<MapRef | null>;
  refreshTilesRef?: React.MutableRefObject<((h3s: string[]) => void) | null>;
  mapStyle?: string;
};

export function MapView({
  selectedHexes,
  setSelectedHexes,
  mapRef,
  refreshTilesRef,
  mapStyle = 'mapbox://styles/mapbox/satellite-streets-v12',
}: Props) {
  const [ready, setReady] = useState(false);
  const [visibleHexes, setVisibleHexes] = useState<string[]>([]);
  const [zoomedIn, setZoomedIn] = useState(false);
  const { tiles, refresh } = useTiles(visibleHexes);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const aggFetchedAt = useRef(0);

  // Latest selectedHexes / visibleHexes / tiles tracked in refs so the
  // mousedown / mousemove handlers we attach in onLoad can rebuild the
  // mapbox source data directly (without going through React state) for
  // instant visual feedback while paint-dragging.
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

  // Paint-drag state: when the user mousedowns on a hex and starts dragging,
  // we collect every hex the cursor passes over and merge them into the
  // selection on mouseup. Map pan is disabled for the duration so the camera
  // doesn't move while painting.
  const paintRef = useRef<{
    pressed: boolean;
    moved: boolean;
    hexes: Set<string>;
    startX: number;
    startY: number;
  } | null>(null);

  // Suppresses the mapbox 'click' event that fires right after a paint-drag
  // ends, otherwise the click handler would replace the freshly painted set.
  const skipClickRef = useRef(false);

  // Expose refresh to parent so claim modal can invalidate after a successful tx
  useEffect(() => {
    if (refreshTilesRef) refreshTilesRef.current = refresh;
  }, [refresh, refreshTilesRef]);

  const buildFeatureCollection = useCallback(
    (ids: string[]): FeatureCollection<Polygon> => ({
      type: 'FeatureCollection',
      features: ids.map((id) => {
        const m = getHexMeta(id);
        const claimed = tiles.get(id);
        const f: Feature<Polygon> = {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [m.coords] },
          properties: {
            h3: id,
            tier: m.tier,
            claimed: !!claimed,
            ownerColor: claimed ? getOwnerColor(claimed.owner) : null,
            selected: selectedHexes.has(id),
          },
        };
        return f;
      }),
    }),
    [tiles, selectedHexes],
  );

  // Only render individual hexes at zoom >= 14. Below that the cell count in
  // the viewport balloons (~4× at z13 vs z14) and the per-frame rebuild on
  // pan/zoom stops feeling instant. The fly-close button still targets z17.
  const MIN_ZOOM_FOR_HEXES = 14;

  // Country aggregate: claimed countries as labelled points (name, floor,
  // claim count). Throttled to once per 10s while zoomed out.
  const loadAgg = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const now = Date.now();
    if (now - aggFetchedAt.current < 10000) return;
    aggFetchedAt.current = now;
    try {
      const r = await fetch('/api/countries', { cache: 'no-store' });
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
      setVisibleHexes([]);
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

  // Throttle in-flight refreshes during continuous pan/zoom to ~10 fps. The
  // GeoJSON-rebuild + setData round trip is the most expensive thing on the
  // main thread; 60-fps rAF was saturating it and made the gesture feel
  // sluggish. 100 ms still reads as live (the user sees ~10 progressive
  // updates over a one-second zoom), and onMoveEnd always fires a final
  // refresh against the precise stopping bounds.
  const refreshScheduledRef = useRef<number | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshScheduledRef.current != null) return;
    refreshScheduledRef.current = window.setTimeout(() => {
      refreshScheduledRef.current = null;
      refreshHexes();
    }, 100);
  }, [refreshHexes]);
  useEffect(() => {
    return () => {
      if (refreshScheduledRef.current != null) {
        window.clearTimeout(refreshScheduledRef.current);
      }
    };
  }, []);

  // Keep source data in sync with visible / tiles / selection
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!ready || !map) return;
    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (src) src.setData(buildFeatureCollection(visibleHexes));
  }, [ready, visibleHexes, buildFeatureCollection, mapRef]);

  // Idempotent: re-runs after a Mapbox style change (which wipes custom
  // sources/layers) without throwing on the second add.
  const installHexLayers = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, {
      type: 'geojson',
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
        'fill-color': ['coalesce', ['get', 'ownerColor'], '#888'],
        'fill-opacity': ['case', ['get', 'claimed'], 0.55, 0.0],
      },
    });
    // Selected hexes light up with a brand-teal fill before the outline grid
    // is drawn, so the whole cell glows instead of just the edge.
    map.addLayer({
      id: SELECTED_FILL_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': '#5eead4',
        'fill-opacity': 0.55,
        'fill-outline-color': '#5eead4',
      },
      filter: ['==', ['get', 'selected'], true],
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
        'line-opacity': 0.95,
      },
      filter: ['==', ['get', 'selected'], true],
    });

    // Country-level aggregate (shown only when zoomed out, see refreshHexes).
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

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Free up Shift+drag (Mapbox box-zoom) — we use Ctrl+drag for box-select instead
    map.boxZoom.disable();

    installHexLayers();

    // When the user toggles map style, Mapbox wipes custom layers — re-add them
    // and re-render the visible hexes once the new style finishes loading.
    map.on('style.load', () => {
      installHexLayers();
      refreshHexes();
    });

    // ─── Paint-drag selection ────────────────────────────────────────
    // Mousedown on a hex (no modifier) → disable map pan, start collecting.
    // Mousemove keeps adding hexes the cursor passes over.
    // Mouseup commits the merged set into the selection and re-enables pan.
    map.on('mousedown', FILL_LAYER, (e) => {
      const ev = e.originalEvent as MouseEvent;
      if (ev.button !== 0) return; // left button only
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.altKey) return; // leave modifier flows alone
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
      const dx = e.point.x - p.startX;
      const dy = e.point.y - p.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) p.moved = true;
      const feats = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER] });
      const h3 = feats[0]?.properties?.h3 as string | undefined;
      if (!h3 || p.hexes.has(h3)) return;
      p.hexes.add(h3);

      // Live preview: rebuild source data with the in-progress paint set
      // merged into the committed selection. We rebuild directly here
      // instead of going through React state so each new hex lights up on
      // the next animation frame.
      const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (!src) return;
      const merged = new Set(selectedRef.current);
      for (const h of p.hexes) merged.add(h);
      const features = visibleRef.current.map((id) => {
        const m = getHexMeta(id);
        const claimed = tilesRef.current.get(id);
        const f: Feature<Polygon> = {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [m.coords] },
          properties: {
            h3: id,
            tier: m.tier,
            claimed: !!claimed,
            ownerColor: claimed ? getOwnerColor(claimed.owner) : null,
            selected: merged.has(id),
          },
        };
        return f;
      });
      src.setData({ type: 'FeatureCollection', features });
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
    // If the cursor leaves the canvas mid-paint, end gracefully so we don't
    // strand a "pressed" state and lock pan forever.
    map.getCanvas().addEventListener('mouseleave', endPaint);

    setReady(true);
    refreshHexes();
  }, [mapRef, refreshHexes, setSelectedHexes, installHexLayers]);

  const onClick = useCallback(
    (e: MapMouseEvent) => {
      // The mapbox 'click' event fires after a paint-drag's mouseup. Skip it
      // so we don't replace the freshly painted selection with a single-hex.
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

      // Every tap toggles (add or remove). Holding shift behaves identically
      // — it's there for muscle-memory from the old "shift to multi-select"
      // flow, but a plain click already multi-selects now. Mobile users get
      // multi-select for free since there's no modifier to require.
      const next = new Set(selectedHexes);
      if (next.has(h3)) next.delete(h3);
      else next.add(h3);
      setSelectedHexes(next);
    },
    [selectedHexes, setSelectedHexes, mapRef],
  );

  // Ctrl+drag rectangle: overlay only intercepts when ctrlKey is held
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
    if (Math.abs(x2 - x1) < 5 || Math.abs(y2 - y1) < 5) return; // click, not drag
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
        mapStyle={mapStyle}
        projection={{ name: 'globe' }}
        onLoad={onLoad}
        onMove={scheduleRefresh}
        onMoveEnd={refreshHexes}
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
