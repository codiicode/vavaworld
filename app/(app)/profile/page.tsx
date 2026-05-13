'use client';

import { useCallback, useMemo, useState } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IdentityCard } from '@/components/profile/identity-card';
import { TilesTab } from '@/components/profile/tiles-tab';
import { ActivityTab } from '@/components/profile/activity-tab';
import { useActiveWallet } from '@/lib/active-wallet';
import { useUserTiles } from '@/lib/use-user-tiles';
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { TIER_FILL } from '@/lib/tier';
import { ProfileVersionProvider } from '@/lib/use-user-profile';

const tierName = (t: 1 | 2 | 3) => (t === 1 ? 'City' : t === 2 ? 'Suburb' : 'Remote');

function shortAddr(addr: string | null): string {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * /profile — glass-themed portfolio surface.
 *
 *   1. Hero (eyebrow + "Your portfolio")
 *   2. IdentityCard (glass-styled avatar + wallet + edit/export)
 *   3. 4-cell glass stats panel (Wallet / Balance / Hexes / Spent)
 *   4. Tier breakdown chips
 *   5. Hex grid (TilesTab — glass-styled card containers)
 *   6. Activity section (inline glass placeholder; no tabs anymore)
 */
export default function ProfilePage() {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const wallet = useActiveWallet();
  const { tiles } = useUserTiles();
  const { balance } = useWalletBalance(wallet.publicKey);

  const totalSpent = useMemo(
    () =>
      tiles?.reduce((s, t) => s + Number(t.pricePaid) / LAMPORTS_PER_SOL, 0) ?? null,
    [tiles],
  );
  const tierCounts = useMemo(() => {
    const c: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
    tiles?.forEach((t) => {
      c[t.tier] += 1;
    });
    return c;
  }, [tiles]);

  return (
    <ProfileVersionProvider value={version}>
      <TooltipProvider delayDuration={200}>
        <div className="mx-auto max-w-[1400px] space-y-10 px-8 py-12">
          {/* Hero */}
          <section className="flex flex-col gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/52">
              Profile
            </span>
            <h1 className="text-[clamp(40px,5vw,64px)] font-semibold leading-[1.05] tracking-tight text-white">
              Your{' '}
              <span
                className="italic"
                style={{
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  color: 'var(--brand)',
                }}
              >
                portfolio
              </span>
            </h1>
          </section>

          {/* Identity panel */}
          <IdentityCard onSavedBumpVersion={bump} />

          {/* Stats panel */}
          <section className="glass glass-panel relative overflow-hidden rounded-[22px]">
            <div className="relative z-[1] grid grid-cols-2 md:grid-cols-4">
              <Stat
                label="Wallet"
                value={shortAddr(wallet.address)}
                mono
                isLastCol={false}
                isLastRow
              />
              <Stat
                label="Balance"
                value={balance !== null ? balance.toFixed(4) : '—'}
                unit="SOL"
                isLastCol
                isLastRow
              />
              <Stat
                label="Hexes"
                value={tiles ? String(tiles.length) : '—'}
                isLastCol={false}
                isLastRow
              />
              <Stat
                label="Total spent"
                value={totalSpent !== null ? totalSpent.toFixed(4) : '—'}
                unit="SOL"
                isLastCol
                isLastRow
              />
            </div>
          </section>

          {/* Tier breakdown */}
          {tiles && tiles.length > 0 && (
            <section className="flex flex-wrap gap-3">
              {([1, 2, 3] as const).map((t) => (
                <TierChip key={t} tier={t} count={tierCounts[t]} />
              ))}
            </section>
          )}

          {/* Hex grid */}
          <TilesTab />

          {/* Activity (inline placeholder) */}
          <section className="space-y-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/52">
              Activity
            </h2>
            <ActivityTab />
          </section>
        </div>
      </TooltipProvider>
    </ProfileVersionProvider>
  );
}

function Stat({
  label,
  value,
  unit,
  mono,
  isLastCol,
  isLastRow,
}: {
  label: string;
  value: string;
  unit?: string;
  mono?: boolean;
  isLastCol: boolean;
  isLastRow: boolean;
}) {
  // Hairline cell separators with no double-borders at the outer edges
  const cellBorder = [
    'border-white/10',
    !isLastCol && 'md:border-r',
    !isLastRow && 'border-b md:border-b-0',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`relative z-[1] p-6 ${cellBorder}`}>
      <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-white/52">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={
            mono
              ? 'font-mono text-base text-white tabular-nums'
              : 'text-3xl font-semibold text-white tabular-nums leading-none'
          }
        >
          {value}
        </span>
        {unit && (
          <span className="text-[11px] uppercase tracking-[0.12em] text-white/52">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function TierChip({ tier, count }: { tier: 1 | 2 | 3; count: number }) {
  return (
    <div
      className="relative inline-flex items-center gap-2.5 rounded-full border border-white/10 px-4 py-2 text-xs"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: TIER_FILL[tier], boxShadow: `0 0 8px ${TIER_FILL[tier]}` }}
      />
      <span className="font-medium tabular-nums text-white">{count}</span>
      <span className="text-white/30">·</span>
      <span className="text-[11px] uppercase tracking-[0.12em] text-white/60">
        {tierName(tier)}
      </span>
    </div>
  );
}
