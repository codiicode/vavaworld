'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { type ReactNode } from 'react';
import { robinhoodChain } from '@/lib/evm';

/**
 * Privy in EVM mode for Robinhood Chain. One Log in button covers social
 * (email/Google/X -> embedded wallet) AND external wallets (MetaMask,
 * Rabby, Coinbase Wallet, ...) inside the same modal. The chain config
 * makes Privy default every wallet to Robinhood Chain.
 */
export function PrivyProviders({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // During server-side prerender (and missing-env scenarios) skip the provider
  // so the build doesn't crash. The runtime client will pick up the env var.
  if (!appId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'google', 'twitter', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#7db4f5',
          logo: '/logo-globe-white.png',
          landingHeader: 'Welcome to VAVAWORLD',
          showWalletLoginFirst: false,
          walletChainType: 'ethereum-only',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: robinhoodChain,
        supportedChains: [robinhoodChain],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
