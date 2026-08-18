'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Hexagon, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BuyDialog } from '@/components/marketplace/buy-dialog';
import { StreetViewButton } from '@/components/marketplace/street-view-button';
import { mockListings, type Listing } from '@/lib/mock-marketplace';
import { Flag } from '@/components/flag';
import { UserLink } from '@/components/user-link';
import { hexStaticMapUrl } from '@/lib/static-map';
import { hexCenter } from '@/lib/h3-utils';
import { useHexLocations } from '@/lib/use-hex-locations';
import { classifyTier } from '@/lib/tier';
import { useActiveWallet } from '@/lib/active-wallet';
import {
  cancelListing,
  dispatchListingsChanged,
  fetchListing,
  type DbListing,
} from '@/lib/supabase-listings';
import { cn } from '@/lib/utils';

/** Tile detail - works for both real (UUID) and seed (mock) listings. */
export default function TileDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [buyOpen, setBuyOpen] = useState(false);
  const [dbRow, setDbRow] = useState<DbListing | null>(null);
  const [resolving, setResolving] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const wallet = useActiveWallet();

  // Synchronous mock lookup.
  const mock = useMemo(
    () => mockListings.find((l) => l.id === params.id) ?? null,
    [params.id],
  );

  // If no mock match, try Supabase. Mark resolving complete either way.
  useEffect(() => {
    if (mock) {
      setResolving(false);
      return;
    }
    let cancelled = false;
    setResolving(true);
    fetchListing(params.id).then((row) => {
      if (cancelled) return;
      setDbRow(row);
      setResolving(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mock, params.id]);

  // Reverse-geocode the real listing so we can fill city/neighborhood.
  const dbHexSet = useMemo(() => (dbRow ? new Set([dbRow.h3_id]) : new Set<string>()), [dbRow]);
  const dbLocations = useHexLocations(dbHexSet);

  const listing: Listing | null = useMemo(() => {
    if (mock) return mock;
    if (!dbRow) return null;
    return dbToListing(dbRow, dbLocations);
  }, [mock, dbRow, dbLocations]);

  if (resolving) {
    return (
      <div className="mx-auto flex max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] items-center justify-center px-8 py-20 text-foreground/55">
        <Loader2 className="mr-2 animate-spin" size={16} />
        Loading listing…
      </div>
    );
  }
  if (!listing) notFound();

  const positive = listing.change24h > 0;
  const mapImg = hexStaticMapUrl({ lat: listing.lat, lng: listing.lng });
  // Real listings have UUID ids; seed listings use "01".."50".
  const isReal = !mock;
  const isOwn =
    isReal && wallet.address != null && wallet.address === listing.sellerAddr;

  return (
    <div className="mx-auto flex max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={12} />
          Back to marketplace
        </Link>
      </div>

      <ClaimStamp claimedAt={listing.claimedAt} sequence={listing.claimSequence} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Preview + key facts */}
        <div className="space-y-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
            {mapImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mapImg}
                alt={`Satellite view of ${listing.city} · ${listing.neighborhood}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Hexagon className="text-primary/30" size={120} />
              </div>
            )}
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-background/90 px-2.5 py-1.5 text-sm font-medium backdrop-blur-sm">
              <Flag code={listing.countryCode} size={16} />
              <span>{listing.city}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{listing.neighborhood}</span>
            </div>
            <span className="absolute right-3 top-3 rounded border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-primary">
              Tier {listing.tier}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Fact label="Coordinates">
              <span className="text-xs tabular-nums">
                {listing.lat.toFixed(3)}, {listing.lng.toFixed(3)}
              </span>
            </Fact>
            <Fact label="Hex ID">
              <span className="font-mono text-[11px] text-muted-foreground">{listing.h3}</span>
            </Fact>
            <Fact label="Seller">
              <UserLink addr={listing.sellerAddr} />
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

            {listing.change24h !== 0 && (
              <div className="mt-3 flex items-center gap-4 text-xs">
                <div
                  className={cn(
                    'inline-flex items-center gap-1 tabular-nums',
                    positive ? 'text-emerald-600' : 'text-red-600',
                  )}
                >
                  {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {positive ? '+' : ''}
                  {listing.change24h.toFixed(1)}% 24h
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {isOwn ? (
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={cancelling}
                  onClick={async () => {
                    setCancelling(true);
                    try {
                      await cancelListing(listing.id);
                      dispatchListingsChanged();
                      router.push('/marketplace');
                    } catch {
                      setCancelling(false);
                    }
                  }}
                >
                  {cancelling && <Loader2 className="mr-2 animate-spin" size={14} />}
                  Cancel listing
                </Button>
              ) : (
                <Button className="flex-1" onClick={() => setBuyOpen(true)}>
                  Buy now
                </Button>
              )}
              <StreetViewButton
                lat={listing.lat}
                lng={listing.lng}
                label={`${listing.city} · ${listing.neighborhood}`}
              />
            </div>

            {!isOwn && (
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Buying settles on-chain via the secondary-market program. That
                contract isn&apos;t deployed yet - buys will go live with it.
              </p>
            )}
          </div>
        </div>
      </div>

      <BuyDialog listing={listing} open={buyOpen} onOpenChange={setBuyOpen} />
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

/**
 * Permanent provenance line. Format:
 *   Claimed at 3:47:21 PM UTC, May 21, 2026 · the 18,632nd hex ever claimed.
 *
 * Renders deterministically in en-US/UTC so SSR and CSR agree.
 */
function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

function ClaimStamp({ claimedAt, sequence }: { claimedAt: string; sequence: number }) {
  const date = new Date(claimedAt);
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
  const day = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/40 bg-white/30 px-4 py-2.5 text-sm text-foreground/80 backdrop-blur-md">
      <Clock size={14} strokeWidth={1.6} className="flex-shrink-0 text-foreground/55" />
      <span>
        <span className="text-foreground/55">Claimed at </span>
        <span className="font-medium tabular-nums text-foreground">{time} UTC</span>
        <span className="text-foreground/55">, {day}</span>
        <span className="px-2 text-foreground/30">·</span>
        <span className="text-foreground/55">the </span>
        <span className="font-semibold tabular-nums text-foreground">
          {sequence.toLocaleString('en-US')}
          {ordinalSuffix(sequence)}
        </span>
        <span className="text-foreground/55"> hex ever claimed.</span>
      </span>
    </div>
  );
}

function dbToListing(
  l: DbListing,
  locations: ReturnType<typeof useHexLocations>,
): Listing {
  const c = hexCenter(l.h3_id);
  const loc = locations.get(l.h3_id);
  const price = Number(l.price_sol);
  return {
    id: l.id,
    h3: l.h3_id,
    countryCode: (loc?.countryCode ?? 'un').toLowerCase(),
    city: loc?.place ?? loc?.countryName ?? '-',
    neighborhood: loc?.neighborhood ?? loc?.place ?? '-',
    lat: c.lat,
    lng: c.lng,
    tier: classifyTier(c.lat, c.lng),
    price,
    priceUsd: Math.round(price * 150),
    change24h: 0,
    lastSale: null,
    listedAgo: '-',
    sellerAddr: l.seller,
    claimedAt: l.listed_at,
    claimSequence: 0,
  };
}
