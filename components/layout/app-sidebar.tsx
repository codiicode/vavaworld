'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import {
  Activity,
  BarChart3,
  Coins,
  Globe,
  Map as MapIcon,
  Menu,
  Moon,
  Settings,
  ShoppingBag,
  Sun,
  Trophy,
  Wallet,
  X,
} from 'lucide-react';
import { ConnectButton } from '@/components/connect-button';
import { useTheme } from '@/components/theme-provider';
import { useActiveWallet } from '@/lib/active-wallet';
import { useUserProfile } from '@/lib/use-user-profile';
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { cn } from '@/lib/utils';

function shortAddr(addr: string): string {
  if (!addr) return '-';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function gradientFromAddr(addr: string | null): string {
  if (!addr) return 'linear-gradient(135deg, #7c5cff 0%, #22d3ee 100%)';
  const h1 = (addr.charCodeAt(0) + addr.charCodeAt(1)) % 360;
  const h2 = (addr.charCodeAt(2) + addr.charCodeAt(3)) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 60%) 0%, hsl(${h2} 70% 50%) 100%)`;
}

// Shared glass recipe (light + dark variants) lives in globals.css so the
// desktop rail, mobile drawer and top bar stay identical: .sidebar-glass.

type NavItem = { label: string; href: string; icon: typeof MapIcon };
const NAV: ReadonlyArray<NavItem> = [
  { label: 'Map', href: '/map', icon: MapIcon },
  { label: 'Portfolio', href: '/portfolio', icon: BarChart3 },
  { label: 'Profile', href: '/profile', icon: Wallet },
  { label: 'Marketplace', href: '/marketplace', icon: ShoppingBag },
  { label: 'Nations', href: '/nations', icon: Globe },
  { label: 'Activity', href: '/activity', icon: Activity },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Staking', href: '/staking', icon: Coins },
];

/**
 * Brand + nav + footer. Shared by the desktop rail and the mobile drawer.
 * `onNavigate` lets the mobile drawer close itself when a link is tapped.
 */
function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const wallet = useActiveWallet();
  const profile = useUserProfile();
  const { balance } = useWalletBalance(wallet.publicKey);
  const { theme, toggle } = useTheme();
  // The sidebar glass is dark over the map (and in dark mode) but light over
  // the white-glow app pages - the wordmark/logo flip to stay visible.
  const isMap = pathname?.startsWith('/map') ?? false;
  const onDark = isMap || theme === 'dark';

  return (
    <>
      {/* Brand */}
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 px-1.5 py-0.5"
      >
        <BrandLogo size={38} variant={onDark ? 'white' : 'color'} />
        <span
          className="text-[11px] tracking-[0.02em]"
          style={{
            fontFamily: '"StretchPro", "Abril Fatface", Georgia, serif',
            color: onDark ? '#ffffff' : '#0b1a2e',
          }}
        >
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
              onClick={onNavigate}
              className={cn(
                'relative flex items-center gap-3.5 rounded-[12px] px-3 py-[11px] text-[14.5px] leading-none transition-colors duration-150',
                active
                  ? 'sidebar-active font-semibold text-foreground'
                  : 'font-medium text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground',
              )}
            >
              <span className="grid w-[22px] place-items-center opacity-95">
                <Icon size={20} strokeWidth={1.8} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-3.5 rounded-[12px] px-3 py-[11px] text-[14.5px] font-medium leading-none text-foreground/50 transition-colors duration-150 hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <span className="grid w-[22px] place-items-center">
            {theme === 'dark' ? (
              <Sun size={20} strokeWidth={1.8} />
            ) : (
              <Moon size={20} strokeWidth={1.8} />
            )}
          </span>
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <Link
          href="/settings"
          onClick={onNavigate}
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
            onClick={onNavigate}
            className="sidebar-chip flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors hover:brightness-105"
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
                {balance !== null ? `${balance.toFixed(3)} SOL` : '- SOL'}
              </span>
            </div>
          </Link>
        )}

        {wallet.ready && !wallet.connected && <ConnectButton variant="sidebar" />}
      </div>
    </>
  );
}

/**
 * Global left rail - light glass over the sky body bg. Desktop only (md+);
 * on mobile the nav lives in {@link MobileNav}'s slide-in drawer instead.
 */
export function AppSidebar() {
  return (
    <aside
      className="sidebar-glass fixed bottom-[18px] left-[18px] top-[18px] z-30 hidden w-[232px] flex-col rounded-[22px] px-4 pb-4 pt-[22px] text-foreground md:flex"
      style={{ gap: 22 }}
    >
      <SidebarInner />
    </aside>
  );
}

/**
 * Mobile-only (<md) top bar with a hamburger that opens the full nav as a
 * left slide-in drawer. Auto-closes on route change.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { theme } = useTheme();
  const isMap = pathname?.startsWith('/map') ?? false;
  const onDark = isMap || theme === 'dark';

  // Close on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Top bar */}
      <div
        className="sidebar-glass fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between px-4 text-foreground md:hidden"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <BrandLogo size={30} variant={onDark ? 'white' : 'color'} />
          <span
            className="text-[11px] tracking-[0.02em]"
            style={{
              fontFamily: '"StretchPro", "Abril Fatface", Georgia, serif',
              color: onDark ? '#ffffff' : '#0b1a2e',
            }}
          >
            VAVAWORLD
          </span>
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-[10px] text-foreground/80 transition-colors hover:bg-foreground/[0.06]"
        >
          <Menu size={22} strokeWidth={1.8} />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          'sidebar-glass fixed bottom-0 left-0 top-0 z-50 flex w-[280px] max-w-[85vw] flex-col px-4 pb-4 pt-5 text-foreground transition-transform duration-200 ease-out md:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ gap: 18 }}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-[10px] text-foreground/70 transition-colors hover:bg-foreground/[0.06]"
        >
          <X size={18} strokeWidth={2} />
        </button>
        <SidebarInner onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
