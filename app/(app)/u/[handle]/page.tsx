'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Crown, Globe, Hexagon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flag } from '@/components/flag';
import { Achievements } from '@/components/profile/achievements';
import { ShareProfile } from '@/components/profile/share-profile';
import type { MockUser } from '@/lib/mock-users';

type OwnerData = {
  address: string;
  username: string | null;
  flagCountryCode: string | null;
  avatarUrl: string | null;
  joinedAt: string | null;
  hexes: number;
  countries: number;
  byCountry?: Array<{ iso: string; name: string; hexes: number; spentUsd: number }>;
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

  const display = user.username ? `@${user.username}` : user.addr;

  return (
    <div className="mx-auto max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] px-4 py-6 md:px-8 md:py-8 2xl:px-10">
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
                {(user.presidentOf?.length ?? 0) > 0 && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-300/60 bg-gradient-to-br from-amber-300/40 to-orange-400/25 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-700">
                    <Crown size={11} className="fill-amber-400" />
                    President
                  </span>
                )}
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

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/30 pt-5">
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
          <Stat label="$VAVA bonded" value={user.bondedVava.toLocaleString('en-US')} />
        </div>

        <Achievements user={user} />

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
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] text-foreground/55">
        Live holdings from the VavaWorld register.
      </p>
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
