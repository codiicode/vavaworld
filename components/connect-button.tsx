'use client';

import { Mail, Wallet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useActiveWallet } from '@/lib/active-wallet';
import { cn } from '@/lib/utils';

type Variant = 'sidebar' | 'inline';

/**
 * Single "Connect" entry-point with two paths underneath:
 *  - Email / Google / Twitter → Privy modal (creates an embedded Solana wallet)
 *  - Connect wallet           → wallet-adapter picker (Phantom / Solflare / Backpack)
 *
 * `variant='sidebar'` renders a compact button suited to the 200px app rail.
 * `variant='inline'` renders a full-size default Button (used in dialogs etc.).
 *
 * When already connected, renders nothing - callers show their own connected UI.
 */
export function ConnectButton({
  variant = 'inline',
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const wallet = useActiveWallet();

  if (!wallet.ready) return null;
  if (wallet.connected) return null;

  // Glass pill that matches the sidebar / sky background instead of the
  // default solid primary fill (which looked out of place against the panel).
  const glassClass =
    'inline-flex items-center justify-center rounded-[12px] border border-white/40 bg-white/30 text-foreground backdrop-blur-md transition-colors hover:bg-white/45 hover:text-foreground';
  const triggerClass =
    variant === 'sidebar'
      ? `${glassClass} h-9 w-full text-[13px] font-medium`
      : `${glassClass} h-9 px-4 text-sm font-medium`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn(triggerClass, className)}>
          Connect
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <button
          type="button"
          onClick={wallet.login}
          className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted"
        >
          <Mail size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Sign in</span>
            <span className="text-[11px] text-muted-foreground">
              Email, Google, or X - we make a wallet for you
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={wallet.openWalletModal}
          className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted"
        >
          <Wallet size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Connect wallet</span>
            <span className="text-[11px] text-muted-foreground">
              Phantom, Solflare, Backpack
            </span>
          </div>
        </button>
      </PopoverContent>
    </Popover>
  );
}
