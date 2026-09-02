'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react';
import { useActiveWallet } from '@/lib/active-wallet';
import { useHexLocations, type HexLocation } from '@/lib/use-hex-locations';
import { useTiles } from '@/lib/use-tiles';
import { refreshClaimedRegistry, useClaimedRegistry } from '@/lib/use-claimed-registry';
import { removePropertyImage, uploadPropertyImage } from '@/lib/property-image';
import { useCountryCounts } from '@/lib/use-country-counts';
import { hexCenter } from '@/lib/h3-utils';
import { classifyTier } from '@/lib/tier';
import { PRICING } from '@/lib/pricing';
import { useUsdFmt } from '@/lib/usd';
import { useActiveListings, useListingsVersion } from '@/lib/supabase-listings';
import { BidDialog } from '@/components/bid-dialog';
import { Flag } from '@/components/flag';
import { HexPricingCard } from '@/components/map/hex-pricing-card';
import { cn } from '@/lib/utils';

function shortAddr(addr: string): string {
  if (!addr) return '-';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}


/**
 * Right rail on /map. 320px glass panel pinned to the right gutter, full height
 * inside the 18px outer gap.
 *
 * Empty Selection state matches the design verbatim (hint paragraph + disabled
 * "Select at least one hex" CTA). When ≥1 hex is selected we swap to a scrollable
 * list + "Claim N hexes · X.XX SOL" CTA.
 */
export function GlassRightPanel({
  selectedHexes,
  seedHex,
  onRemoveHex,
  onClearAll,
  onClaim,
  onSelectClosest,
}: {
  selectedHexes: Set<string>;
  seedHex: string | null;
  onRemoveHex: (h3: string) => void;
  onClearAll: () => void;
  onClaim: () => void;
  onSelectClosest: (n: number) => void;
}) {
  // Mobile-only: the sheet starts COLLAPSED so the map stays tappable behind
  // it (otherwise selecting one hex would block tapping more). Tap the bar
  // header to expand. Desktop ignores this and is always fully visible.
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const wallet = useActiveWallet();
  const locations = useHexLocations(selectedHexes);

  // Which selected hexes are already claimed? Union of the on-chain PDA
  // fetch and the off-chain Supabase ledger (primary claims settle there
  // today - checking only the chain misses them completely).
  const selectedArr = useMemo(() => Array.from(selectedHexes), [selectedHexes]);
  const { tiles: claimedCache } = useTiles(selectedArr);
  const registry = useClaimedRegistry();
  const usdFmt = useUsdFmt();
  // Live asks, so an owned hex that is up for sale says so on its card.
  const { listings } = useActiveListings(useListingsVersion());
  const askByH3 = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of listings) m.set(l.h3_id, usdFmt(l.price_sol));
    return m;
  }, [listings, usdFmt]);
  const claimedTiles = useMemo(() => {
    const m = new Map<string, ClaimedView>();
    for (const h of selectedArr) {
      const t = claimedCache.get(h);
      if (t) {
        m.set(h, {
          owner: t.owner,
          username: null,
          paidLabel: registry.get(h)?.priceUsd != null ? `$${registry.get(h)!.priceUsd.toFixed(2)}` : ' - ',
          claimedAtMs: t.claimedAt * 1000,
          imageUrl: registry.get(h)?.imageUrl ?? null,
          askLabel: askByH3.get(h) ?? null,
        });
        continue;
      }
      const r = registry.get(h);
      if (r) {
        m.set(h, {
          owner: r.owner,
          username: r.username,
          paidLabel: `$${r.priceUsd.toFixed(4)}`,
          claimedAtMs: r.claimedAt,
          imageUrl: r.imageUrl,
          askLabel: askByH3.get(h) ?? null,
        });
      }
    }
    return m;
  }, [selectedArr, claimedCache, registry, askByH3]);

  const items = Array.from(selectedHexes).map((h3) => {
    const c = hexCenter(h3);
    return { h3, lat: c.lat, lng: c.lng, tier: classifyTier(c.lat, c.lng) };
  });

  // USD-spec pricing curve walk per country: floor(n) = 0.10 + n × 0.00001.
  // Each hex in the same country pays the next floor after the previous one
  // in the batch - so 3 hexes in Germany at count=1 pay 0.10001, 0.10002,
  // 0.10003. SOL settlement is derived purely for display via SOL_USD.
  const isos = items
    .map((it) => locations.get(it.h3)?.countryCode)
    .filter((iso): iso is string => Boolean(iso));
  const countryCounts = useCountryCounts(isos);
  const localOffset: Record<string, number> = {};
  const perItemUsd = items.map((it) => {
    const iso = locations.get(it.h3)?.countryCode ?? 'INTL';
    const base = countryCounts.get(iso) ?? 0;
    const off = localOffset[iso] ?? 0;
    localOffset[iso] = off + 1;
    return PRICING.BASE_FLOOR_USD + (base + off) * PRICING.SLOPE_PER_CLAIM_USD;
  });

  const count = items.length;

  // Quick mobile-summary totals so the collapsed bar can show price preview
  // without rendering the full list.
  const claimedCountMobile = items.reduce(
    (s, it) => (claimedTiles.has(it.h3) ? s + 1 : s),
    0,
  );
  const claimableCountMobile = count - claimedCountMobile;
  const claimableTotalUsdMobile = items.reduce(
    (s, it, i) => (claimedTiles.has(it.h3) ? s : s + perItemUsd[i]),
    0,
  );

  return (
    <aside
      className={cn(
        'glass glass-panel fixed z-30 flex flex-col',
        // Desktop: pinned right rail. overflow-hidden + flex-1/min-h-0 on the
        // inner wrapper means the long hex list scrolls inside the panel,
        // never pushing the Claim button below the viewport.
        'md:inset-x-auto md:bottom-[18px] md:right-[18px] md:top-[76px] md:max-h-none md:w-[320px] md:overflow-hidden md:rounded-[22px] md:px-5 md:pb-[22px] md:pt-5',
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
          <div className="flex items-center gap-2">
            {count > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                aria-label="Clear all"
                className="grid h-10 w-10 flex-none place-items-center rounded-full text-white transition-colors"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-white">
                {count === 0
                  ? 'Tap a hex to select'
                  : claimableCountMobile === 0
                    ? `${count} selected · already owned`
                    : `${count} selected · $${claimableTotalUsdMobile.toFixed(claimableTotalUsdMobile < 10 ? 4 : 2)}`}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-white/55">
                {count === 0 ? 'Map is fully interactive' : 'Tap to expand'}
              </div>
            </div>
            {count > 0 && (
              <button
                type="button"
                onClick={onClaim}
                disabled={!wallet.connected || claimableCountMobile === 0}
                className="glass glass--cta flex h-10 items-center justify-center rounded-full px-4 text-[13px] font-bold tracking-[0.04em] disabled:opacity-50"
                style={{ border: '1px solid rgba(255,255,255,0.30)' }}
              >
                Claim
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileExpanded(true)}
              aria-label="Expand"
              className="grid h-10 w-10 flex-none place-items-center rounded-full text-white/70"
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

      {/* Full panel content - hidden when mobile-collapsed, always visible on desktop. */}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          mobileExpanded ? 'flex' : 'hidden md:flex',
        )}
        style={{ gap: 14 }}
      >
      {/* Panel header. The wallet now lives in the dock's top-right pill, so
          this is a titled header instead - it names the panel and carries the
          live count, which is what the user actually tracks while selecting. */}
      <div className="relative z-[1] flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold leading-tight tracking-[-0.01em] text-white">
            Buy land
          </span>
          <span className="mt-[3px] truncate text-[11.5px] leading-tight text-white/50">
            {count === 0
              ? 'Pick hexes on the map'
              : `${count.toLocaleString('en-US')} hex${count === 1 ? '' : 'es'} selected`}
          </span>
        </div>
        <span
          className="grid h-[30px] min-w-[30px] flex-none place-items-center rounded-[10px] px-2 text-[13px] font-bold tabular-nums text-white"
          style={{
            background: count > 0 ? 'rgba(125,180,245,0.18)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${count > 0 ? 'rgba(125,180,245,0.42)' : 'rgba(255,255,255,0.10)'}`,
          }}
        >
          {count}
        </span>
      </div>

      {/* Body */}
      {(
        count === 1 && claimedTiles.has(items[0]!.h3) ? (
          <ClaimedHexView
            info={claimedTiles.get(items[0]!.h3)!}
            item={items[0]!}
            location={locations.get(items[0]!.h3) ?? null}
            onClear={() => onRemoveHex(items[0]!.h3)}
          />
        ) : (
          <SelectionBody
            count={count}
            items={items}
            perItemUsd={perItemUsd}
            locations={locations}
            claimedTiles={claimedTiles}
            hasSeed={seedHex !== null}
            onRemove={onRemoveHex}
            onClearAll={onClearAll}
            onClaim={onClaim}
            onSelectClosest={onSelectClosest}
            walletConnected={wallet.connected}
            onConnect={() => wallet.login()}
          />
        )
      )}
      </div>
    </aside>
  );
}

type Item = { h3: string; lat: number; lng: number; tier: 1 | 2 | 3 };

/** Claimed-hex display info, source-agnostic (on-chain SOL or off-chain USD). */
type ClaimedView = {
  owner: string;
  username: string | null;
  paidLabel: string;
  claimedAtMs: number;
  imageUrl: string | null;
  /** Formatted asking price when the hex is listed, else null. */
  askLabel: string | null;
};

function SelectionBody({
  count,
  items,
  perItemUsd,
  locations,
  claimedTiles,
  hasSeed,
  onConnect,
  onRemove,
  onClearAll,
  onClaim,
  onSelectClosest,
  walletConnected,
}: {
  count: number;
  items: ReadonlyArray<Item>;
  perItemUsd: ReadonlyArray<number>;
  locations: ReturnType<typeof useHexLocations>;
  claimedTiles: Map<string, ClaimedView>;
  hasSeed: boolean;
  onConnect: () => void;
  onRemove: (h3: string) => void;
  onClearAll: () => void;
  onClaim: () => void;
  onSelectClosest: (n: number) => void;
  walletConnected: boolean;
}) {
  const [customN, setCustomN] = useState('');
  const customParsed = Number.parseInt(customN, 10);
  const customValid =
    Number.isFinite(customParsed) && customParsed >= 2 && customParsed <= 1000;
  const applyCustom = () => {
    if (customValid) onSelectClosest(customParsed);
  };
  const empty = count === 0;
  const max = count > 1000;
  const claimedCount = items.reduce((s, it) => (claimedTiles.has(it.h3) ? s + 1 : s), 0);
  const claimableCount = count - claimedCount;
  const claimableTotalUsd = items.reduce(
    (s, it, i) => (claimedTiles.has(it.h3) ? s : s + perItemUsd[i]),
    0,
  );
  const allClaimed = !empty && claimableCount === 0;

  // For big selections (>20) the per-row list is meaningless - every hex is
  // a few metres apart with the same country, same coords to 3 dp. Show a
  // compact country breakdown instead so the Claim button stays visible.
  const compact = count > 20;
  const groups = compact
    ? Array.from(
        items.reduce(
          (m, it, i) => {
            const loc = locations.get(it.h3);
            const iso = loc?.countryCode ?? 'INTL';
            const name = loc?.countryName ?? loc?.place ?? iso;
            const ex = m.get(iso) ?? { iso, name, count: 0, claimed: 0, totalUsd: 0 };
            ex.count += 1;
            if (claimedTiles.has(it.h3)) ex.claimed += 1;
            else ex.totalUsd += perItemUsd[i];
            m.set(iso, ex);
            return m;
          },
          new Map<
            string,
            { iso: string; name: string; count: number; claimed: number; totalUsd: number }
          >(),
        ).values(),
      )
    : [];

  return (
    <>
      {/* min-h-0 + overflow-y-auto: with the pricing card, mark-closest grid
          and the hex list stacked, the column can exceed the panel height -
          without this the panel's overflow-hidden silently clips the Claim
          CTA below. The content scrolls; the CTA stays pinned. */}
      <div className="relative z-[1] flex min-h-0 flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-white/55">
            Selected
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums tracking-[0.04em] text-white/55">
              {count} / 1000
            </span>
            {!empty && (
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.11)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
              >
                <X size={12} strokeWidth={2.5} />
                Clear
              </button>
            )}
          </div>
        </div>

        {!empty && <HexPricingCard h3={items[0]?.h3 ?? null} />}

        {hasSeed && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/55">
              Mark closest
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[10, 100, 500, 1000].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onSelectClosest(n)}
                  className={cn(
                    'glass rounded-md py-1.5 text-[12px] font-semibold tabular-nums text-white transition-colors hover:bg-white/10',
                    count === n && 'ring-1 ring-white/40',
                  )}
                  style={{ border: '1px solid rgba(255,255,255,0.18)' }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                placeholder="Custom 2-1000"
                value={customN}
                onChange={(e) => setCustomN(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyCustom();
                  }
                }}
                className="glass min-w-0 flex-1 rounded-md bg-transparent px-2.5 py-1.5 text-[12px] tabular-nums text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/40"
                style={{ border: '1px solid rgba(255,255,255,0.18)' }}
              />
              <button
                type="button"
                disabled={!customValid}
                onClick={applyCustom}
                className="glass rounded-md px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ border: '1px solid rgba(255,255,255,0.18)' }}
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {empty ? (
          <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
            <div
              className="grid h-12 w-12 place-items-center rounded-[15px]"
              style={{
                background: 'rgba(125,180,245,0.12)',
                border: '1px solid rgba(125,180,245,0.28)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Z"
                  stroke="var(--brand)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-[13.5px] font-semibold leading-tight text-white">
              No hexes selected
            </p>
            <p className="text-[12px] leading-[1.5] text-white/55">
              Click a hex to select it. Shift-click to add more,
              <br />
              or Ctrl-drag to sweep an area.
            </p>
          </div>
        ) : (
          <>
            {claimedCount > 0 && (
              <div className="rounded-md border border-white/12 bg-white/[0.07] px-2.5 py-2 text-[11.5px] leading-relaxed text-white/85">
                {claimedCount} of {count} already claimed - those can&apos;t be bought.
              </div>
            )}
            {compact ? (
              <div className="-mx-1 flex flex-col gap-1.5">
                {groups.map((g) => (
                  <div
                    key={g.iso}
                    className="flex items-center justify-between rounded-md bg-white/[0.04] px-2.5 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Flag code={g.iso} size={18} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-semibold leading-tight text-white">
                          {g.name}
                        </span>
                        <span className="mt-0.5 text-[11px] leading-tight tabular-nums text-white/55">
                          {g.count.toLocaleString('en-US')} hex
                          {g.count === 1 ? '' : 'es'}
                          {g.claimed > 0 && ` · ${g.claimed} already claimed`}
                        </span>
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[13.5px] font-semibold tabular-nums text-white">
                      ${g.totalUsd.toFixed(g.totalUsd < 10 ? 4 : 2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="-mx-1 flex flex-col">
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
                          <span className="mt-0.5 truncate text-[10.5px] leading-tight tabular-nums text-white/55">
                            {Math.abs(it.lat).toFixed(3)}°{it.lat >= 0 ? 'N' : 'S'},{' '}
                            {Math.abs(it.lng).toFixed(3)}°{it.lng >= 0 ? 'E' : 'W'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider tabular-nums"
                          style={{ background: 'rgba(125, 180, 245, 0.16)', color: 'var(--brand)' }}
                        >
                          T{it.tier}
                        </span>
                        {isClaimed ? (
                          <span className="text-[11px] font-medium uppercase tracking-wider text-white/85">
                            Claimed
                          </span>
                        ) : (
                          <span className="text-[12.5px] font-medium tabular-nums text-white">
                            ${perItemUsd[i].toFixed(4)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(it.h3);
                          }}
                          className="text-white/55 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="relative z-[1] flex-1" />

      {/* Order summary. The total used to live only inside the CTA label,
          where it wrapped and was easy to miss; a checkout-style summary
          makes the amount the user is about to spend unmissable. */}
      {!empty && !allClaimed && (
        <div
          className="relative z-[1] flex flex-col gap-1.5 rounded-[14px] px-3.5 py-3"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12px] text-white/55">
              {claimableCount.toLocaleString('en-US')} hex{claimableCount === 1 ? '' : 'es'}
            </span>
            <span className="text-[12px] tabular-nums text-white/55">
              ${claimableCount > 0 ? (claimableTotalUsd / claimableCount).toFixed(4) : '0.0000'} ea
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12.5px] font-semibold text-white/80">Total</span>
            <span className="text-[19px] font-bold leading-none tabular-nums tracking-[-0.02em] text-white">
              ${claimableTotalUsd.toFixed(claimableTotalUsd < 10 ? 4 : 2)}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={
          empty || max || allClaimed ? undefined : walletConnected ? onClaim : onConnect
        }
        disabled={empty || max || allClaimed}
        className="glass glass--cta relative z-[1] flex h-[52px] items-center justify-center rounded-[14px] text-[14px] font-bold tracking-[0.04em] transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:saturate-50 disabled:hover:translate-y-0"
        style={{ border: '1px solid rgba(255,255,255,0.30)' }}
      >
        {empty
          ? 'Select at least one hex'
          : max
            ? 'Max 1000 per claim'
            : allClaimed
              ? 'All selected are already claimed'
              : !walletConnected
                ? 'Log in to claim'
                : `Claim ${claimableCount} ${claimableCount === 1 ? 'hex' : 'hexes'}`}
      </button>
    </>
  );
}

/** Detail view shown when a single already-claimed hex is selected. */
function ClaimedHexView({
  info,
  item,
  location,
  onClear,
}: {
  info: ClaimedView;
  item: Item;
  location: HexLocation | null;
  onClear: () => void;
}) {
  const title = location?.neighborhood ?? location?.place ?? location?.countryName ?? 'This hex';
  const ago = formatAgo(Date.now() - info.claimedAtMs);
  const ownerLabel = info.username ? `@${info.username}` : shortAddr(info.owner);
  const ownerHandle = info.username ?? info.owner;
  const wallet = useActiveWallet();
  const [bidOpen, setBidOpen] = useState(false);
  // EVM addresses mix checksummed and lowercase forms depending on the
  // source (wallet vs registry vs env) - every comparison must fold case.
  const me = wallet.address?.toLowerCase();
  const canBid = wallet.connected && me !== info.owner.toLowerCase();
  const isOwn = wallet.connected && me === info.owner.toLowerCase();
  const isAdmin =
    wallet.connected &&
    !!me &&
    (process.env.NEXT_PUBLIC_ADMIN_WALLETS ?? '')
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .includes(me);

  // The property = every hex the owner claimed in the same transaction
  // (same claimed-at second, matching the tile-groups convention). One
  // image is set for all of them at once.
  const registry = useClaimedRegistry();
  const propertyH3s = useMemo(() => {
    if (!isOwn && !isAdmin) return [item.h3];
    // Same claim TX = same property (fallback: the old 2s window for rows
    // that somehow lack a hash).
    const myTx = registry.get(item.h3)?.tx ?? null;
    const sameProperty = (v: { owner: string; claimedAt: number; tx: string | null }) =>
      v.owner === info.owner &&
      (myTx && myTx.startsWith('0x')
        ? v.tx === myTx
        : Math.abs(v.claimedAt - info.claimedAtMs) < 2000);
    const out: string[] = [];
    for (const [h3, v] of registry) {
      if (sameProperty(v)) out.push(h3);
    }
    return out.length > 0 ? out : [item.h3];
  }, [isOwn, isAdmin, registry, info.owner, info.claimedAtMs, item.h3]);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const onPickImage = async (file: File | null) => {
    if (!file || imgBusy) return;
    setImgBusy(true);
    try {
      await uploadPropertyImage(wallet, propertyH3s, file);
      refreshClaimedRegistry();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setImgBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const onRemoveImage = async () => {
    if (imgBusy) return;
    setImgBusy(true);
    try {
      await removePropertyImage(wallet, propertyH3s);
      refreshClaimedRegistry();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Remove failed');
    } finally {
      setImgBusy(false);
    }
  };

  return (
    <>
      <div className="relative z-[1] flex min-h-0 flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-white/85">
            Already claimed
          </span>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md p-1 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        </div>

        <div
          className="flex flex-col gap-3 rounded-[14px] border border-white/12 bg-white/[0.07] p-3.5"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }}
        >
          {info.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.imageUrl}
              alt="Property image"
              className="-mx-3.5 -mt-3.5 aspect-[16/9] w-[calc(100%+28px)] max-w-none rounded-t-[14px] object-cover"
              loading="lazy"
            />
          )}
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
              className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider tabular-nums"
              style={{ background: 'rgba(125, 180, 245, 0.16)', color: 'var(--brand)' }}
            >
              T{item.tier}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-white/15 pt-3 text-[11px]">
            <div>
              <div className="uppercase tracking-wider text-white/55">Owner</div>
              <Link
                href={`/u/${encodeURIComponent(ownerHandle)}`}
                className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-white transition-colors hover:text-white/85"
              >
                <span className={info.username ? '' : 'tabular-nums'}>{ownerLabel}</span>
                <ExternalLink size={11} />
              </Link>
            </div>
            <div>
              <div className="uppercase tracking-wider text-white/55">Claimed</div>
              <div className="mt-0.5 text-[12.5px] font-medium text-white">{ago}</div>
            </div>
            <div>
              <div className="uppercase tracking-wider text-white/55">Paid</div>
              <div className="mt-0.5 text-[12.5px] font-medium tabular-nums text-white">
                {info.paidLabel}
              </div>
            </div>
            <div>
              <div className="uppercase tracking-wider text-white/55">Status</div>
              {info.askLabel ? (
                <div className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-300">
                  For sale · {info.askLabel}
                </div>
              ) : (
                <div className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-white/70">
                  <CheckCircle2 size={12} />
                  Owned
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-[12.5px] leading-relaxed text-white/60">
          {canBid
            ? 'This hex is taken - but everything has a price. Make the owner an offer, listed or not.'
            : "This hex isn't available to claim. Visit the owner's profile to see their other properties - if they list it for sale, it'll appear on the marketplace."}
        </p>
      </div>

      <div className="relative z-[1] flex-1" />

      {canBid && (
        <button
          type="button"
          onClick={() => setBidOpen(true)}
          className="relative z-[1] mb-2 flex h-[52px] w-full items-center justify-center rounded-[14px] bg-white text-[14px] font-bold tracking-[0.02em] text-[#06080d] transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0"
        >
          Make an offer
        </button>
      )}

      {!isOwn && isAdmin && info.imageUrl && (
        <button
          type="button"
          disabled={imgBusy}
          onClick={onRemoveImage}
          className="relative z-[1] mb-2 text-[11.5px] font-medium uppercase tracking-[0.14em] text-red-300/70 transition-colors hover:text-red-300"
        >
          {imgBusy ? 'Removing…' : 'Remove image (moderation)'}
        </button>
      )}

      {isOwn && (
        <div className="relative z-[1] mb-2 flex flex-col gap-2">
          <button
            type="button"
            disabled={imgBusy}
            onClick={() => fileRef.current?.click()}
            className="flex h-[46px] w-full items-center justify-center rounded-[14px] bg-white text-[13.5px] font-bold tracking-[0.02em] text-[#06080d] transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0 disabled:opacity-60"
          >
            {imgBusy
              ? 'Uploading…'
              : info.imageUrl
                ? 'Change property image'
                : `Set property image${propertyH3s.length > 1 ? ` (${propertyH3s.length} hexes)` : ''}`}
          </button>
          {info.imageUrl && !imgBusy && (
            <button
              type="button"
              onClick={onRemoveImage}
              className="text-[11.5px] font-medium uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-white/80"
            >
              Remove image
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      <div className="relative z-[1] grid grid-cols-2 gap-2">
        <Link
          href={`/h/${encodeURIComponent(item.h3)}`}
          className="glass flex h-[52px] items-center justify-center rounded-[14px] text-[13.5px] font-semibold tracking-[0.02em] text-white transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0"
          style={{ border: '1px solid rgba(255,255,255,0.24)' }}
        >
          Hex details
        </Link>
        <Link
          href={`/u/${encodeURIComponent(ownerHandle)}`}
          className="glass flex h-[52px] items-center justify-center rounded-[14px] text-[13.5px] font-semibold tracking-[0.02em] text-white transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0"
          style={{ border: '1px solid rgba(255,255,255,0.24)' }}
        >
          Owner
        </Link>
      </div>

      <BidDialog
        h3={item.h3}
        placeLabel={title}
        countryCode={location?.countryCode}
        open={bidOpen}
        onOpenChange={setBidOpen}
      />
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
