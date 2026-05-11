'use client';

import { Flame, ArrowRight } from 'lucide-react';
import type { MapRef } from 'react-map-gl/mapbox';
import { flagEmoji } from '@/lib/flag-emoji';

// TODO: replace with `/api/regions/hot?bbox=…` once the indexer is up.
const MOCK_HOT: ReadonlyArray<{
  id: string;
  place: string;
  country: string;
  price: number;
  lat: number;
  lng: number;
}> = [
  { id: 'h1', place: 'Stockholm · Östermalm', country: 'se', price: 0.21, lat: 59.336, lng: 18.077 },
  { id: 'h2', place: 'Stockholm · Södermalm', country: 'se', price: 0.18, lat: 59.314, lng: 18.075 },
  { id: 'h3', place: 'Uppsala · Centrum', country: 'se', price: 0.06, lat: 59.858, lng: 17.638 },
];

export function HotNearby({ mapRef }: { mapRef: React.RefObject<MapRef | null> }) {
  const flyTo = (lat: number, lng: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 1500 });
  };
  return (
    <div className="border-t border-border px-5 py-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Flame size={12} className="text-muted-foreground" />
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Hot Nearby
        </span>
      </div>
      <div className="flex flex-col">
        {MOCK_HOT.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => flyTo(h.lat, h.lng)}
            className="group -mx-2 flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-xs leading-none">{flagEmoji(h.country) || '🌐'}</span>
              <span className="truncate text-sm font-medium">{h.place}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground transition-colors group-hover:text-foreground">
              <span className="text-sm tabular-nums">{h.price.toFixed(3)}</span>
              <span className="text-xs">SOL</span>
              <ArrowRight size={12} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
