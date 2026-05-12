'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import type { ReactNode } from 'react';

export function PrivyProviders({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // During server-side prerender (and missing-env scenarios) skip the provider
  // so the build doesn't crash. The runtime client will pick up the env var.
  if (!appId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // External wallets (Phantom etc.) live outside Privy — see ConnectButton.
        loginMethods: ['email', 'google', 'twitter'],
        appearance: {
          theme: 'light',
          accentColor: '#7CBFEC',
          logo: '/vavaworld-mark.svg',
          landingHeader: 'Welcome to VAVAWORLD',
          showWalletLoginFirst: false,
          walletChainType: 'solana-only',
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
