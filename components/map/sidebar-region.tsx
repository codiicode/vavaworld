'use client';

import { useReverseGeocode } from '@/lib/use-reverse-geocode';
import { flagEmoji } from '@/lib/flag-emoji';

/**
 * Region context: viewport-center reverse-geocoded + three mini stats.
 * Only renders when zoom > 11. Caller passes (centerLat, centerLng, zoom).
 *
 * TODO: replace mocked stats with `/api/regions/stats?bbox=…` when indexer exists.
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
  const flag = flagEmoji(region?.countryCode);

  return (
    <div className="border-b border-border px-5 py-4">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Viewing
      </div>
      <div className="mb-4 flex items-center gap-2">
        {flag && <span className="text-base leading-none">{flag}</span>}
        <h2 className="truncate text-[17px] font-semibold tracking-tight">{display}</h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Tiles" value="2,847" />
        <Stat label="Claimed" value="182" />
        <Stat label="Floor" value="0.04 SOL" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums tracking-tight">{value}</div>
    </div>
  );
}
