'use client';

import { Mail, Lock } from 'lucide-react';
import { useActiveWallet } from '@/lib/active-wallet';

/**
 * Wraps an authenticated page. If the user has no wallet connected, renders a
 * centred glass card with two CTAs:
 *   • Log in        → Privy modal (email / Google / X → embedded wallet)
 *   • Connect wallet → wallet-adapter picker (Phantom / Solflare / Backpack)
 *
 * While the wallet SDK is still hydrating we render nothing so a connected
 * session doesn't briefly flash the gate.
 */
export function SignInGate({
  label,
  children,
}: {
  /** Lowercase noun for the heading, e.g. "portfolio" / "profile". */
  label: string;
  children: React.ReactNode;
}) {
  const wallet = useActiveWallet();
  
  if (!wallet.ready) {
    return <div className="min-h-screen" aria-hidden />;
  }
  if (wallet.connected) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-6 md:px-8 md:py-8">
      <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/30 p-6 backdrop-blur-md md:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div
            className="grid h-11 w-11 flex-none place-items-center rounded-full"
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.16))',
              border: '1px solid rgba(255,255,255,0.45)',
            }}
          >
            <Lock size={18} strokeWidth={1.8} className="text-foreground" />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
              Sign in
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Sign in to view your {label}
            </h1>
          </div>
        </div>
        <p className="mb-5 text-sm leading-relaxed text-foreground/70">
          Your {label} is tied to your wallet. Log in with email, Google, X
          or a wallet like MetaMask - one button, everything inside.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => wallet.login()}
            className="flex items-center gap-3 rounded-xl border border-white/45 bg-white/40 px-4 py-3 text-left transition-colors hover:bg-white/55"
          >
            <Mail size={16} className="flex-none text-foreground/65" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">
                Log in
              </div>
              <div className="text-[11.5px] text-foreground/60">
                Email · Google · X · MetaMask
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
