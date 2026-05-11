'use client';

import { useState } from 'react';
import { AtSign, Check, Copy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserProfile } from '@/lib/use-user-profile';
import { mockTiles } from '@/lib/mock-data';

function shortAddr(addr: string): string {
  if (!addr) return '—';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function gradientFromAddr(addr: string | null): string {
  if (!addr) return 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)';
  const h1 = (addr.charCodeAt(0) + addr.charCodeAt(1)) % 360;
  const h2 = (addr.charCodeAt(2) + addr.charCodeAt(3)) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 60%) 0%, hsl(${h2} 70% 50%) 100%)`;
}

/**
 * Top section of /profile. Avatar (Twitter pic when linked, gradient fallback),
 * display name + provider badge, wallet address with copy, inline summary stats.
 */
export function IdentityCard() {
  const profile = useUserProfile();
  const [copied, setCopied] = useState(false);

  const totalValue = mockTiles.reduce((sum, t) => sum + t.floor, 0);

  const handleCopy = async () => {
    if (!profile.walletAddress) return;
    try {
      await navigator.clipboard.writeText(profile.walletAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard denied */
    }
  };

  return (
    <div className="mb-10 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: avatar + name + addr */}
        <div className="flex items-center gap-5">
          <Avatar className="h-16 w-16">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />}
            <AvatarFallback
              className="text-base font-medium text-white"
              style={{ background: gradientFromAddr(profile.walletAddress) }}
            >
              {(profile.walletAddress ?? '??').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{profile.displayName}</h1>
              {profile.provider === 'twitter' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <AtSign size={11} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Linked via Twitter</TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
              <button
                type="button"
                onClick={handleCopy}
                className="group flex items-center gap-1.5 transition-colors hover:text-foreground"
                aria-label="Copy wallet address"
              >
                <span>{profile.walletAddress ? shortAddr(profile.walletAddress) : 'No wallet'}</span>
                {profile.walletAddress &&
                  (copied ? (
                    <Check size={12} className="text-emerald-600" />
                  ) : (
                    <Copy size={12} className="opacity-60 group-hover:opacity-100" />
                  ))}
              </button>
              {profile.joinedAt && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    Joined{' '}
                    {profile.joinedAt.toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: inline summary */}
        <div className="grid grid-cols-3 gap-6 sm:gap-8">
          <SummaryStat label="Tiles" value={String(mockTiles.length)} />
          <SummaryStat label="Value" value={totalValue.toFixed(2)} unit="SOL" />
          <SummaryStat label="$VAVA" value="284K" />
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular-nums tracking-tight">{value}</span>
        {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
