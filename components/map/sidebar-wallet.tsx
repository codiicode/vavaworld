'use client';

import { ChevronDown, LogOut, Wallet } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useActiveWallet } from '@/lib/active-wallet';
import { useWalletBalance } from '@/lib/use-wallet-balance';

function shortAddr(addr: string): string {
  if (!addr) return '-';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/** Stable two-stop gradient derived from the first few address bytes. */
function gradientFromAddr(addr: string | null): string {
  if (!addr) return 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)';
  const h1 = (addr.charCodeAt(0) + addr.charCodeAt(1)) % 360;
  const h2 = (addr.charCodeAt(2) + addr.charCodeAt(3)) % 360;
  return `linear-gradient(135deg, hsl(${h1} 70% 60%) 0%, hsl(${h2} 70% 50%) 100%)`;
}

/**
 * Sidebar header: small Wallet icon + Connect button when signed out;
 * gradient avatar + truncated addr + balance + chevron when signed in.
 */
export function SidebarWallet() {
  const wallet = useActiveWallet();
  const { balance } = useWalletBalance(wallet.publicKey);

  if (!wallet.ready) {
    return <div className="h-[60px] border-b border-border" aria-hidden />;
  }

  if (!wallet.connected) {
    return (
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <Wallet size={16} className="text-muted-foreground" />
        <Button size="sm" onClick={wallet.login} className="h-8 px-3 text-xs font-medium">
          Connect
        </Button>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between border-b border-border px-5 py-4 text-left transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-2.5">
            <Avatar className="h-7 w-7">
              <AvatarFallback
                className="text-[10px] font-medium text-white"
                style={{ background: gradientFromAddr(wallet.address) }}
              >
                {(wallet.address ?? '').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight tabular-nums">
                {shortAddr(wallet.address ?? '')}
              </span>
              <span className="text-xs leading-tight tabular-nums text-muted-foreground">
                {balance !== null ? `${balance.toFixed(3)} SOL` : '- SOL'}
              </span>
            </div>
          </div>
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          onClick={() => wallet.logout()}
        >
          <LogOut size={14} />
          Disconnect
        </Button>
      </PopoverContent>
    </Popover>
  );
}
