'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useActiveWallet } from '@/lib/active-wallet';
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { useUserProfile } from '@/lib/use-user-profile';
import { useCounters } from '@/lib/use-counters';
import { useHexLocations, type HexLocation } from '@/lib/use-hex-locations';
import { useTiles } from '@/lib/use-tiles';
import { hexCenter } from '@/lib/h3-utils';
import { classifyTier } from '@/lib/tier';
import { quoteOne } from '@/lib/quote';
import { Flag } from '@/components/flag';
import { HexPricingCard } from '@/components/map/hex-pricing-card';
import { cn } from '@/lib/utils';
import type { ClaimedTile } from '@/types/tile';

function shortAddr(addr: string): string {
  if (!addr) return '—';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function gradientFromAddr(addr: string | null): string {
  if (!addr) return 'linear-gradient(135deg, #6ee7d6, #22d3ee)';
  const h1 = (addr.charCodeAt(0) + addr.charCodeAt(1)) % 360;
  const h2 = (addr.charCodeAt(2) + addr.charCodeAt(3)) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 60%) 0%, hsl(${h2} 70% 50%) 100%)`;
}

type TabId = 'selection';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'selection', label: 'Selection' },
];

/**
 * Right rail on /map. 320px glass panel pinned to the right gutter, full height
 * inside the 18px outer gap.
 *
 * Empty Selection state matches the design verbatim (hint paragraph + disabled
 * "Select at least one tile" CTA). When ≥1 hex is selected we swap to a scrollable
 * list + "Claim N tiles · X.XX SOL" CTA.
 */
export function GlassRightPanel({
  selectedHexes,
  onRemoveHex,
  onClaim,
  onSelectClosest,
}: {
  selectedHexes: Set<string>;
  onRemoveHex: (h3: string) => void;
  onClaim: () => void;
  onSelectClosest: (n: number) => void;
}) {
  const [tab, setTab] = useState<TabId>('selection');
  // Mobile-only: the sheet starts COLLAPSED so the map stays tappable behind
  // it (otherwise selecting one hex would block tapping more). Tap the bar
  // header to expand. Desktop ignores this and is always fully visible.
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const wallet = useActiveWallet();
  const profile = useUserProfile();
  const { balance } = useWalletBalance(wallet.publicKey);
  const counters = useCounters();
  const locations = useHexLocations(selectedHexes);

  // Find out which of the selected hexes are already claimed (on-chain PDA hit).
  const selectedArr = useMemo(() => Array.from(selectedHexes), [selectedHexes]);
  const { tiles: claimedCache } = useTiles(selectedArr);
  const claimedTiles = useMemo(() => {
    const m = new Map<string, ClaimedTile>();
    for (const h of selectedArr) {
      const t = claimedCache.get(h);
      if (t) m.set(h, t);
    }
    return m;
  }, [selectedArr, claimedCache]);

  const items = Array.from(selectedHexes).map((h3) => {
    const c = hexCenter(h3);
    return { h3, lat: c.lat, lng: c.lng, tier: classifyTier(c.lat, c.lng) };
  });

  // Bonding-curve walk for per-row price display
  const localSold: Record<1 | 2 | 3, bigint> = { 1: 0n, 2: 0n, 3: 0n };
  const perItemSol = items.map((it) => {
    const sold = counters[it.tier] + localSold[it.tier];
    localSold[it.tier] += 1n;
    return Number(quoteOne(it.tier, sold)) / LAMPORTS_PER_SOL;
  });

  const count = items.length;

  // Quick mobile-summary totals so the collapsed bar can show price preview
  // without rendering the full list.
  const claimableTotalSolMobile = items.reduce(
    (s, it, i) => (claimedTiles.has(it.h3) ? s : s + perItemSol[i]),
    0,
  );

  return (
    <aside
      className={cn(
        'glass glass-panel fixed z-30 flex flex-col',
        // Desktop: pinned right rail, always fully expanded.
        'md:inset-x-auto md:bottom-[18px] md:right-[18px] md:top-[18px] md:max-h-none md:w-[320px] md:overflow-visible md:rounded-[22px] md:px-5 md:pb-[22px] md:pt-5',
        // Mobile: bottom sheet. Collapsed = compact bar (~88px) so most of
        // the map is reachable for taps; expanded = scrollable sheet.
        mobileExpanded
          ? 'inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-[22px] px-5 pb-[22px] pt-3'
          : 'inset-x-3 bottom-3 max-h-[88px] overflow-hidden rounded-[22px] px-4 py-3',
      )}
      style={{ gap: mobileExpanded ? 20 : 0 }}
    >
      {/* Mobile: collapsed handle + summary bar. Hidden on desktop where the
          full panel is always shown. */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileExpanded((v) => !v)}
          aria-label={mobileExpanded ? 'Minimise' : 'Expand'}
          className="mx-auto mb-2 block h-1 w-12 rounded-full bg-white/40"
        />
        {!mobileExpanded && (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-white">
                {count === 0
                  ? 'Tap a hex to select'
                  : `${count} selected · ${claimableTotalSolMobile.toFixed(3)} SOL`}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-white/55">
                {count === 0 ? 'Map is fully interactive' : 'Tap to expand'}
              </div>
            </div>
            {count > 0 && (
              <button
                type="button"
                onClick={onClaim}
                disabled={!wallet.connected}
                className="glass glass--cta flex h-10 items-center justify-center rounded-full px-4 text-[13px] font-bold tracking-[0.04em] disabled:opacity-50"
                style={{
                  border: '1px solid rgba(255,255,255,0.24)',
                  color: '#042f2e',
                }}
              >
                Claim
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileExpanded(true)}
              aria-label="Expand"
              className="grid h-10 w-10 place-items-center rounded-full text-white/70"
            >
              <ChevronUp size={18} />
            </button>
          </div>
        )}
        {mobileExpanded && (
          <button
            type="button"
            onClick={() => setMobileExpanded(false)}
            aria-label="Minimise"
            className="absolute right-3 top-2 grid h-8 w-8 place-items-center rounded-full text-white/60"
          >
            <ChevronDown size={18} />
          </button>
        )}
      </div>

      {/* Full panel content — hidden when mobile-collapsed, always visible on desktop. */}
      <div
        className={cn(
          'flex flex-col',
          mobileExpanded ? 'flex' : 'hidden md:flex',
        )}
        style={{ gap: 20 }}
      >
      {/* Wallet chip */}
      <div
        className="relative z-[1] flex items-center gap-3 rounded-[16px] px-3 py-2"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))',
          border: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <div
          className="grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-[10px] text-[12.5px] font-bold"
          style={{
            background: profile.avatarUrl
              ? `url(${profile.avatarUrl}) center/cover`
              : gradientFromAddr(wallet.address),
            color: '#052e2b',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)',
          }}
        >
          {!profile.avatarUrl && (wallet.address ?? 'HX').slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-white">
            {wallet.connected ? shortAddr(wallet.address ?? '') : 'Not connected'}
          </div>
          <div className="mt-0.5 truncate text-[11.5px] tabular-nums text-white/52">
            {wallet.connected
              ? balance !== null
                ? `${balance.toFixed(3)} SOL`
                : '— SOL'
              : 'Connect wallet'}
          </div>
        </div>
        {wallet.connected ? (
          <button
            type="button"
            onClick={() => wallet.logout()}
            className="grid place-items-center text-white/52 transition-colors hover:text-white"
            aria-label="Disconnect"
          >
            <ChevronDown size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => wallet.login()}
            className="rounded-md border border-white/20 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-white/10"
          >
            Connect
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="relative z-[1] flex items-center gap-[22px] border-b border-white/10 pb-3">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'relative cursor-pointer border-0 bg-transparent px-0 pb-[4px] pt-1 text-[13.5px] font-semibold tracking-[0.02em] transition-colors duration-150',
                active ? 'text-white' : 'text-white/52 hover:text-white/80',
              )}
            >
              {t.label}
              {active && (
                <span
                  className="absolute bottom-[-13px] left-0 right-0 h-[2px] rounded-[2px]"
                  style={{
                    background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
                    boxShadow: '0 0 10px rgba(94, 234, 212, 0.6)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      {tab === 'selection' && (
        count === 1 && claimedTiles.has(items[0]!.h3) ? (
          <ClaimedHexView
            tile={claimedTiles.get(items[0]!.h3)!}
            item={items[0]!}
            location={locations.get(items[0]!.h3) ?? null}
            onClear={() => onRemoveHex(items[0]!.h3)}
          />
        ) : (
          <SelectionBody
            count={count}
            items={items}
            perItemSol={perItemSol}
            locations={locations}
            claimedTiles={claimedTiles}
            onRemove={onRemoveHex}
            onClaim={onClaim}
            onSelectClosest={onSelectClosest}
            walletConnected={wallet.connected}
          />
        )
      )}
      </div>
    </aside>
  );
}

type Item = { h3: string; lat: number; lng: number; tier: 1 | 2 | 3 };

function SelectionBody({
  count,
  items,
  perItemSol,
  locations,
  claimedTiles,
  onRemove,
  onClaim,
  onSelectClosest,
  walletConnected,
}: {
  count: number;
  items: ReadonlyArray<Item>;
  perItemSol: ReadonlyArray<number>;
  locations: ReturnType<typeof useHexLocations>;
  claimedTiles: Map<string, ClaimedTile>;
  onRemove: (h3: string) => void;
  onClaim: () => void;
  onSelectClosest: (n: number) => void;
  walletConnected: boolean;
}) {
  const empty = count === 0;
  const max = count > 1000;
  const claimedCount = items.reduce((s, it) => (claimedTiles.has(it.h3) ? s + 1 : s), 0);
  const claimableCount = count - claimedCount;
  const claimableTotalSol = items.reduce(
    (s, it, i) => (claimedTiles.has(it.h3) ? s : s + perItemSol[i]),
    0,
  );
  const allClaimed = !empty && claimableCount === 0;

  return (
    <>
      <div className="relative z-[1] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-white/52">
            Selected
          </span>
          <span className="text-xs tabular-nums tracking-[0.04em] text-white/52">
            {count} / 1000
          </span>
        </div>

        {!empty && <HexPricingCard h3={items[0]?.h3 ?? null} />}

        {count === 1 && !claimedTiles.has(items[0]!.h3) && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/52">
              Mark closest
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 100, 500, 1000].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onSelectClosest(n)}
                  className="glass rounded-md py-1.5 text-[12px] font-semibold tabular-nums text-white transition-colors hover:bg-white/10"
                  style={{ border: '1px solid rgba(255,255,255,0.18)' }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {empty ? (
          <p className="text-[13.5px] leading-[1.45] text-white/72">
            Click a hex to select. Shift-click to add more. Ctrl-drag for an area.
          </p>
        ) : (
          <>
            {claimedCount > 0 && (
              <div className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-2 text-[11.5px] leading-relaxed text-amber-100">
                {claimedCount} of {count} already claimed — those can&apos;t be bought.
              </div>
            )}
            <div className="-mx-1 flex max-h-[280px] flex-col overflow-y-auto">
              {items.map((it, i) => {
                const loc = locations.get(it.h3);
                const title = loc?.neighborhood ?? loc?.place ?? loc?.countryName ?? 'Locating…';
                const isClaimed = claimedTiles.has(it.h3);
                return (
                  <div
                    key={it.h3}
                    className={cn(
                      'group flex items-center justify-between rounded-md px-1 py-2 transition-colors hover:bg-white/[0.04]',
                      isClaimed && 'opacity-60',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Flag code={loc?.countryCode} size={16} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-medium leading-tight text-white">
                          {title}
                        </span>
                        <span className="mt-0.5 truncate text-[10.5px] leading-tight tabular-nums text-white/52">
                          {Math.abs(it.lat).toFixed(3)}°{it.lat >= 0 ? 'N' : 'S'},{' '}
                          {Math.abs(it.lng).toFixed(3)}°{it.lng >= 0 ? 'E' : 'W'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider"
                        style={{ background: 'rgba(94, 234, 212, 0.16)', color: 'var(--brand)' }}
                      >
                        T{it.tier}
                      </span>
                      {isClaimed ? (
                        <span className="text-[11px] font-medium uppercase tracking-wider text-amber-200">
                          Claimed
                        </span>
                      ) : (
                        <span className="text-[12.5px] font-medium tabular-nums text-white">
                          {perItemSol[i].toFixed(2)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(it.h3);
                        }}
                        className="text-white/52 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="relative z-[1] flex-1" />

      <button
        type="button"
        onClick={empty || max || allClaimed || !walletConnected ? undefined : onClaim}
        disabled={empty || max || allClaimed || !walletConnected}
        className="glass glass--cta relative z-[1] flex h-[52px] items-center justify-center rounded-[14px] text-[14px] font-bold tracking-[0.04em] transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        style={{
          border: '1px solid rgba(255,255,255,0.24)',
          color: '#042f2e',
          textShadow: '0 1px 0 rgba(255,255,255,0.25)',
        }}
      >
        {empty
          ? 'Select at least one hex'
          : max
            ? 'Max 1000 per claim'
            : allClaimed
              ? 'All selected are already claimed'
              : !walletConnected
                ? 'Connect wallet to claim'
                : `Claim ${claimableCount} ${claimableCount === 1 ? 'hex' : 'hexes'} · ${claimableTotalSol.toFixed(3)} SOL`}
      </button>
    </>
  );
}

/** Detail view shown when a single already-claimed hex is selected. */
function ClaimedHexView({
  tile,
  item,
  location,
  onClear,
}: {
  tile: ClaimedTile;
  item: Item;
  location: HexLocation | null;
  onClear: () => void;
}) {
  const title = location?.neighborhood ?? location?.place ?? location?.countryName ?? 'This hex';
  const paidSol = Number(tile.pricePaid) / LAMPORTS_PER_SOL;
  const ageMs = Date.now() - tile.claimedAt * 1000;
  const ago = formatAgo(ageMs);
  const ownerShort = shortAddr(tile.owner);

  return (
    <>
      <div className="relative z-[1] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-amber-200">
            Already claimed
          </span>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md p-1 text-white/52 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        </div>

        <div
          className="flex flex-col gap-3 rounded-[14px] border border-amber-400/30 bg-amber-400/10 p-3.5"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }}
        >
          <div className="flex items-start gap-2.5">
            <Flag code={location?.countryCode} size={18} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold leading-tight text-white">
                {title}
              </div>
              <div className="mt-0.5 truncate text-[11px] leading-tight tabular-nums text-white/60">
                {Math.abs(item.lat).toFixed(3)}°{item.lat >= 0 ? 'N' : 'S'},{' '}
                {Math.abs(item.lng).toFixed(3)}°{item.lng >= 0 ? 'E' : 'W'}
              </div>
            </div>
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider"
              style={{ background: 'rgba(94, 234, 212, 0.16)', color: 'var(--brand)' }}
            >
              T{tile.tier}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-white/15 pt-3 text-[11px]">
            <div>
              <div className="uppercase tracking-wider text-white/52">Owner</div>
              <Link
                href={`/u/${encodeURIComponent(tile.owner)}`}
                className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-white transition-colors hover:text-amber-200"
              >
                <span className="font-mono">{ownerShort}</span>
                <ExternalLink size={11} />
              </Link>
            </div>
            <div>
              <div className="uppercase tracking-wider text-white/52">Claimed</div>
              <div className="mt-0.5 text-[12.5px] font-medium text-white">{ago}</div>
            </div>
            <div>
              <div className="uppercase tracking-wider text-white/52">Paid</div>
              <div className="mt-0.5 text-[12.5px] font-medium tabular-nums text-white">
                {paidSol.toFixed(3)} SOL
              </div>
            </div>
            <div>
              <div className="uppercase tracking-wider text-white/52">Status</div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-emerald-300">
                <CheckCircle2 size={12} />
                Owned
              </div>
            </div>
          </div>
        </div>

        <p className="text-[12.5px] leading-relaxed text-white/60">
          This hex isn&apos;t available to claim. Visit the owner&apos;s profile
          to see their other properties — if they list it for sale, it&apos;ll
          appear on the marketplace.
        </p>
      </div>

      <div className="relative z-[1] flex-1" />

      <div className="relative z-[1] grid grid-cols-2 gap-2">
        <Link
          href={`/h/${encodeURIComponent(item.h3)}`}
          className="glass flex h-[52px] items-center justify-center rounded-[14px] text-[13.5px] font-semibold tracking-[0.02em] text-white transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0"
          style={{ border: '1px solid rgba(255,255,255,0.24)' }}
        >
          Hex details
        </Link>
        <Link
          href={`/u/${encodeURIComponent(tile.owner)}`}
          className="glass flex h-[52px] items-center justify-center rounded-[14px] text-[13.5px] font-semibold tracking-[0.02em] text-white transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0"
          style={{ border: '1px solid rgba(255,255,255,0.24)' }}
        >
          Owner
        </Link>
      </div>
    </>
  );
}

function formatAgo(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
