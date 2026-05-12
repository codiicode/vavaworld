'use client';

import { Mail, Wallet } from 'lucide-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
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
 * When already connected, renders nothing — callers show their own connected UI.
 */
export function ConnectButton({
  variant = 'inline',
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const wallet = useActiveWallet();
  const { setVisible } = useWalletModal();

  if (!wallet.ready) return null;
  if (wallet.connected) return null;

  const triggerClass =
    variant === 'sidebar' ? 'h-8 w-full text-xs font-medium' : 'h-9 text-sm font-medium';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size={variant === 'sidebar' ? 'sm' : 'default'} className={cn(triggerClass, className)}>
          Connect
        </Button>
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
              Email, Google, or X — we make a wallet for you
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setVisible(true)}
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
