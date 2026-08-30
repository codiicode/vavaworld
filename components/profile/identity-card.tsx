'use client';

import { useState } from 'react';
import { AtSign, Check, Copy, LogOut } from 'lucide-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Flag } from '@/components/flag';
import { findCountry } from '@/lib/countries';
import { useActiveWallet } from '@/lib/active-wallet';
import { useUserProfile } from '@/lib/use-user-profile';
import { useUserTiles } from '@/lib/use-user-tiles';
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { ConnectX } from './connect-x';
import { EditProfileDialog } from './edit-profile-dialog';
import { ExportKeyButton } from './export-key-button';

function shortAddr(addr: string): string {
  if (!addr) return '-';
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
    <div className="mb-8 overflow-hidden rounded-2xl border border-white/40 bg-white/30 p-7 backdrop-blur-md">
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
                    <Flag code={country.code} size={15} />
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

            <ConnectX onChanged={onSavedBumpVersion} />
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
            <button
              type="button"
              onClick={() => void wallet.logout()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/30 px-3 py-1.5 text-[13px] font-medium text-foreground/70 backdrop-blur-md transition-colors hover:bg-white/50 hover:text-foreground"
            >
              <LogOut size={14} strokeWidth={1.8} />
              Log out
            </button>
          </div>
          <div className="grid grid-cols-3 gap-6 sm:gap-8">
            <SummaryStat label="Hexes" value={tiles ? String(tiles.length) : '-'} />
            <SummaryStat
              label="Spent"
              value={totalSpent !== null ? totalSpent.toFixed(3) : '-'}
              unit="SOL"
            />
            <SummaryStat
              label="Balance"
              value={balance !== null ? balance.toFixed(3) : '-'}
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
