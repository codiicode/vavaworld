'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { type ReactNode } from 'react';
import { robinhoodChain } from '@/lib/evm';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { SOLANA_PAY_ENABLED } from '@/lib/solana-pay-config';

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
          // Installed browser wallets (EIP-6963) surface first with a
          // "detected" badge; the named entries are the fallback list.
          walletList: [
            'detected_ethereum_wallets',
            'metamask',
            'rabby_wallet',
            'coinbase_wallet',
            'wallet_connect',
          ],
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
          // The Solana rail pays from an embedded Solana wallet - still no
          // external connects, the same login covers both chains.
          ...(SOLANA_PAY_ENABLED
            ? { solana: { createOnLogin: 'users-without-wallets' as const } }
            : {}),
          // Email/social users already consented by logging in; the app's
          // own review step is the confirmation. External wallets
          // (MetaMask etc.) keep their native prompt - that is theirs.
          showWalletUIs: false,
        },
        defaultChain: robinhoodChain,
        supportedChains: [robinhoodChain],
        // Privy's Solana hooks read `externalWallets.solana.connectors`
        // even for embedded wallets; without it they dereference null.
        // We never show external Solana wallets, but the context must exist.
        ...(SOLANA_PAY_ENABLED
          ? { externalWallets: { solana: { connectors: toSolanaWalletConnectors() } } }
          : {}),
      }}
    >
      {children}
    </PrivyProvider>
  );
}
