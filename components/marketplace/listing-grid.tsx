'use client';

import Link from 'next/link';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Flag } from '@/components/flag';
import { hexStaticMapUrl } from '@/lib/static-map';
import { cn } from '@/lib/utils';
import type { Listing } from '@/lib/mock-marketplace';

/**
 * Minimal listing card grid. Each card is a glass tile with a satellite
 * preview of the actual hex on top, then a thin info bar (city · neighborhood,
 * tier chip, price, 24h delta). Matches the visual vibe of the other (app)
 * pages — same rounded-2xl + bg-white/30 + backdrop-blur recipe.
 */
export function ListingGrid({ listings }: { listings: ReadonlyArray<Listing> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}

function ListingCard({ listing: l }: { listing: Listing }) {
  const img = hexStaticMapUrl({ lat: l.lat, lng: l.lng, width: 480, height: 320, zoom: 17 });
  const positive = l.change24h > 0;
  return (
    <Link
      href={`/marketplace/${l.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md transition-colors hover:bg-white/40"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-foreground/[0.04]">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={`Satellite view of ${l.city} · ${l.neighborhood}`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        )}
        <span className="absolute right-2 top-2 rounded border border-primary/30 bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary backdrop-blur-sm">
          T{l.tier}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <Flag code={l.countryCode} size={15} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium leading-tight text-foreground">
              {l.city}
            </div>
            <div className="mt-0.5 truncate text-[11px] leading-tight text-foreground/55">
              {l.neighborhood}
            </div>
          </div>
        </div>

        <div className="mt-1 flex items-baseline justify-between border-t border-white/30 pt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {l.price.toFixed(3)}
            </span>
            <span className="text-[11px] text-foreground/55">SOL</span>
          </div>
          {l.change24h !== 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-[11px] tabular-nums',
                positive ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {positive ? '+' : ''}
              {l.change24h.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
