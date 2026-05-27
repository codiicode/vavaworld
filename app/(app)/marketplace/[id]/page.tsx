'use client';

import { useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Hexagon, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BuyDialog } from '@/components/marketplace/buy-dialog';
import { ListTileDialog } from '@/components/marketplace/list-tile-dialog';
import { mockActivity, mockListings } from '@/lib/mock-marketplace';
import { flagEmoji } from '@/lib/flag-emoji';
import { cn } from '@/lib/utils';

/**
 * Tile detail page — preview + facts on the left, on-chain history on the right.
 *
 * No real Mapbox tile here yet; the hex placeholder mirrors the grid card so the
 * eye lands in the same place.
 */
export default function TileDetailPage() {
  const params = useParams<{ id: string }>();
  const listing = mockListings.find((l) => l.id === params.id);
  const [buyOpen, setBuyOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  if (!listing) notFound();

  const positive = listing.change24h > 0;
  const decayColor =
    listing.decayPercent > 70
      ? 'bg-emerald-500'
      : listing.decayPercent > 30
        ? 'bg-amber-500'
        : 'bg-red-500';

  // Synthesize a recent-history feed for this tile from the global activity
  const history = mockActivity.slice(0, 6);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 md:gap-6 md:px-6 md:py-6">
      <div>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={12} />
          Back to marketplace
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Preview + key facts */}
        <div className="space-y-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <Hexagon className="text-primary/30" size={120} />
            </div>
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-background/90 px-2.5 py-1.5 text-sm font-medium backdrop-blur-sm">
              <span className="text-base leading-none">{flagEmoji(listing.countryCode)}</span>
              <span>{listing.city}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{listing.neighborhood}</span>
            </div>
            <span className="absolute right-3 top-3 rounded border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-primary">
              Tier {listing.tier}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Decay">
              <div className="flex items-center gap-2">
                <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full', decayColor)}
                    style={{ width: `${listing.decayPercent}%` }}
                  />
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {listing.decayPercent}%
                </span>
              </div>
            </Fact>
            <Fact label="Coordinates">
              <span className="text-xs tabular-nums">
                {listing.lat.toFixed(3)}, {listing.lng.toFixed(3)}
              </span>
            </Fact>
            <Fact label="Hex ID">
              <span className="font-mono text-[11px] text-muted-foreground">{listing.h3}</span>
            </Fact>
            <Fact label="Seller">
              <span className="font-mono text-xs">{listing.sellerAddr}</span>
            </Fact>
          </div>
        </div>

        {/* Right column: price card + history */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              List price
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums tracking-tight">
                {listing.price.toFixed(3)}
              </span>
              <span className="text-sm font-medium text-muted-foreground">SOL</span>
              <span className="ml-2 text-sm tabular-nums text-muted-foreground">
                ≈ ${listing.priceUsd}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs">
              <div
                className={cn(
                  'inline-flex items-center gap-1 tabular-nums',
                  listing.change24h === 0
                    ? 'text-muted-foreground'
                    : positive
                      ? 'text-emerald-600'
                      : 'text-red-600',
                )}
              >
                {listing.change24h !== 0 &&
                  (positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
                {positive ? '+' : ''}
                {listing.change24h.toFixed(1)}% 24h
              </div>
              <div className="text-muted-foreground">
                Last sale:{' '}
                <span className="tabular-nums text-foreground">
                  {listing.lastSale != null ? `${listing.lastSale.toFixed(3)} SOL` : '—'}
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button className="flex-1" onClick={() => setBuyOpen(true)}>
                Buy now
              </Button>
              <Button variant="outline" onClick={() => setListOpen(true)}>
                Make offer
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Recent history
              </div>
            </div>
            <ul className="divide-y divide-border">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-mono">{h.fromAddr}</span>
                    <ArrowRight size={10} />
                    <span className="font-mono">{h.toAddr}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">{h.price.toFixed(3)} SOL</span>
                    <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
                      {h.ago}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <BuyDialog
        listing={listing}
        open={buyOpen}
        onOpenChange={setBuyOpen}
      />
      <ListTileDialog open={listOpen} onOpenChange={setListOpen} />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
