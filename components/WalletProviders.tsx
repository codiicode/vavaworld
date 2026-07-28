'use client';

import { useMemo, type ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  CoinbaseWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

/**
 * Wallet-standard wallets (Phantom, Solflare, Backpack, Glow, OKX, etc.)
 * auto-register themselves when their browser extension is installed - they'll
 * appear in the picker without any explicit adapter listing. We list only a
 * few popular names so they also show with a "Not installed" link; the long
 * tail (Torus/Ledger/Trezor/etc.) each drags in a heavy SDK into the bundle on
 * EVERY page for marginal coverage, so they're intentionally omitted.
 */
export function WalletProviders({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl('devnet'),
    [],
  );
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    [],
  );
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
