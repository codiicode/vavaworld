'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Coins, Crown, Globe, Hexagon, ShieldCheck, TrendingDown, TrendingUp, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flag } from '@/components/flag';
import { ShareProfile } from '@/components/profile/share-profile';
import type { MockUser } from '@/lib/mock-users';
import { hexCenter } from '@/lib/h3-utils';
import { classifyTier } from '@/lib/tier';
import { hexStaticMapUrl } from '@/lib/static-map';
import { useHexLocations } from '@/lib/use-hex-locations';
import { useStakedTier } from '@/lib/use-staked-tier';
import { TIERS, type TierKey } from '@/lib/tokenomics-constants';
import { cn } from '@/lib/utils';

type OwnerData = {
  address: string;
  username: string | null;
  flagCountryCode: string | null;
  avatarUrl: string | null;
  joinedAt: string | null;
  hexes: number;
  countries: number;
  totalSpentUsd?: number;
  portfolioValueUsd?: number;
  returnUsd?: number;
  returnPct?: number;
  byCountry?: Array<{ iso: string; name: string; hexes: number; spentUsd: number; valueUsd?: number }>;
  recentHexes?: Array<{ h3: string; iso: string; paidUsd: number; claimedAt: string; imageUrl?: string | null }>;
};

/**
 * Public profile - read-only view of another player. Resolves a /u/[handle]
 * segment as either a username (preferred) or a wallet address (fallback).
 *
 * When the handle isn't in our mock directory (e.g. leaderboard names), we
 * still render a minimal stub so navigation never dead-ends in a 404.
 *
 * Mock data only; the on-chain backfill happens when we wire up the indexer.
 */
export default function PublicProfilePage() {
  const params = useParams<{ handle: string }>();
  const decoded = decodeURIComponent(params.handle);
  const [owner, setOwner] = useState<OwnerData | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/owner?handle=${encodeURIComponent(decoded)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        if (alive) setOwner(json as OwnerData);
      })
      .catch(() => {
        if (alive) setOwner(null);
      });
    return () => {
      alive = false;
    };
  }, [decoded]);

  const user: MockUser = owner
    ? {
        addr: owner.address,
        username: owner.username ?? undefined,
        country: owner.flagCountryCode ?? 'us',
        joined: owner.joinedAt ?? '2026-01-01',
        hexes: owner.hexes,
        countries: owner.countries,
        bondedVava: 0,
      }
    : stubUser(decoded);
  const avatarUrl = owner?.avatarUrl ?? null;
  const tier = useStakedTier(owner?.address ?? (decoded.length >= 32 ? decoded : null));

  const display = user.username ? `@${user.username}` : user.addr;

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 md:px-8 md:py-8">
      <Link
        href="/leaderboard"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft size={12} />
        Back
      </Link>

      <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 p-7 backdrop-blur-md">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16 ring-2 ring-white/50">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={display} />}
              <AvatarFallback
                className="text-base font-medium text-white"
                style={{ background: gradientFromAddr(user.addr) }}
              >
                {(user.username ?? user.addr).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {display}
                </h1>
                <Flag code={user.country} size={18} />
                <TierBadge tier={tier} />
              </div>
              <div className="flex items-center gap-3 text-[11px] text-foreground/55">
                <span className="font-mono">{user.addr}</span>
                <span>·</span>
                <span>Joined {fmtJoined(user.joined)}</span>
              </div>
            </div>
          </div>

          <ShareProfile user={user} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/30 pt-5 sm:grid-cols-4">
          <Stat label="Portfolio value" value={fmtUsd(owner?.portfolioValueUsd ?? 0)} />
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/55">
              Total return
            </div>
            <div
              className={cn(
                'mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xl font-semibold tabular-nums tracking-tight',
                (owner?.returnUsd ?? 0) >= 0
                  ? 'text-white/60'
                  : 'text-white/60 dark:text-white/60',
              )}
            >
              <span className="flex items-center gap-1">
                {(owner?.returnUsd ?? 0) >= 0 ? (
                  <TrendingUp size={15} strokeWidth={2} />
                ) : (
                  <TrendingDown size={15} strokeWidth={2} />
                )}
                {(owner?.returnUsd ?? 0) >= 0 ? '+' : '-'}
                {fmtUsd(Math.abs(owner?.returnUsd ?? 0))}
              </span>
              <span className="text-xs font-medium">
                ({(owner?.returnUsd ?? 0) >= 0 ? '+' : ''}
                {(owner?.returnPct ?? 0).toFixed(1)}%)
              </span>
            </div>
          </div>
          <Stat
            icon={<Hexagon size={14} strokeWidth={1.6} />}
            label="Hexes owned"
            value={user.hexes.toLocaleString('en-US')}
          />
          <Stat
            icon={<Globe size={14} strokeWidth={1.6} />}
            label="Countries"
            value={user.countries.toString()}
          />
        </div>

        {owner?.recentHexes && owner.recentHexes.length > 0 && (
          <PropertyGrid hexes={owner.recentHexes} totalHexes={owner.hexes} />
        )}

        {owner?.byCountry && owner.byCountry.length > 0 && (
          <div className="mt-6 border-t border-white/30 pt-5">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
              Holdings by country
            </div>
            <div className="flex flex-col gap-2">
              {owner.byCountry.map((c) => (
                <Link
                  key={c.iso}
                  href={`/nations/${c.iso}`}
                  className="flex items-center justify-between rounded-xl border border-white/40 bg-white/25 px-3.5 py-2.5 backdrop-blur-md transition-colors hover:bg-white/40"
                >
                  <span className="flex items-center gap-2.5">
                    <Flag code={c.iso} size={18} />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </span>
                  <span className="text-sm tabular-nums text-foreground/70">
                    {c.hexes.toLocaleString('en-US')} {c.hexes === 1 ? 'hex' : 'hexes'}
                    {typeof c.valueUsd === 'number' && (
                      <span className="ml-2 font-medium text-foreground">{fmtUsd(c.valueUsd)}</span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] text-foreground/55">
        Live holdings from the VAVAWORLD register.
      </p>
    </div>
  );
}

const TIER_BADGE: Record<
  TierKey,
  { icon: typeof UserIcon; cls: string; fill?: boolean }
> = {
  tourist: {
    icon: UserIcon,
    cls: 'border-white/50 bg-white/40 text-foreground/70',
  },
  citizen: {
    icon: ShieldCheck,
    cls: 'border-teal-400/50 bg-teal-400/15 text-teal-700 dark:text-teal-300',
  },
  baron: {
    icon: Coins,
    cls: 'border-white/12 bg-white/[0.07] text-white/70 dark:text-white/70',
  },
  president: {
    icon: Crown,
    cls: 'border-white/12 bg-gradient-to-br from-white/[0.06] to-transparent text-white/85',
    fill: true,
  },
};

/** The ONLY badge system: the wallet's staking tier. */
function TierBadge({ tier }: { tier: TierKey }) {
  const meta = TIER_BADGE[tier];
  const Icon = meta.icon;
  const label = TIERS.find((t) => t.key === tier)?.name ?? 'Tourist';
  return (
    <span
      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${meta.cls}`}
    >
      <Icon size={11} className={meta.fill ? 'fill-white/80' : undefined} />
      {tier === 'president' ? 'President' : label}
    </span>
  );
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 100 ? 2 : 0,
  })}`;
}

/** Marketplace-style satellite cards for the owner's most recent hexes. */
function PropertyGrid({
  hexes,
  totalHexes,
}: {
  hexes: NonNullable<OwnerData['recentHexes']>;
  totalHexes: number;
}) {
  const ids = hexes.map((h) => h.h3);
  const locations = useHexLocations(ids);
  return (
    <div className="mt-6 border-t border-white/30 pt-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
          Properties
        </div>
        {totalHexes > hexes.length && (
          <div className="text-[11px] text-foreground/50">
            showing {hexes.length} most recent of {totalHexes.toLocaleString('en-US')}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {hexes.map((h) => {
          const c = hexCenter(h.h3);
          const loc = locations.get(h.h3);
          const img = h.imageUrl ?? hexStaticMapUrl({ lat: c.lat, lng: c.lng, width: 400, height: 260, zoom: 17 });
          const tier = classifyTier(c.lat, c.lng);
          return (
            <Link
              key={h.h3}
              href={`/h/${encodeURIComponent(h.h3)}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md transition-colors hover:bg-white/40"
            >
              <div className="relative aspect-[3/2] overflow-hidden bg-foreground/[0.04]">
                {img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt={h.imageUrl ? 'Property image' : `Satellite view of ${loc?.place ?? h.iso.toUpperCase()}`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                )}
                <span className="absolute right-2 top-2 rounded border border-primary/30 bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary backdrop-blur-sm">
                  T{tier}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 p-2.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Flag code={h.iso} size={14} />
                  <span className="truncate text-[12.5px] font-medium leading-tight text-foreground">
                    {loc?.neighborhood ?? loc?.place ?? loc?.countryName ?? '…'}
                  </span>
                </div>
                <span className="flex-none text-[12px] font-semibold tabular-nums text-foreground/80">
                  ${h.paidUsd.toFixed(4)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
    </div>
  );
}

function fmtJoined(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** Stub while loading / for handles with no register entry - never 404s. */
function stubUser(handle: string): MockUser {
  const isAddr = handle.length > 25;
  return {
    addr: isAddr ? handle : '-',
    username: isAddr ? undefined : handle,
    country: 'us',
    joined: '2026-01-01',
    hexes: 0,
    countries: 0,
    bondedVava: 0,
  };
}

function gradientFromAddr(addr: string): string {
  const h1 = (addr.charCodeAt(0) + addr.charCodeAt(1)) % 360;
  const h2 = (addr.charCodeAt(2) + addr.charCodeAt(3)) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 60%) 0%, hsl(${h2} 70% 50%) 100%)`;
}
