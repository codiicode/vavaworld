'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Coins,
  Hexagon,
  Map as MapIcon,
  Settings,
  Store,
  Trophy,
  Wallet,
} from 'lucide-react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useActiveWallet } from '@/lib/active-wallet';
import { getConnection } from '@/lib/anchor-client';
import { useUserProfile } from '@/lib/use-user-profile';
import { cn } from '@/lib/utils';

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

const NAV: ReadonlyArray<{ label: string; href: string; icon: typeof MapIcon }> = [
  { label: 'Map', href: '/map', icon: MapIcon },
  { label: 'Profile', href: '/profile', icon: Wallet },
  { label: 'Marketplace', href: '/marketplace', icon: Store },
  { label: 'Stake', href: '/stake', icon: Coins },
  { label: 'Activity', href: '/activity', icon: Activity },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
];

/**
 * Global left rail on every (app) route. 200px wide, off-white,
 * hairline right border. Active item highlighted via pathname match.
 *
 * Bottom: Settings link + a compact wallet status card (avatar + addr + balance).
 */
export function AppSidebar() {
  const pathname = usePathname();
  const wallet = useActiveWallet();
  const profile = useUserProfile();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!wallet.publicKey) {
      setBalance(null);
      return;
    }
    const conn: Connection = getConnection();
    let cancelled = false;
    (async () => {
      try {
        const lamports = await conn.getBalance(wallet.publicKey!);
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        if (!cancelled) setBalance(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet.publicKey]);

  return (
    <aside className="flex h-screen w-[200px] flex-shrink-0 flex-col border-r border-border bg-background">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-5 py-5">
        <Hexagon size={20} className="text-primary" />
        <span className="text-[15px] font-semibold tracking-tight">VAVAWORLD</span>
      </Link>

      {/* Primary nav */}
      <nav className="flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground',
                active && 'bg-muted/70 text-foreground',
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto flex flex-col gap-2 px-3 pb-5">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Settings size={16} />
          Settings
        </Link>

        {wallet.ready && wallet.connected && (
          <Link
            href="/profile"
            className="flex items-center gap-2.5 rounded-md border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/60"
          >
            <Avatar className="h-6 w-6">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />}
              <AvatarFallback
                className="text-[9px] font-medium text-white"
                style={{ background: gradientFromAddr(wallet.address) }}
              >
                {(wallet.address ?? '').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium leading-tight">
                {profile.username ? `@${profile.username}` : shortAddr(wallet.address ?? '')}
              </span>
              <span className="truncate text-[10.5px] leading-tight tabular-nums text-muted-foreground">
                {balance !== null ? `${balance.toFixed(3)} SOL` : '— SOL'}
              </span>
            </div>
          </Link>
        )}

        {wallet.ready && !wallet.connected && (
          <Button size="sm" onClick={wallet.login} className="w-full h-8 text-xs font-medium">
            Connect
          </Button>
        )}
      </div>
    </aside>
  );
}
