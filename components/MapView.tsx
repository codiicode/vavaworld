'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Map, { type MapRef, type MapMouseEvent } from 'react-map-gl/mapbox';
import type { FeatureCollection, Polygon } from 'geojson';
import type { GeoJSONSource } from 'mapbox-gl';
import { hexCenter, hexToFeature, hexesForBounds } from '@/lib/h3-utils';
import { TIER_FILL, classifyTier } from '@/lib/tier';
import { useTiles } from '@/lib/use-tiles';
import { ownerColor } from '@/lib/owner-color';
import { PublicKey } from '@solana/web3.js';

const SOURCE_ID = 'h3-grid';
const FILL_LAYER = 'h3-grid-fill';
const LINE_LAYER = 'h3-grid-line';
const CLAIMED_LAYER = 'h3-grid-claimed';
const SELECTED_LAYER = 'h3-grid-selected';

type Props = {
  selectedHexes: Set<string>;
  setSelectedHexes: (s: Set<string>) => void;
  mapRef: React.MutableRefObject<MapRef | null>;
  refreshTilesRef?: React.MutableRefObject<((h3s: string[]) => void) | null>;
};

export function MapView({ selectedHexes, setSelectedHexes, mapRef, refreshTilesRef }: Props) {
  const [ready, setReady] = useState(false);
  const [visibleHexes, setVisibleHexes] = useState<string[]>([]);
  const [zoomedIn, setZoomedIn] = useState(false);
  const { tiles, refresh } = useTiles(visibleHexes);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Expose refresh to parent so claim modal can invalidate after a successful tx
  useEffect(() => {
    if (refreshTilesRef) refreshTilesRef.current = refresh;
  }, [refresh, refreshTilesRef]);

  const buildFeatureCollection = useCallback(
    (ids: string[]): FeatureCollection<Polygon> => ({
      type: 'FeatureCollection',
      features: ids.map((id) => {
        const f = hexToFeature(id);
        const c = hexCenter(id);
        const claimed = tiles.get(id);
        f.properties = {
          ...f.properties,
          tier: classifyTier(c.lat, c.lng),
          claimed: !!claimed,
          ownerColor: claimed ? ownerColor(new PublicKey(claimed.owner)) : null,
          selected: selectedHexes.has(id),
        };
        return f;
      }),
    }),
    [tiles, selectedHexes],
  );

  // Hide the hex grid entirely below this zoom — at world-view zoom the
  // hex count balloons and viewport-batched RPC calls become slow.
  // Only render hexes when zoomed in enough that they're meaningful.
  const MIN_ZOOM_FOR_HEXES = 14;

  const refreshHexes = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const isZoomedIn = map.getZoom() >= MIN_ZOOM_FOR_HEXES;
    setZoomedIn(isZoomedIn);
    if (!isZoomedIn) {
      setVisibleHexes([]);
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
    setVisibleHexes(ids);
  }, [mapRef]);

  // Keep source data in sync with visible / tiles / selection
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!ready || !map) return;
    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (src) src.setData(buildFeatureCollection(visibleHexes));
  }, [ready, visibleHexes, buildFeatureCollection, mapRef]);

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Free up Shift+drag (Mapbox box-zoom) — we use Ctrl+drag for box-select instead
    map.boxZoom.disable();

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
      paint: { 'line-color': '#ffffff', 'line-width': 2.5 },
      filter: ['==', ['get', 'selected'], true],
    });

    setReady(true);
    refreshHexes();
  }, [mapRef, refreshHexes]);

  const onClick = useCallback(
    (e: MapMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER, CLAIMED_LAYER] });
      if (!feats.length) return;
      const h3 = feats[0].properties?.h3 as string | undefined;
      if (!h3) return;

      const ev = e.originalEvent;
      if (ev.shiftKey) {
        const next = new Set(selectedHexes);
        if (next.has(h3)) next.delete(h3);
        else next.add(h3);
        setSelectedHexes(next);
      } else {
        // Single click — replace selection
        setSelectedHexes(new Set([h3]));
      }
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
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        onLoad={onLoad}
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
          className="absolute z-[6] pointer-events-none flex items-center gap-2 px-5 py-2.5"
          style={{
            left: '50%',
            bottom: '40px',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            border: '1px solid var(--hairline)',
            borderRadius: 999,
            fontFamily: "'Inter', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ink-2)',
            whiteSpace: 'nowrap',
            fontWeight: 500,
          }}
        >
          <span style={{ color: 'var(--signal)' }}>+</span>
          Zoom in to see tiles
        </div>
      )}
    </>
  );
}
