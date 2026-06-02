'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  ArrowUpRight,
  BarChart3,
  Globe,
  Hexagon,
  Layers,
  Search,
  TrendingUp,
} from 'lucide-react';
import { Flag } from '@/components/flag';
import { useActiveWallet } from '@/lib/active-wallet';
import { useUserProfile } from '@/lib/use-user-profile';
import { SignInGate } from '@/components/auth/sign-in-gate';
import { useUserTiles } from '@/lib/use-user-tiles';
import { useHexLocations } from '@/lib/use-hex-locations';
import { useCounters } from '@/lib/use-counters';
import { quoteOne } from '@/lib/quote';
import { groupTilesByClaim } from '@/lib/tile-groups';
import { cn } from '@/lib/utils';
import type { ClaimedTile } from '@/types/tile';

const SOL_USD = 150;
const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tierName = (t: 1 | 2 | 3) =>
  t === 1 ? 'City' : t === 2 ? 'Suburb' : 'Remote';

function timeAgo(unixSec: number): string {
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
 * Portfolio dashboard. Built with the same shell (mx-auto max-w-7xl + glass
 * cards over sky-bg) and visual language as every other (app) page so there
 * is no jarring nuance shift when navigating in.
 */
export default function PortfolioPage() {
  const wallet = useActiveWallet();
  const profile = useUserProfile();
  const { tiles } = useUserTiles();
  const counters = useCounters();
  const hexSet = useMemo(() => new Set(tiles?.map((t) => t.h3) ?? []), [tiles]);
  const locations = useHexLocations(hexSet);

  const derived = useMemo(() => {
    const list: ClaimedTile[] = tiles ?? [];
    let spentLamports = 0n;
    let valueLamports = 0n;
    for (const t of list) {
      spentLamports += t.pricePaid;
      valueLamports += quoteOne(t.tier, counters[t.tier]);
    }
    const spent = Number(spentLamports) / LAMPORTS_PER_SOL;
    const value = Number(valueLamports) / LAMPORTS_PER_SOL;
    const retSol = value - spent;
    const roiPct = spent > 0 ? (retSol / spent) * 100 : 0;

    const now = Date.now() / 1000;
    const monthAgo = now - 30 * 86400;
    const claimedThisMonth = list.filter((t) => t.claimedAt >= monthAgo).length;

    const tileGroups = groupTilesByClaim(list, locations);

    const properties = tileGroups.slice(0, 6).map((g) => {
      const cur = g.tiles.reduce(
        (s, t) => s + Number(quoteOne(t.tier, counters[t.tier])),
        0,
      );
      const paid = g.tiles.reduce((s, t) => s + Number(t.pricePaid), 0);
      const roi = paid > 0 ? (cur - paid) / paid : 0;
      const isSingle = g.tiles.length === 1;
      return {
        key: g.key,
        name: isSingle ? g.neighborhood ?? g.citiesLabel ?? g.countryName ?? 'Locating…' : g.citiesLabel,
        code: g.countryCode,
        countryName: g.countryName,
        tier: tierName(g.representativeTier),
        count: g.tiles.length,
        paidUsd: (paid / LAMPORTS_PER_SOL) * SOL_USD,
        valueUsd: (cur / LAMPORTS_PER_SOL) * SOL_USD,
        roiPct: roi * 100,
        when: timeAgo(g.claimedAt),
        firstH3: g.tiles[0].h3,
      };
    });

    // Regions - group all individual hexes by country, % of portfolio.
    const byCountry = new Map<string, { count: number; code: string | null }>();
    for (const t of list) {
      const loc = locations.get(t.h3);
      const name = loc?.countryName ?? 'Unmapped';
      const prev = byCountry.get(name);
      byCountry.set(name, {
        count: (prev?.count ?? 0) + 1,
        code: loc?.countryCode ?? prev?.code ?? null,
      });
    }
    const total = list.length || 1;
    const regions = [...byCountry.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([name, { count, code }]) => ({
        name,
        code,
        count,
        pct: Math.round((count / total) * 100),
      }));

    const activity = tileGroups.slice(0, 5).map((g) => {
      const place = g.neighborhood ?? g.citiesLabel ?? g.countryName ?? 'a hex';
      return {
        key: g.key,
        place,
        count: g.tiles.length,
        amountUsd: g.totalSol * SOL_USD,
        when: timeAgo(g.claimedAt),
      };
    });

    return {
      spent,
      value,
      retSol,
      roiPct,
      count: list.length,
      claimedThisMonth,
      properties,
      regions,
      activity,
      propertyCount: tileGroups.length,
    };
  }, [tiles, counters, locations]);

  const displayName = profile.username
    ? `@${profile.username}`
    : wallet.address
      ? `${wallet.address.slice(0, 4)}…${wallet.address.slice(-4)}`
      : 'collector';

  return (
    <SignInGate label="portfolio">
    <div className="mx-auto max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] px-4 py-6 md:px-8 md:py-8 2xl:px-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            Portfolio
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Your hex holdings and value across VavaWorld
          </p>
        </div>
        <Link
          href="/map"
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/40 bg-white/30 px-4 py-2.5 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-white/40 md:self-auto"
        >
          <Search size={14} />
          Find more on the map
          <ArrowUpRight size={14} className="text-foreground/55" />
        </Link>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          icon={<BarChart3 size={16} strokeWidth={1.8} />}
          label="Total portfolio value"
          value={`$${fmtUsd(derived.value * SOL_USD)}`}
          delta={
            derived.spent > 0
              ? `${derived.roiPct >= 0 ? '+' : ''}${derived.roiPct.toFixed(1)}% vs spent`
              : 'No claims yet'
          }
          deltaPositive={derived.roiPct >= 0}
        />
        <KpiCard
          icon={<Hexagon size={16} strokeWidth={1.8} />}
          label="Hexes owned"
          value={derived.count.toLocaleString('en-US')}
          delta={`+${derived.claimedThisMonth} this month`}
        />
        <KpiCard
          icon={<Layers size={16} strokeWidth={1.8} />}
          label="Properties"
          value={derived.propertyCount.toLocaleString('en-US')}
          delta="One per transaction"
        />
      </div>

      {/* Two-column grid: Holdings (wide) + Regions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Holdings */}
        <section className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/30 px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Holdings
            </h2>
            <Link
              href="/profile"
              className="text-xs font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
            >
              View all →
            </Link>
          </div>

          {derived.properties.length === 0 ? (
            <EmptyState
              icon={<Hexagon size={22} strokeWidth={1.6} />}
              title="No hexes yet"
              body="Claim your first piece of the map and it'll appear here."
              cta={{ href: '/map', label: 'Claim a hex' }}
            />
          ) : (
            <ul className="divide-y divide-white/30">
              {derived.properties.map((p) => (
                <li key={p.key} className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Flag code={p.code} size={20} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {p.name}
                        </span>
                        {p.count > 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            <Layers size={10} strokeWidth={2} />
                            {p.count} hexes
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-foreground/55">
                        {p.tier}
                        {p.countryName ? ` · ${p.countryName}` : ''} · {p.when}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        ${fmtUsd(p.valueUsd)}
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 text-[11px] tabular-nums',
                          p.roiPct >= 0 ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        {p.roiPct >= 0 ? '+' : ''}
                        {p.roiPct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Regions */}
        <section className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md">
          <div className="border-b border-white/30 px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Top regions
            </h2>
          </div>
          {derived.regions.length === 0 ? (
            <EmptyState
              icon={<Globe size={22} strokeWidth={1.6} />}
              title="No regions yet"
              body="Claim hexes to see your country breakdown."
            />
          ) : (
            <ul className="divide-y divide-white/30">
              {derived.regions.map((r) => (
                <li key={r.name} className="flex items-center gap-3 px-5 py-3">
                  <Flag code={r.code} size={18} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {r.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-foreground/55">
                      {r.count} {r.count === 1 ? 'hex' : 'hexes'}
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {r.pct}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Total return + Activity */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-white/40 bg-white/30 px-5 py-5 backdrop-blur-md">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            Total return
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {derived.retSol < 0 ? '−' : ''}${fmtUsd(Math.abs(derived.retSol) * SOL_USD)}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                derived.roiPct >= 0
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700'
                  : 'border-red-500/30 bg-red-500/15 text-red-700',
              )}
            >
              <TrendingUp size={11} strokeWidth={2.2} />
              {derived.roiPct >= 0 ? '+' : ''}
              {derived.roiPct.toFixed(1)}%
            </span>
          </div>
          <p className="mt-2 text-xs text-foreground/55">
            vs. ${fmtUsd(derived.spent * SOL_USD)} spent
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md">
          <div className="border-b border-white/30 px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Recent activity
            </h2>
          </div>
          {derived.activity.length === 0 ? (
            <EmptyState
              icon={<TrendingUp size={22} strokeWidth={1.6} />}
              title="No activity yet"
              body="Your claims and trades will show up here."
            />
          ) : (
            <ul className="divide-y divide-white/30">
              {derived.activity.map((a) => (
                <li key={a.key} className="flex items-center justify-between px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700">
                      Claimed{a.count > 1 ? ` ×${a.count}` : ''}
                    </span>
                    <span className="truncate text-sm text-foreground">{a.place}</span>
                  </div>
                  <div className="ml-3 flex shrink-0 items-baseline gap-2">
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      ${fmtUsd(a.amountUsd)}
                    </span>
                    <span className="text-[11px] text-foreground/55">{a.when}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
    </SignInGate>
  );
}

function KpiCard({
  icon,
  label,
  value,
  delta,
  deltaPositive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  deltaPositive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/30 px-5 py-4 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
        <span className="text-foreground/60">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
      <div
        className={cn(
          'mt-1 text-xs tabular-nums',
          deltaPositive === undefined
            ? 'text-foreground/55'
            : deltaPositive
              ? 'text-emerald-600'
              : 'text-red-600',
        )}
      >
        {delta}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <span className="text-foreground/40">{icon}</span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-foreground/55">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-1 inline-flex h-9 items-center rounded-[10px] bg-primary/90 px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
