'use client';

import { useState } from 'react';
import { AtSign, Check, Copy } from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { flagEmoji } from '@/lib/flag-emoji';
import { findCountry } from '@/lib/countries';
import { useActiveWallet } from '@/lib/active-wallet';
import { useUserProfile } from '@/lib/use-user-profile';
import { useUserTiles } from '@/lib/use-user-tiles';
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { EditProfileDialog } from './edit-profile-dialog';
import { ExportKeyButton } from './export-key-button';

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
 * Top section of /profile. Real data only:
 *   - Avatar (Supabase upload > Twitter pic > gradient)
 *   - Name + provider badge + chosen country flag
 *   - Wallet address (copy-able) + join date
 *   - Summary stats: tiles owned, total spent on-chain, current SOL balance
 *
 * `onSavedBumpVersion` is called after a successful edit so the page can
 * force every `useUserProfile` consumer to re-fetch.
 */
export function IdentityCard({ onSavedBumpVersion }: { onSavedBumpVersion: () => void }) {
  const profile = useUserProfile();
  const wallet = useActiveWallet();
  const { tiles } = useUserTiles();
  const { balance } = useWalletBalance(wallet.publicKey);
  const [copied, setCopied] = useState(false);

  const totalSpent =
    tiles?.reduce((sum, t) => sum + Number(t.pricePaid) / LAMPORTS_PER_SOL, 0) ?? null;
  const country = findCountry(profile.flagCountryCode);

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
    <div
      className="mb-8 overflow-hidden rounded-[18px] border border-white/60 p-7"
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.55) 100%)',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
        boxShadow:
          '0 18px 50px -20px rgba(8,14,28,0.15), inset 0 1px 0 rgba(255,255,255,0.65)',
      }}
    >
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
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{profile.displayName}</h1>
              {country && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-base leading-none">{flagEmoji(country.code)}</span>
                  </TooltipTrigger>
                  <TooltipContent>{country.name}</TooltipContent>
                </Tooltip>
              )}
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

            {profile.bio && (
              <p className="max-w-md text-sm leading-snug text-foreground/65">
                {profile.bio}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-foreground/55 tabular-nums">
              <button
                type="button"
                onClick={handleCopy}
                className="group flex items-center gap-1.5 transition-colors hover:text-foreground"
                aria-label="Copy wallet address"
              >
                <span>{profile.walletAddress ? shortAddr(profile.walletAddress) : 'No wallet'}</span>
                {profile.walletAddress &&
                  (copied ? (
                    <Check size={12} className="text-primary" />
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

        {/* Right: edit + export buttons + real summary */}
        <div className="flex flex-col items-end gap-4">
          <div className="flex items-center gap-2">
            <ExportKeyButton />
            {profile.walletAddress && (
              <EditProfileDialog
                walletAddress={profile.walletAddress}
                initialUsername={profile.username}
                initialFlagCode={profile.flagCountryCode}
                initialAvatarUrl={profile.avatarUrl}
                initialBio={profile.bio}
                onSaved={onSavedBumpVersion}
              />
            )}
          </div>
          <div className="grid grid-cols-3 gap-6 sm:gap-8">
            <SummaryStat label="Hexes" value={tiles ? String(tiles.length) : '—'} />
            <SummaryStat
              label="Spent"
              value={totalSpent !== null ? totalSpent.toFixed(3) : '—'}
              unit="SOL"
            />
            <SummaryStat
              label="Balance"
              value={balance !== null ? balance.toFixed(3) : '—'}
              unit="SOL"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/50">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{value}</span>
        {unit && <span className="text-[11px] text-foreground/50">{unit}</span>}
      </div>
    </div>
  );
}
