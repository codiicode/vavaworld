'use client';

import { useActiveWallet } from '@/lib/active-wallet';
import { cn } from '@/lib/utils';

type Variant = 'sidebar' | 'inline';

/**
 * Single "Log in" entry point - one click straight into the Privy modal,
 * which itself offers email/Google/X and external wallets. No
 * intermediate picker: two choices before a login was one too many.
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

  // Solid white on the dark shell, matching the landing page's primary action.
  const glassClass =
    'inline-flex items-center justify-center rounded-[12px] font-semibold transition-all hover:-translate-y-px hover:shadow-[0_10px_28px_-10px_rgba(255,255,255,0.45)]';
  const solid = { background: '#ffffff', color: '#06080d' } as const;
  const triggerClass =
    variant === 'sidebar'
      ? `${glassClass} h-9 w-full text-[13px] font-medium`
      : `${glassClass} h-9 px-4 text-sm font-medium`;

  return (
    <button
      type="button"
      onClick={wallet.login}
      className={cn(triggerClass, className)}
      style={solid}
    >
      Log in
    </button>
  );
}
