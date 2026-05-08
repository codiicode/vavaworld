'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Map, { type MapRef, type MapMouseEvent } from 'react-map-gl/mapbox';
import type { FeatureCollection, Polygon } from 'geojson';
import type { GeoJSONSource } from 'mapbox-gl';
import { hexCenter, hexToFeature, hexesForBounds } from '@/lib/h3-utils';
import { TIER_FILL, classifyTier } from '@/lib/tier';
import type { SelectedTile } from '@/types/tile';

const SOURCE_ID = 'h3-grid';
const FILL_LAYER = 'h3-grid-fill';
const LINE_LAYER = 'h3-grid-line';
const SELECTED_LAYER = 'h3-grid-selected';

export function MapView({
  onSelect,
  selected,
}: {
  onSelect: (t: SelectedTile) => void;
  selected: SelectedTile | null;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const [ready, setReady] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const refreshHexes = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    const bbox: [number, number, number, number] = [
      b.getWest(),
      b.getSouth(),
      b.getEast(),
      b.getNorth(),
    ];
    const ids = hexesForBounds(bbox);
    const fc: FeatureCollection<Polygon> = {
      type: 'FeatureCollection',
      features: ids.map((id) => {
        const f = hexToFeature(id);
        const c = hexCenter(id);
        f.properties = { ...f.properties, tier: classifyTier(c.lat, c.lng) };
        return f;
      }),
    };
    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (src) src.setData(fc);
  }, []);

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
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
        'fill-opacity': 0.25,
      },
    });
    map.addLayer({
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#232830', 'line-width': 0.5 },
    });
    map.addLayer({
      id: SELECTED_LAYER,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#e6e8eb', 'line-width': 2 },
      filter: ['==', ['get', 'h3'], ''],
    });
    setReady(true);
    refreshHexes();
  }, [refreshHexes]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setFilter(SELECTED_LAYER, ['==', ['get', 'h3'], selected?.h3 ?? '']);
  }, [selected, ready]);

  const onClick = useCallback(
    (e: MapMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER] });
      if (!feats.length) return;
      const h3 = feats[0].properties?.h3 as string | undefined;
      if (!h3) return;
      const c = hexCenter(h3);
      const tier = classifyTier(c.lat, c.lng);
      console.log('selected hex', h3);
      onSelect({ h3, lat: c.lat, lng: c.lng, tier });
    },
    [onSelect],
  );

  if (!token) {
    return (
      <div className="h-full w-full grid place-items-center text-[var(--muted)] text-sm">
        Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={{ longitude: 13.405, latitude: 52.52, zoom: 10 }}
      style={{ position: 'absolute', inset: 0 }}
      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
      onLoad={onLoad}
      onMoveEnd={refreshHexes}
      onClick={onClick}
      interactiveLayerIds={[FILL_LAYER]}
    />
  );
}
