'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import {
  Activity,
  BarChart3,
  CirclePlus,
  Map as MapIcon,
  Settings,
  ShoppingBag,
  Trophy,
  Wallet,
} from 'lucide-react';
import { ConnectButton } from '@/components/connect-button';
import { useActiveWallet } from '@/lib/active-wallet';
import { useUserProfile } from '@/lib/use-user-profile';
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { cn } from '@/lib/utils';

function shortAddr(addr: string): string {
  if (!addr) return '—';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function gradientFromAddr(addr: string | null): string {
  if (!addr) return 'linear-gradient(135deg, #7c5cff 0%, #22d3ee 100%)';
  const h1 = (addr.charCodeAt(0) + addr.charCodeAt(1)) % 360;
  const h2 = (addr.charCodeAt(2) + addr.charCodeAt(3)) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 60%) 0%, hsl(${h2} 70% 50%) 100%)`;
}

type NavItem = { label: string; href: string; icon: typeof MapIcon };
const NAV: ReadonlyArray<NavItem> = [
  { label: 'Map', href: '/map', icon: MapIcon },
  { label: 'Portfolio', href: '/portfolio', icon: BarChart3 },
  { label: 'Profile', href: '/profile', icon: Wallet },
  { label: 'Marketplace', href: '/marketplace', icon: ShoppingBag },
  { label: 'Stake', href: '/stake', icon: CirclePlus },
  { label: 'Activity', href: '/activity', icon: Activity },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
];

/**
 * Global left rail — light glass over the sky body bg.
 *
 * 232px wide, fixed inside an 18px gutter, so the map can bleed beneath it on
 * /map. Dark text + hairline borders work against either backdrop because the
 * panel itself is white-translucent enough to dominate locally.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const wallet = useActiveWallet();
  const profile = useUserProfile();
  const { balance } = useWalletBalance(wallet.publicKey);

  return (
    <aside
      className="fixed bottom-[18px] left-[18px] top-[18px] z-30 flex w-[232px] flex-col rounded-[22px] px-4 pb-4 pt-[22px] text-foreground"
      style={{
        gap: 22,
        // Same translucent recipe as the portfolio .glass/.panel so the sky
        // background reads through instead of a near-white panel.
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 100%)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.45)',
        boxShadow:
          '0 18px 50px rgba(40,80,150,0.22), 0 2px 8px rgba(40,80,150,0.12), inset 0 1px 0 rgba(255,255,255,0.65)',
      }}
    >
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3 px-1.5 py-0.5">
        <BrandLogo size={34} />
        <span className="text-[14px] font-bold tracking-[0.14em] text-foreground">
          VAVAWORLD
        </span>
      </Link>

      {/* Primary nav */}
      <nav className="flex flex-1 flex-col gap-[2px]">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3.5 rounded-[12px] px-3 py-[11px] text-[14.5px] font-medium leading-none transition-colors duration-150',
                active
                  ? 'bg-foreground/[0.06] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'
                  : 'text-foreground/65 hover:bg-foreground/[0.04] hover:text-foreground',
              )}
            >
              <span className="grid w-[22px] place-items-center opacity-95">
                <Icon size={20} strokeWidth={1.8} />
              </span>
              <span>{item.label}</span>
              {active && (
                <span
                  className="pointer-events-none absolute left-1 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-[2px]"
                  style={{
                    background: 'linear-gradient(180deg, #0ea5e9, #14b8a6)',
                    boxShadow: '0 0 10px rgba(20, 184, 166, 0.55)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-2.5">
        <Link
          href="/settings"
          className="flex items-center gap-3.5 rounded-[12px] px-3 py-[11px] text-[14.5px] font-medium leading-none text-foreground/50 transition-colors duration-150 hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <span className="grid w-[22px] place-items-center">
            <Settings size={20} strokeWidth={1.8} />
          </span>
          <span>Settings</span>
        </Link>

        {wallet.ready && wallet.connected && (
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors hover:brightness-105"
            style={{
              // Matches the portfolio .glass--inset user-card (more see-through).
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.04) 100%)',
              border: '1px solid rgba(255,255,255,0.45)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.45), 0 4px 14px rgba(40,80,150,0.10)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
            }}
          >
            <div
              className="h-[34px] w-[34px] flex-none overflow-hidden rounded-[10px]"
              style={{
                background: profile.avatarUrl
                  ? `url(${profile.avatarUrl}) center/cover`
                  : gradientFromAddr(wallet.address),
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.7)',
              }}
            />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[13.5px] font-semibold leading-tight text-foreground">
                {profile.username ? `@${profile.username}` : shortAddr(wallet.address ?? '')}
              </span>
              <span className="truncate text-[11.5px] leading-tight tabular-nums text-foreground/55">
                {balance !== null ? `${balance.toFixed(3)} SOL` : '— SOL'}
              </span>
            </div>
          </Link>
        )}

        {wallet.ready && !wallet.connected && <ConnectButton variant="sidebar" />}
      </div>
    </aside>
  );
}
