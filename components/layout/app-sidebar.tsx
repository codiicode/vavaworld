'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
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
  { label: 'Profile', href: '/profile', icon: Wallet },
  { label: 'Marketplace', href: '/marketplace', icon: ShoppingBag },
  { label: 'Stake', href: '/stake', icon: CirclePlus },
  { label: 'Activity', href: '/activity', icon: Activity },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
];

/**
 * Global left rail — glass panel overlay. 232px wide, fixed positioning inside
 * an 18px gutter so the map can bleed under it on /map.
 *
 * Design tokens are read from globals.css (`--glass-*`, `--brand`, etc.).
 * Active nav item gets the inset highlight + a teal→sky bar at the left edge.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const wallet = useActiveWallet();
  const profile = useUserProfile();
  const { balance } = useWalletBalance(wallet.publicKey);

  return (
    <aside
      className="glass glass-panel fixed bottom-[18px] left-[18px] top-[18px] z-30 flex w-[232px] flex-col px-4 pb-4 pt-[22px]"
      style={{ gap: 22 }}
    >
      {/* Brand */}
      <Link href="/" className="relative z-[1] flex items-center gap-3 px-1.5 py-0.5 text-white">
        <span
          className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/15"
          style={{
            background:
              'linear-gradient(135deg, rgba(94,234,212,0.25), rgba(56,189,248,0.12))',
            color: 'var(--brand)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden>
            <path
              d="M16 3 27.3 9.5v13L16 29 4.7 22.5v-13L16 3Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-[14px] font-bold tracking-[0.14em]">VAVAWORLD</span>
      </Link>

      {/* Primary nav */}
      <nav className="relative z-[1] flex flex-1 flex-col gap-[2px]">
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
                  ? 'text-white'
                  : 'text-white/72 hover:bg-white/[0.06] hover:text-white',
              )}
              style={
                active
                  ? {
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
                      boxShadow:
                        'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(255,255,255,0.04)',
                    }
                  : undefined
              }
            >
              <span className="grid w-[22px] place-items-center opacity-95">
                <Icon size={20} strokeWidth={1.8} />
              </span>
              <span>{item.label}</span>
              {active && (
                <span
                  className="pointer-events-none absolute left-1 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-[2px]"
                  style={{
                    background: 'linear-gradient(180deg, var(--brand), var(--brand-2))',
                    boxShadow: '0 0 12px rgba(94, 234, 212, 0.7)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative z-[1] flex flex-col gap-2.5">
        <Link
          href="/settings"
          className="flex items-center gap-3.5 rounded-[12px] px-3 py-[11px] text-[14.5px] font-medium leading-none text-white/52 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white"
        >
          <span className="grid w-[22px] place-items-center">
            <Settings size={20} strokeWidth={1.8} />
          </span>
          <span>Settings</span>
        </Link>

        {wallet.ready && wallet.connected && (
          <Link
            href="/profile"
            className="glass glass--inset flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
          >
            <div
              className="h-[34px] w-[34px] flex-none overflow-hidden rounded-[10px]"
              style={{
                background: profile.avatarUrl
                  ? `url(${profile.avatarUrl}) center/cover`
                  : gradientFromAddr(wallet.address),
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
              }}
            />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[13.5px] font-semibold leading-tight text-white">
                {profile.username ? `@${profile.username}` : shortAddr(wallet.address ?? '')}
              </span>
              <span className="truncate text-[11.5px] leading-tight tabular-nums text-white/52">
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
