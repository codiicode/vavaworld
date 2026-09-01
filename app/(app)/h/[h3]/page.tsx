'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, Gavel, Hexagon, Loader2, X } from 'lucide-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { BorshAccountsCoder, type Idl } from '@coral-xyz/anchor';
import { BidDialog } from '@/components/bid-dialog';
import { Button } from '@/components/ui/button';
import { Flag } from '@/components/flag';
import { StreetViewButton } from '@/components/marketplace/street-view-button';
import { UserLink } from '@/components/user-link';
import { useActiveWallet } from '@/lib/active-wallet';
import { useBidsForHex, type DbBid } from '@/lib/bids';
import { acceptBidOnChain, cancelBidOnChain, declineBidOnChain } from '@/lib/bid-chain';
import { hexCenter } from '@/lib/h3-utils';
import { hexStaticMapUrl } from '@/lib/static-map';
import { classifyTier } from '@/lib/tier';
import { useHexLocations } from '@/lib/use-hex-locations';
import { getConnection, PROGRAM_ID } from '@/lib/anchor-client';
import { tilePda } from '@/lib/tile-pda';
import idl from '@/lib/anchor-idl.json';
import { getSupabase } from '@/lib/supabase';
import type { DbListing } from '@/lib/supabase-listings';
import type { ClaimedTile } from '@/types/tile';
import type { Tier } from '@/lib/tier';

import { useUsdFmt } from '@/lib/usd';
const programIdPk = new PublicKey(PROGRAM_ID);
const coder = new BorshAccountsCoder(idl as Idl);

function decodeTile(buf: Buffer, h3: string): ClaimedTile | null {
  try {
    const d = coder.decode<{
      owner: PublicKey;
      claimed_at: { toNumber: () => number };
      tier: number;
      price_paid: { toString: () => string };
      bump: number;
    }>('Hex', buf);
    return {
      h3,
      owner: d.owner.toBase58(),
      tier: d.tier as Tier,
      claimedAt: d.claimed_at.toNumber(),
      pricePaid: BigInt(d.price_paid.toString()),
      bump: d.bump,
    };
  } catch {
    return null;
  }
}

function looksLikeH3(s: string): boolean {
  return /^[0-9a-fA-F]{15,17}$/.test(s);
}

function formatAgo(unixSec: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - unixSec * 1000) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * Public hex detail page - one URL per hex so they're shareable. Resolves the
 * h3 in the URL, looks up on-chain ownership + any active marketplace listing,
 * and renders a clean glass-card view matching the rest of the (app) pages.
 */
export default function HexDetailPage() {
  const params = useParams<{ h3: string }>();
  const h3 = decodeURIComponent(params.h3);
  if (!looksLikeH3(h3)) notFound();

  // Pure derivations from the h3 id (no network).
  const c = useMemo(() => hexCenter(h3), [h3]);
  const tier = useMemo(() => classifyTier(c.lat, c.lng), [c]);
  const mapImg = useMemo(
    () => hexStaticMapUrl({ lat: c.lat, lng: c.lng, width: 920, height: 690, zoom: 17 }),
    [c],
  );

  // Reverse-geocode the centre via the shared locations cache.
  const hexSet = useMemo(() => new Set([h3]), [h3]);
  const locations = useHexLocations(hexSet);
  const loc = locations.get(h3) ?? null;

  // On-chain owner lookup - one getAccountInfo, decoded as a Tile PDA.
  const [tile, setTile] = useState<ClaimedTile | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const conn = getConnection();
        const [pda] = tilePda(h3, programIdPk);
        const ai = await conn.getAccountInfo(pda);
        if (cancelled) return;
        setTile(ai ? decodeTile(ai.data as Buffer, h3) : null);
      } catch {
        if (!cancelled) setTile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [h3]);

  // Active marketplace listing for this hex (if the owner has put it up).
  const [listing, setListing] = useState<DbListing | null>(null);
  useEffect(() => {
    let cancelled = false;
    const sb = getSupabase();
    if (!sb) return;
    (async () => {
      const { data } = await sb
        .from('listings')
        .select('*')
        .eq('h3_id', h3)
        .eq('status', 'active')
        .maybeSingle<DbListing>();
      if (!cancelled) setListing(data ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [h3]);

  const city = loc?.place ?? loc?.countryName ?? 'Locating…';
  const neighborhood = loc?.neighborhood ?? loc?.place ?? '-';
  const country = loc?.countryName ?? 'Unmapped';
  const loadingOwner = tile === undefined;
  const claimed = tile !== null && tile !== undefined;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <Link
        href="/map"
        className="inline-flex items-center gap-1.5 text-xs text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft size={12} />
        Back to map
      </Link>

      {/* Header - title + flag + tier */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight text-foreground">
            <Flag code={loc?.countryCode} size={26} />
            <span>{city}</span>
            <span className="text-foreground/30">·</span>
            <span className="text-foreground/70">{neighborhood}</span>
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            {country} · Tier {tier} · {Math.abs(c.lat).toFixed(4)}°{c.lat >= 0 ? 'N' : 'S'},{' '}
            {Math.abs(c.lng).toFixed(4)}°{c.lng >= 0 ? 'E' : 'W'}
          </p>
        </div>
        <span className="rounded border border-primary/30 bg-primary/15 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
          Tier {tier}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Left - preview + facts */}
        <div className="space-y-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/40 bg-foreground/[0.04]">
            {mapImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mapImg}
                alt={`Satellite view of ${city} · ${neighborhood}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Hexagon className="text-primary/30" size={120} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Fact label="Coordinates">
              <span className="text-xs tabular-nums">
                {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
              </span>
            </Fact>
            <Fact label="Hex ID">
              <span className="break-all font-mono text-[10.5px] text-foreground/70">{h3}</span>
            </Fact>
            <Fact label="Country">
              <span className="inline-flex items-center gap-1.5 text-sm">
                <Flag code={loc?.countryCode} size={14} />
                {country}
              </span>
            </Fact>
          </div>
        </div>

        {/* Right - ownership / listing / actions */}
        <div className="space-y-4">
          {loadingOwner ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/40 bg-white/30 px-5 py-6 text-sm text-foreground/65 backdrop-blur-md">
              <Loader2 size={14} className="animate-spin" />
              Checking ownership…
            </div>
          ) : claimed ? (
            <OwnerCard tile={tile!} />
          ) : (
            <UnclaimedCard h3={h3} />
          )}

          {listing && claimed && (
            <ListingCard listing={listing} />
          )}

          {claimed && (
            <BidsCard
              h3={h3}
              owner={tile!.owner}
              placeLabel={`${city} · ${neighborhood}`}
              countryCode={loc?.countryCode ?? undefined}
              askSol={listing ? Number(listing.price_sol) : null}
            />
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/map#${h3}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/40 bg-white/30 px-3 text-xs font-medium text-foreground transition-colors hover:bg-white/40"
            >
              View on map
              <ExternalLink size={11} />
            </Link>
            <StreetViewButton
              lat={c.lat}
              lng={c.lng}
              label={`${city} · ${neighborhood}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/30 px-4 py-3 backdrop-blur-md">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/55">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function OwnerCard({ tile }: { tile: ClaimedTile }) {
  const usd = useUsdFmt();
  const paidSol = Number(tile.pricePaid) / LAMPORTS_PER_SOL;
  return (
    <div className="rounded-2xl border border-white/40 bg-white/30 p-5 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
          Owned
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7db4f5]">
          <CheckCircle2 size={12} />
          Claimed
        </span>
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm text-foreground/60">Owner</span>
        <UserLink addr={tile.owner} />
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-white/40 pt-3 text-sm">
        <div>
          <div className="mb-0.5 flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-foreground/55">
            <Clock size={10} />
            Claimed
          </div>
          <div className="font-medium text-foreground">{formatAgo(tile.claimedAt)}</div>
        </div>
        <div>
          <div className="mb-0.5 text-[10.5px] uppercase tracking-wider text-foreground/55">
            Originally paid
          </div>
          <div className="font-medium tabular-nums text-foreground">
            {usd(paidSol)}
          </div>
        </div>
      </div>
    </div>
  );
}

function UnclaimedCard({ h3 }: { h3: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/12 bg-white/[0.04] p-5 backdrop-blur-md">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">
        Available
      </div>
      <p className="text-sm text-foreground/80">
        This hex isn&apos;t claimed yet - be the first to plant a flag here.
      </p>
      <Link href={`/map#${h3}`}>
        <Button className="w-full">Claim on the map</Button>
      </Link>
    </div>
  );
}

/**
 * Open offers on this hex + the entry point for making one. Owners see
 * accept/decline on each bid, bidders can withdraw their own, everyone
 * else connected can place an offer - listed or not.
 */
function BidsCard({
  h3,
  owner,
  placeLabel,
  countryCode,
  askSol,
}: {
  h3: string;
  owner: string;
  placeLabel: string;
  countryCode?: string;
  askSol: number | null;
}) {
  const usd = useUsdFmt();
  const wallet = useActiveWallet();
  const { bids, refresh } = useBidsForHex(h3);
  const [bidOpen, setBidOpen] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const viewer = wallet.address;
  const isOwner = viewer === owner;

  const act = async (bid: DbBid, action: 'accept' | 'decline' | 'cancel') => {
    if (!viewer || !wallet.writeContract) return;
    setError(null);
    setActingOn(bid.id);
    try {
      // Every action settles on-chain: accept splits the escrow and
      // flips the tile atomically, decline/cancel refund the bidder.
      if (action === 'accept') {
        await acceptBidOnChain({ wallet, h3, bidId: bid.id, bidder: bid.bidder });
      } else if (action === 'decline') {
        await declineBidOnChain({ wallet, h3, bidId: bid.id, bidder: bid.bidder });
      } else {
        await cancelBidOnChain({ wallet, h3, bidId: bid.id });
      }
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/40 bg-white/30 p-5 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
          <Gavel size={12} />
          Offers
        </span>
        <span className="text-[11px] text-foreground/50">
          {bids.length === 0 ? 'None yet' : `${bids.length} open`}
        </span>
      </div>

      {bids.length > 0 && (
        <div className="mb-3 flex flex-col divide-y divide-white/40">
          {bids.slice(0, 5).map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 py-2 first:pt-0">
              <div className="min-w-0">
                <div className="text-sm font-semibold tabular-nums text-foreground">
                  {usd(Number(b.price_sol))}
                </div>
                <div className="truncate text-[11px] text-foreground/55">
                  <UserLink addr={b.bidder} />
                </div>
              </div>
              <div className="flex flex-none items-center gap-1.5">
                {isOwner && (
                  <>
                    <button
                      type="button"
                      disabled={actingOn !== null}
                      onClick={() => void act(b, 'accept')}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-[#7db4f5] px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#7db4f5] disabled:opacity-50"
                    >
                      {actingOn === b.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={11} />
                      )}
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={actingOn !== null}
                      onClick={() => void act(b, 'decline')}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-white/40 bg-white/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-white/40 disabled:opacity-50"
                    >
                      <X size={11} />
                      Decline
                    </button>
                  </>
                )}
                {!isOwner && viewer === b.bidder && (
                  <button
                    type="button"
                    disabled={actingOn !== null}
                    onClick={() => void act(b, 'cancel')}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-white/40 bg-white/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-white/40 disabled:opacity-50"
                  >
                    {actingOn === b.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mb-2 text-xs text-red-600 dark:text-red-300">{error}</p>}

      {!isOwner && wallet.connected && (
        <Button variant="outline" className="w-full" onClick={() => setBidOpen(true)}>
          <Gavel size={14} className="mr-1.5" />
          Make an offer
        </Button>
      )}
      {!wallet.connected && bids.length === 0 && (
        <p className="text-xs leading-relaxed text-foreground/60">
          Connect your wallet to make the owner an offer - the hex doesn&apos;t
          need to be listed.
        </p>
      )}

      <BidDialog
        h3={h3}
        placeLabel={placeLabel}
        countryCode={countryCode}
        askSol={askSol}
        open={bidOpen}
        onOpenChange={setBidOpen}
        onPlaced={refresh}
      />
    </div>
  );
}

function ListingCard({ listing }: { listing: DbListing }) {
  const usd = useUsdFmt();
  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 backdrop-blur-md">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-primary">
        Listed for sale
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {usd(Number(listing.price_sol))}
        </span>
        <span className="text-xs text-foreground/55">≈ ${Math.round(Number(listing.price_sol) * 150)}</span>
      </div>
      <Link
        href={`/marketplace/${listing.id}`}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        View on marketplace
        <ExternalLink size={11} />
      </Link>
    </div>
  );
}
