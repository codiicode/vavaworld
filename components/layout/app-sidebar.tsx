'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import {
  Activity,
  BarChart3,
  Bell,
  Coins,
  Globe,
  LogOut,
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
import { useNotifications } from '@/lib/use-notifications';
import { useUserProfile } from '@/lib/use-user-profile';
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { cn } from '@/lib/utils';

import { fmtUsdValue } from '@/lib/usd';
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
  const { balanceUsd } = useWalletBalance(wallet.address);
  const { unread } = useNotifications(wallet.address);
  const { theme, toggle } = useTheme();
  // The sidebar glass is dark over the map (and in dark mode) but light over
  // the white-glow app pages - the wordmark/logo flip to stay visible.
  // Every (app) route renders on the dark shell now.
  const onDark = true;

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
                'relative flex items-center gap-2.5 rounded-[12px] px-2.5 py-[10px] text-[14px] leading-none transition-colors duration-150',
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
        <Link
          href="/notifications"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2.5 rounded-[12px] px-2.5 py-[10px] text-[14px] leading-none transition-colors duration-150',
            pathname === '/notifications'
              ? 'sidebar-active font-semibold text-foreground'
              : 'font-medium text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground',
          )}
        >
          <span className="relative grid w-[22px] place-items-center">
            <Bell size={20} strokeWidth={1.8} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
          <span>Notifications</span>
        </Link>
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
          <div className="sidebar-chip flex items-center gap-3 rounded-[14px] px-3 py-2.5">
            <Link
              href="/profile"
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80"
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
                  {balanceUsd !== null ? fmtUsdValue(balanceUsd) : '$ -'}
                </span>
              </div>
            </Link>
            <button
              type="button"
              aria-label="Log out"
              title="Log out"
              onClick={() => {
                void wallet.logout();
                onNavigate?.();
              }}
              className="grid h-8 w-8 flex-none place-items-center rounded-[9px] text-foreground/55 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <LogOut size={16} strokeWidth={1.8} />
            </button>
          </div>
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
  const pathname = usePathname();
  const isMap = pathname?.startsWith('/map') ?? false;
  return (
    <aside
      className={cn(
        'sidebar-glass fixed bottom-[18px] left-[18px] top-[18px] z-30 hidden w-[232px] flex-col rounded-[22px] px-4 pb-4 pt-[22px] text-foreground md:flex',
        isMap && 'on-map-dark',
      )}
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
  const isMap = pathname?.startsWith('/map') ?? false;
  // Every (app) route renders on the dark shell now.
  const onDark = true;

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
        className={cn(
          'sidebar-glass fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between px-4 text-foreground md:hidden',
          isMap && 'on-map-dark',
        )}
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
          isMap && 'on-map-dark',
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

/**
 * Desktop top bar. Replaces the left rail so /map and /marketplace get the
 * full viewport width. Carries the same NAV as {@link SidebarInner} so the
 * two never drift; secondary actions (notifications, theme, settings) collapse
 * to icon buttons and the wallet chip sits at the far right.
 */
export function TopNav() {
  const pathname = usePathname();
  const wallet = useActiveWallet();
  const profile = useUserProfile();
  const { balanceUsd } = useWalletBalance(wallet.address);
  const { unread } = useNotifications(wallet.address);
  const { theme, toggle } = useTheme();

  const isMap = pathname?.startsWith('/map') ?? false;
  // Every (app) route renders on the dark shell now.
  const onDark = true;

  const iconBtn =
    'grid h-10 w-10 place-items-center rounded-[10px] text-foreground/55 transition-colors hover:bg-foreground/[0.06] hover:text-foreground';

  return (
    <header
      className={cn(
        'sidebar-glass fixed left-1/2 top-[18px] z-30 hidden h-[62px] w-[calc(100vw-130px)] max-w-[1600px] -translate-x-1/2 items-center gap-2 rounded-[18px] px-4 text-foreground md:flex',
        isMap && 'on-map-dark',
      )}
    >
      {/* Brand */}
      <Link href="/" className="flex flex-none items-center gap-2.5 pr-1">
        <BrandLogo size={28} variant={onDark ? 'white' : 'color'} />
        <span
          className="hidden text-[10px] tracking-[0.02em] lg:inline"
          style={{
            fontFamily: '"StretchPro", "Abril Fatface", Georgia, serif',
            color: onDark ? '#ffffff' : '#0b1a2e',
          }}
        >
          VAVAWORLD
        </span>
      </Link>

      <span className="mx-1 h-6 w-px flex-none bg-foreground/10" />

      {/* Primary nav */}
      <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-none items-center gap-2 rounded-[11px] px-3.5 py-2.5 text-[13.5px] leading-none transition-colors duration-150',
                active
                  ? 'sidebar-active font-semibold text-foreground'
                  : 'font-medium text-foreground/65 hover:bg-foreground/[0.04] hover:text-foreground',
              )}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span className="hidden xl:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Secondary actions */}
      <div className="flex flex-none items-center gap-0.5">
        <Link
          href="/notifications"
          aria-label="Notifications"
          className={cn(iconBtn, 'relative', pathname === '/notifications' && 'text-foreground')}
        >
          <Bell size={18} strokeWidth={1.8} />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className={iconBtn}
        >
          {theme === 'dark' ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
        </button>
        <Link href="/settings" aria-label="Settings" className={iconBtn}>
          <Settings size={18} strokeWidth={1.8} />
        </Link>
      </div>

      {/* Wallet */}
      {wallet.ready && wallet.connected && (
        <div className="sidebar-chip ml-1 flex flex-none items-center gap-2.5 rounded-[12px] px-2.5 py-1.5">
          <Link href="/profile" className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80">
            <div
              className="h-[28px] w-[28px] flex-none overflow-hidden rounded-[8px]"
              style={{
                background: profile.avatarUrl
                  ? `url(${profile.avatarUrl}) center/cover`
                  : gradientFromAddr(wallet.address),
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.7)',
              }}
            />
            <div className="hidden min-w-0 flex-col lg:flex">
              <span className="truncate text-[12.5px] font-semibold leading-tight text-foreground">
                {profile.username ? `@${profile.username}` : shortAddr(wallet.address ?? '')}
              </span>
              <span className="truncate text-[11px] leading-tight tabular-nums text-foreground/55">
                {balanceUsd !== null ? fmtUsdValue(balanceUsd) : '$ -'}
              </span>
            </div>
          </Link>
          <button
            type="button"
            aria-label="Log out"
            title="Log out"
            onClick={() => void wallet.logout()}
            className="grid h-7 w-7 flex-none place-items-center rounded-[8px] text-foreground/55 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <LogOut size={15} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {wallet.ready && !wallet.connected && (
        <div className="ml-1 flex-none">
          <ConnectButton />
        </div>
      )}
    </header>
  );
}
