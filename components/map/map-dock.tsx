'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bell,
  Coins,
  Globe,
  LogOut,
  Map as MapIcon,
  Settings,
  ShoppingBag,
  Trophy,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { ConnectButton } from '@/components/connect-button';
import { useActiveWallet } from '@/lib/active-wallet';
import { useNotifications } from '@/lib/use-notifications';
import { useUserProfile } from '@/lib/use-user-profile';
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { cn } from '@/lib/utils';

import { useUsdFmt } from '@/lib/usd';
function shortAddr(addr: string): string {
  if (!addr) return '-';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function gradientFromAddr(addr: string | null): string {
  if (!addr) return 'linear-gradient(135deg, #7db4f5, #3b82c4)';
  const h1 = (addr.charCodeAt(0) + addr.charCodeAt(1)) % 360;
  const h2 = (addr.charCodeAt(2) + addr.charCodeAt(3)) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 60%) 0%, hsl(${h2} 70% 50%) 100%)`;
}

type DockItem = { label: string; href: string; icon: typeof MapIcon };

/** Primary destinations, in the dock. Mirrors NAV in app-sidebar.tsx. */
const PRIMARY: ReadonlyArray<DockItem> = [
  { label: 'Map', href: '/map', icon: MapIcon },
  { label: 'Portfolio', href: '/portfolio', icon: BarChart3 },
  { label: 'Marketplace', href: '/marketplace', icon: ShoppingBag },
  { label: 'Nations', href: '/nations', icon: Globe },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
];

/** Secondary destinations, in the "More" popover above the dock. */
const SECONDARY: ReadonlyArray<DockItem> = [
  { label: 'Profile', href: '/profile', icon: Wallet },
  { label: 'Activity', href: '/activity', icon: Activity },
  { label: 'Staking', href: '/staking', icon: Coins },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];

/**
 * Native-app style navigation for /map, replacing the top bar the rest of
 * (app)/ uses. Two floating glass pieces so the map itself stays unobstructed:
 *
 *  - a centred bottom dock carrying the primary destinations, and
 *  - a top-left brand mark + top-right account pill.
 *
 * Only /map renders this; every other (app) route keeps <TopNav>.
 */
export function MapDock() {
  const usd = useUsdFmt();
  const pathname = usePathname();
  const wallet = useActiveWallet();
  const profile = useUserProfile();
  const { balance } = useWalletBalance(wallet.address);
  const { unread } = useNotifications(wallet.address);
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && (pathname?.startsWith(href + '/') ?? false));

  return (
    <>
      {/* ── Top-left: brand mark ─────────────────────────────────────── */}
      <Link
        href="/"
        aria-label="VAVAWORLD home"
        className="glass fixed left-[65px] top-[18px] z-30 hidden h-[46px] items-center gap-2.5 rounded-[15px] px-3.5 transition-transform duration-150 hover:scale-[1.02] md:flex"
      >
        <BrandLogo size={24} variant="white" />
        <span
          className="text-[10px] tracking-[0.02em] text-white"
          style={{ fontFamily: '"StretchPro", "Abril Fatface", Georgia, serif' }}
        >
          VAVAWORLD
        </span>
      </Link>

      {/* ── Bottom-centre: the dock ──────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[22px] z-30 hidden justify-center md:flex">
        <div className="pointer-events-auto relative">
          {/* "More" popover, anchored above the dock. */}
          {moreOpen && (
            <>
              <div
                className="fixed inset-0 -z-10"
                onClick={() => setMoreOpen(false)}
                aria-hidden
              />
              <div className="glass absolute bottom-[calc(100%+10px)] right-0 w-[210px] rounded-[16px] p-1.5">
                {SECONDARY.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13.5px] leading-none transition-colors',
                        isActive(item.href)
                          ? 'bg-white/10 font-semibold text-white'
                          : 'font-medium text-white/70 hover:bg-white/[0.07] hover:text-white',
                      )}
                    >
                      <span className="relative grid w-[18px] place-items-center">
                        <Icon size={17} strokeWidth={1.8} />
                        {item.href === '/notifications' && unread > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 grid h-[14px] min-w-[14px] place-items-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          <nav className="glass relative flex items-center gap-1 rounded-[20px] p-1.5">
            {PRIMARY.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'group relative flex flex-col items-center gap-[5px] rounded-[15px] px-[18px] pb-[9px] pt-[10px] transition-colors duration-150',
                    active
                      ? 'bg-white/[0.13] text-white'
                      : 'text-white/60 hover:bg-white/[0.07] hover:text-white',
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.1 : 1.8} />
                  <span
                    className={cn(
                      'text-[10.5px] leading-none tracking-[0.01em]',
                      active ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <span
                      className="absolute -bottom-[1px] left-1/2 h-[2.5px] w-5 -translate-x-1/2 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
                        boxShadow: '0 0 10px rgba(125,180,245,0.8)',
                      }}
                    />
                  )}
                </Link>
              );
            })}

            <span className="mx-1 h-8 w-px bg-white/10" />

            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="More"
              aria-expanded={moreOpen}
              className={cn(
                'relative flex flex-col items-center gap-[5px] rounded-[15px] px-[18px] pb-[9px] pt-[10px] transition-colors duration-150',
                moreOpen
                  ? 'bg-white/[0.13] text-white'
                  : 'text-white/60 hover:bg-white/[0.07] hover:text-white',
              )}
            >
              <span className="relative grid place-items-center">
                <MoreGlyph />
                {unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid h-[14px] min-w-[14px] place-items-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
              <span className="text-[10.5px] font-medium leading-none tracking-[0.01em]">More</span>
            </button>
          </nav>
        </div>
      </div>

      {/* ── Top-right: account pill ──────────────────────────────────── */}
      <div className="fixed right-[65px] top-[18px] z-30 hidden md:block">
        {wallet.ready && wallet.connected && (
          <div className="glass relative flex h-[46px] items-center gap-2.5 rounded-[15px] px-2.5">
            <Link
              href="/profile"
              className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <div
                className="h-[30px] w-[30px] flex-none overflow-hidden rounded-[9px]"
                style={{
                  background: profile.avatarUrl
                    ? `url(${profile.avatarUrl}) center/cover`
                    : gradientFromAddr(wallet.address),
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)',
                }}
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[12.5px] font-semibold leading-tight text-white">
                  {profile.username ? `@${profile.username}` : shortAddr(wallet.address ?? '')}
                </span>
                <span className="truncate text-[11px] leading-tight tabular-nums text-white/55">
                  {balance !== null ? usd(balance) : '$ -'}
                </span>
              </div>
            </Link>
            <button
              type="button"
              aria-label="Log out"
              title="Log out"
              onClick={() => void wallet.logout()}
              className="grid h-7 w-7 flex-none place-items-center rounded-[8px] text-white/55 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={15} strokeWidth={1.8} />
            </button>
          </div>
        )}
        {wallet.ready && !wallet.connected && <ConnectButton />}
      </div>
    </>
  );
}

/** Three-dot "more" glyph, sized to sit on the same baseline as lucide icons. */
function MoreGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="4" cy="10" r="1.6" />
      <circle cx="10" cy="10" r="1.6" />
      <circle cx="16" cy="10" r="1.6" />
    </svg>
  );
}
