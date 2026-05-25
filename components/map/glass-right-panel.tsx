'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useActiveWallet } from '@/lib/active-wallet';
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { useUserProfile } from '@/lib/use-user-profile';
import { useCounters } from '@/lib/use-counters';
import { useHexLocations } from '@/lib/use-hex-locations';
import { hexCenter } from '@/lib/h3-utils';
import { classifyTier } from '@/lib/tier';
import { quoteBatch, quoteOne } from '@/lib/quote';
import { Flag } from '@/components/flag';
import { HexPricingCard } from '@/components/map/hex-pricing-card';
import { cn } from '@/lib/utils';

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
}: {
  selectedHexes: Set<string>;
  onRemoveHex: (h3: string) => void;
  onClaim: () => void;
}) {
  const [tab, setTab] = useState<TabId>('selection');
  const wallet = useActiveWallet();
  const profile = useUserProfile();
  const { balance } = useWalletBalance(wallet.publicKey);
  const counters = useCounters();
  const locations = useHexLocations(selectedHexes);

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

  const totalSol = Number(quoteBatch(items, counters)) / LAMPORTS_PER_SOL;
  const count = items.length;

  return (
    <aside
      className="glass glass-panel fixed z-30 flex flex-col px-5 pb-[22px] pt-5 inset-x-0 bottom-0 max-h-[64vh] overflow-y-auto md:inset-x-auto md:bottom-[18px] md:right-[18px] md:top-[18px] md:max-h-none md:w-[320px] md:overflow-visible"
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
        <SelectionBody
          count={count}
          items={items}
          perItemSol={perItemSol}
          totalSol={totalSol}
          locations={locations}
          onRemove={onRemoveHex}
          onClaim={onClaim}
          walletConnected={wallet.connected}
        />
      )}

    </aside>
  );
}

type Item = { h3: string; lat: number; lng: number; tier: 1 | 2 | 3 };

function SelectionBody({
  count,
  items,
  perItemSol,
  totalSol,
  locations,
  onRemove,
  onClaim,
  walletConnected,
}: {
  count: number;
  items: ReadonlyArray<Item>;
  perItemSol: ReadonlyArray<number>;
  totalSol: number;
  locations: ReturnType<typeof useHexLocations>;
  onRemove: (h3: string) => void;
  onClaim: () => void;
  walletConnected: boolean;
}) {
  const empty = count === 0;
  const max = count > 1000;

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

        {empty ? (
          <p className="text-[13.5px] leading-[1.45] text-white/72">
            Click a hex to select. Shift-click to add more. Ctrl-drag for an area.
          </p>
        ) : (
          <div className="-mx-1 flex max-h-[280px] flex-col overflow-y-auto">
            {items.map((it, i) => {
              const loc = locations.get(it.h3);
              const title = loc?.neighborhood ?? loc?.place ?? loc?.countryName ?? 'Locating…';
              return (
                <div
                  key={it.h3}
                  className="group flex items-center justify-between rounded-md px-1 py-2 transition-colors hover:bg-white/[0.04]"
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
                    <span className="text-[12.5px] font-medium tabular-nums text-white">
                      {perItemSol[i].toFixed(2)}
                    </span>
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
        )}
      </div>

      <div className="relative z-[1] flex-1" />

      <button
        type="button"
        onClick={empty || max || !walletConnected ? undefined : onClaim}
        disabled={empty || max || !walletConnected}
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
            : !walletConnected
              ? 'Connect wallet to claim'
              : `Claim ${count} ${count === 1 ? 'hex' : 'hexes'} · ${totalSol.toFixed(3)} SOL`}
      </button>
    </>
  );
}
