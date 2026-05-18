'use client';

import { useReverseGeocode } from '@/lib/use-reverse-geocode';
import { Flag } from '@/components/flag';

/**
 * Region context: the viewport-centre's place name + country flag.
 * Only renders when zoom > 11 — at world view the centre is meaningless.
 *
 * Per-region tile stats (count / floor / available) need an indexer; intentionally
 * dropped until that exists rather than showing made-up numbers.
 */
export function SidebarRegion({
  centerLat,
  centerLng,
  zoom,
}: {
  centerLat: number | null;
  centerLng: number | null;
  zoom: number;
}) {
  const active = zoom > 11 && centerLat != null && centerLng != null;
  const region = useReverseGeocode(centerLat, centerLng, active);

  if (!active) return null;

  const display = region?.display ?? 'Locating…';

  return (
    <div className="border-b border-border px-5 py-4">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Viewing
      </div>
      <div className="flex items-center gap-2">
        <Flag code={region?.countryCode} size={16} />
        <h2 className="truncate text-[17px] font-semibold tracking-tight">{display}</h2>
      </div>
    </div>
  );
}
