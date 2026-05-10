'use client';

import { useMemo } from 'react';
import bs58 from 'bs58';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets as usePrivySolanaWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { useWallet as useAdapterWallet } from '@solana/wallet-adapter-react';
import { PublicKey, type Transaction, type VersionedTransaction } from '@solana/web3.js';
import { getConnection } from './anchor-client';

export type ActiveWalletSource = 'privy' | 'adapter' | null;

export type ActiveWallet = {
  source: ActiveWalletSource;
  publicKey: PublicKey | null;
  /** Address as base58 string, or null if not connected */
  address: string | null;
  /** Whether the SDK has finished hydrating from storage. Use this to avoid showing stale UI. */
  ready: boolean;
  /** Whether a wallet (any kind) is connected */
  connected: boolean;
  /** Sign and send a built transaction. Returns the signature string. */
  signAndSendTransaction: ((tx: Transaction | VersionedTransaction) => Promise<string>) | null;
  /** Open Privy login modal */
  login: () => void;
  /** Open Privy logout */
  logout: () => Promise<void>;
};

/**
 * Unified hook over both Privy embedded/social wallets and the Solana wallet-adapter.
 *
 * Privy takes priority if a Privy session is active. Wallet-adapter is the fallback
 * for power users who connect Phantom directly.
 */
export function useActiveWallet(): ActiveWallet {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets: privyWallets } = usePrivySolanaWallets();
  const { signAndSendTransaction: privySignAndSend } = useSignAndSendTransaction();
  const adapter = useAdapterWallet();

  const privyWallet = privyWallets[0] ?? null;
  // Only consider Privy connected once SDK is ready (hydrated from storage)
  const privyConnected = ready && authenticated && !!privyWallet;
  const adapterConnected = adapter.connected && !!adapter.publicKey;

  return useMemo<ActiveWallet>(() => {
    // Privy takes priority
    if (privyConnected && privyWallet) {
      const address = privyWallet.address;
      const publicKey = new PublicKey(address);
      return {
        source: 'privy',
        publicKey,
        address,
        ready: true,
        connected: true,
        signAndSendTransaction: async (tx) => {
          const connection = getConnection();
          const { signature } = await privySignAndSend({
            // @ts-expect-error - Privy accepts both legacy Transaction and VersionedTransaction
            transaction: tx,
            connection,
            address,
          });
          return typeof signature === 'string' ? signature : bs58.encode(signature);
        },
        login,
        logout,
      };
    }

    // Wallet-adapter fallback
    if (adapterConnected && adapter.publicKey) {
      return {
        source: 'adapter',
        publicKey: adapter.publicKey,
        address: adapter.publicKey.toBase58(),
        ready: true,
        connected: true,
        signAndSendTransaction: async (tx) => {
          const connection = getConnection();
          if (!adapter.sendTransaction) throw new Error('Wallet does not support sendTransaction');
          const signature = await adapter.sendTransaction(
            tx as Transaction,
            connection,
          );
          return signature;
        },
        login,
        logout,
      };
    }

    return {
      source: null,
      publicKey: null,
      address: null,
      // ready means the SDK has finished hydrating — only then can we trust "not connected"
      ready,
      connected: false,
      signAndSendTransaction: null,
      login,
      logout,
    };
  }, [ready, privyConnected, privyWallet, privySignAndSend, adapter, adapterConnected, login, logout]);
}
