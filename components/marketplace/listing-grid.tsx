'use client';

import { useRouter } from 'next/navigation';
import { Hexagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { flagEmoji } from '@/lib/flag-emoji';
import type { Listing } from '@/lib/mock-marketplace';

/**
 * Grid view alternative to the table. 3-4 columns of card-shaped previews,
 * each with a hex placeholder where a Mapbox static image will eventually go.
 *
 * Same row hover discipline as the table — Buy reveals on hover, click-through
 * routes to the detail page.
 */
export function ListingGrid({
  listings,
  onBuy,
}: {
  listings: ReadonlyArray<Listing>;
  onBuy: (listing: Listing) => void;
}) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-1 gap-3 overflow-y-auto p-3 sm:grid-cols-2 md:grid-cols-3 md:p-6 xl:grid-cols-4">
      {listings.map((l) => (
        <div
          key={l.id}
          onClick={() => router.push(`/marketplace/${l.id}`)}
          className="group cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/20"
        >
          {/* Preview area — hex placeholder until Mapbox static images land */}
          <div className="relative aspect-[4/3] bg-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <Hexagon className="text-primary/40" size={64} />
            </div>
            <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-background/90 px-2 py-1 text-[11px] font-medium backdrop-blur-sm">
              <span>{flagEmoji(l.countryCode)}</span>
              <span>{l.city}</span>
            </div>
            <span className="absolute right-2 top-2 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
              T{l.tier}
            </span>
          </div>

          <div className="space-y-2 p-3">
            <div>
              <div className="truncate text-sm font-medium">{l.neighborhood}</div>
              <div className="text-[11px] tabular-nums text-muted-foreground">
                {Math.abs(l.lat).toFixed(3)}°{l.lat >= 0 ? 'N' : 'S'},{' '}
                {Math.abs(l.lng).toFixed(3)}°{l.lng >= 0 ? 'E' : 'W'}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Price
                </div>
                <div className="text-sm font-semibold tabular-nums">{l.price.toFixed(3)} SOL</div>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs md:h-7 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy(l);
                }}
              >
                Buy
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
