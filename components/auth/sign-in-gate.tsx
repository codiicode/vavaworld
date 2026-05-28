'use client';

import { Mail, Wallet, Lock } from 'lucide-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
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
  const { setVisible: openWalletModal } = useWalletModal();

  if (!wallet.ready) {
    return <div className="min-h-screen" aria-hidden />;
  }
  if (wallet.connected) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] flex-col items-center justify-center px-4 py-6 md:px-8 md:py-8 2xl:px-10">
      <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/30 p-6 backdrop-blur-md md:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div
            className="grid h-11 w-11 flex-none place-items-center rounded-full"
            style={{
              background:
                'linear-gradient(135deg, rgba(94,234,212,0.30), rgba(56,189,248,0.20))',
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
          Your {label} is tied to a Solana wallet. Sign in with email, Google or
          X — we&apos;ll create an embedded wallet for you — or connect an
          existing Phantom, Solflare or Backpack wallet.
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
                Email · Google · X — we make a wallet for you
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openWalletModal(true)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-white transition-[filter] hover:brightness-105"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
              boxShadow: '0 6px 18px -8px rgba(20,184,166,0.6)',
            }}
          >
            <Wallet size={16} className="flex-none" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Connect wallet</div>
              <div className="text-[11.5px] text-white/85">
                Phantom · Solflare · Backpack
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
