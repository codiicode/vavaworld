'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  CirclePlus,
  Map as MapIcon,
  Menu,
  Settings,
  ShoppingBag,
  Trophy,
  Wallet,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
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

const ALL_NAV: ReadonlyArray<NavItem> = [
  { label: 'Map', href: '/map', icon: MapIcon },
  { label: 'Portfolio', href: '/portfolio', icon: BarChart3 },
  { label: 'Profile', href: '/profile', icon: Wallet },
  { label: 'Marketplace', href: '/marketplace', icon: ShoppingBag },
  { label: 'Stake', href: '/stake', icon: CirclePlus },
  { label: 'Activity', href: '/activity', icon: Activity },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
];

// Bottom tab bar — only the five most-used destinations. The rest live in the
// drawer behind the hamburger.
const BOTTOM_TABS: ReadonlyArray<NavItem> = [
  { label: 'Map', href: '/map', icon: MapIcon },
  { label: 'Market', href: '/marketplace', icon: ShoppingBag },
  { label: 'Portfolio', href: '/portfolio', icon: BarChart3 },
  { label: 'Top', href: '/leaderboard', icon: Trophy },
  { label: 'Profile', href: '/profile', icon: Wallet },
];

/**
 * Mobile-only chrome: a translucent top bar with brand + hamburger, a slide-in
 * drawer mirroring the desktop AppSidebar nav, and a bottom tab bar so the
 * primary destinations are always one tap away.
 *
 * Hidden on md+ via `md:hidden` — the desktop AppSidebar takes over there.
 */
export function MobileNav() {
  const pathname = usePathname();
  const wallet = useActiveWallet();
  const profile = useUserProfile();
  const { balance } = useWalletBalance(wallet.publicKey);
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes so a tap on a nav link feels
  // natural without leaving a backdrop behind.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? 'hidden' : prev || '';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname?.startsWith(href + '/'));

  return (
    <>
      {/* Top bar */}
      <header
        className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between px-3 md:hidden"
        style={{
          paddingTop: 'calc(var(--safe-top) + 4px)',
          height: 'calc(56px + var(--safe-top))',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.25) 100%)',
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          borderBottom: '1px solid rgba(255,255,255,0.45)',
          boxShadow: '0 6px 22px rgba(40,80,150,0.10)',
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 px-1">
          <BrandLogo size={28} />
          <span className="text-[12.5px] font-bold tracking-[0.14em] text-foreground">
            VAVAWORLD
          </span>
        </Link>

        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/45 bg-white/30 text-foreground/85 backdrop-blur"
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>
      </header>

      {/* Drawer + backdrop */}
      {open && (
        <>
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm md:hidden"
          />
          <aside
            className="fixed bottom-0 right-0 top-0 z-[70] flex w-[280px] max-w-[86vw] flex-col px-4 pb-4 md:hidden"
            style={{
              paddingTop: 'calc(var(--safe-top) + 14px)',
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.38) 100%)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              borderLeft: '1px solid rgba(255,255,255,0.55)',
              boxShadow: '-18px 0 50px rgba(40,80,150,0.22)',
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandLogo size={30} />
                <span className="text-[13px] font-bold tracking-[0.14em] text-foreground">
                  VAVAWORLD
                </span>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg text-foreground/70 hover:bg-foreground/[0.06]"
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-[2px] overflow-y-auto">
              {ALL_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-3.5 rounded-[12px] px-3 py-[12px] text-[15px] font-medium leading-none transition-colors duration-150',
                      active
                        ? 'bg-foreground/[0.08] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'
                        : 'text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground',
                    )}
                  >
                    <span className="grid w-[22px] place-items-center opacity-95">
                      <Icon size={20} strokeWidth={1.8} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <Link
                href="/settings"
                className="mt-1 flex items-center gap-3.5 rounded-[12px] px-3 py-[12px] text-[15px] font-medium leading-none text-foreground/60 transition-colors duration-150 hover:bg-foreground/[0.04] hover:text-foreground"
              >
                <span className="grid w-[22px] place-items-center">
                  <Settings size={20} strokeWidth={1.8} />
                </span>
                <span>Settings</span>
              </Link>
            </nav>

            {/* Wallet chip */}
            <div className="mt-3">
              {wallet.ready && wallet.connected && (
                <Link
                  href="/profile"
                  className="flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors hover:brightness-105"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.10) 100%)',
                    border: '1px solid rgba(255,255,255,0.55)',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.45), 0 4px 14px rgba(40,80,150,0.10)',
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                  }}
                >
                  <div
                    className="h-[36px] w-[36px] flex-none overflow-hidden rounded-[10px]"
                    style={{
                      background: profile.avatarUrl
                        ? `url(${profile.avatarUrl}) center/cover`
                        : gradientFromAddr(wallet.address),
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.7)',
                    }}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[14px] font-semibold leading-tight text-foreground">
                      {profile.username
                        ? `@${profile.username}`
                        : shortAddr(wallet.address ?? '')}
                    </span>
                    <span className="truncate text-[12px] leading-tight tabular-nums text-foreground/55">
                      {balance !== null ? `${balance.toFixed(3)} SOL` : '— SOL'}
                    </span>
                  </div>
                </Link>
              )}

              {wallet.ready && !wallet.connected && <ConnectButton variant="sidebar" />}
            </div>
          </aside>
        </>
      )}

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-between px-1 md:hidden"
        style={{
          paddingBottom: 'var(--safe-bottom)',
          height: 'calc(60px + var(--safe-bottom))',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.78) 100%)',
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          borderTop: '1px solid rgba(255,255,255,0.55)',
          boxShadow: '0 -6px 22px rgba(40,80,150,0.10)',
        }}
        aria-label="Primary"
      >
        {BOTTOM_TABS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10.5px] font-medium tracking-wide transition-colors',
                active ? 'text-foreground' : 'text-foreground/55 hover:text-foreground/80',
              )}
            >
              <span
                className={cn(
                  'grid h-7 w-12 place-items-center rounded-full transition-colors',
                  active && 'bg-foreground/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
                )}
              >
                <Icon size={19} strokeWidth={active ? 2 : 1.7} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
