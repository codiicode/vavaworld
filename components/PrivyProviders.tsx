'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { useMemo, type ReactNode } from 'react';

/**
 * Wraps Privy with our Solana RPC configuration. Without `solana.rpcs[<chain>]`,
 * Privy v3 throws "No RPC configuration found for chain solana:devnet" the moment
 * we try to sign + send a transaction.
 *
 * Builds the WSS URL from the HTTPS env var so both endpoints share the same
 * Helius API key.
 */
function buildRpcs(httpsUrl: string) {
  // wss equivalent of https://devnet.helius-rpc.com/?api-key=... is
  // wss://devnet.helius-rpc.com/?api-key=... - Helius accepts both subprotocols
  // on the same host. Public RPC also supports `wss://api.devnet.solana.com`.
  const wssUrl = httpsUrl.replace(/^https?:\/\//, 'wss://');

  // Pick the chain from the URL - same heuristic as inferSolanaChain() in active-wallet.
  const chain: 'solana:mainnet' | 'solana:devnet' | 'solana:testnet' =
    httpsUrl.includes('devnet') ? 'solana:devnet' :
    httpsUrl.includes('testnet') ? 'solana:testnet' :
    'solana:mainnet';

  return {
    [chain]: {
      rpc: createSolanaRpc(httpsUrl),
      rpcSubscriptions: createSolanaRpcSubscriptions(wssUrl),
      blockExplorerUrl:
        chain === 'solana:devnet'
          ? 'https://explorer.solana.com/?cluster=devnet'
          : 'https://explorer.solana.com',
    },
  };
}

export function PrivyProviders({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com';

  // Memoize so we don't re-create RPC clients on every render (they hold sockets).
  const rpcs = useMemo(() => buildRpcs(rpcUrl), [rpcUrl]);

  // During server-side prerender (and missing-env scenarios) skip the provider
  // so the build doesn't crash. The runtime client will pick up the env var.
  if (!appId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // External wallets (Phantom etc.) live outside Privy - see ConnectButton.
        loginMethods: ['email', 'google', 'twitter'],
        appearance: {
          theme: 'light',
          accentColor: '#14b8a6',
          logo: '/vavaworld-sphere.jpg',
          landingHeader: 'Welcome to VAVAWORLD',
          showWalletLoginFirst: false,
          walletChainType: 'solana-only',
        },
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        solana: { rpcs },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
