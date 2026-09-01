'use client';

import { useEffect, useMemo, useRef } from 'react';
import bs58 from 'bs58';
import { usePrivy } from '@privy-io/react-auth';
import {
  useWallets as usePrivySolanaWallets,
  useSignAndSendTransaction,
  useSignMessage,
  useExportWallet,
} from '@privy-io/react-auth/solana';
import { useWallet as useAdapterWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getConnection } from '@/lib/anchor-client';
import { useWalletPublish, type ActiveWallet } from '@/lib/wallet-context';

/** Privy v3 wants raw bytes - serialize whatever Transaction subtype we're given.
 *  Uses duck-typing (`'version' in tx`) rather than `instanceof` to survive cross-chunk
 *  class-identity issues in production bundles. Wraps the result in a fresh `Uint8Array`
 *  so we pass a native typed array (legacy `Transaction.serialize` returns a Buffer). */
function serializeTx(tx: Transaction | VersionedTransaction): Uint8Array {
  if ('version' in tx && typeof tx.version === 'number') {
    return new Uint8Array((tx as VersionedTransaction).serialize());
  }
  return new Uint8Array(
    (tx as Transaction).serialize({ requireAllSignatures: false, verifySignatures: false }),
  );
}

/** Which Solana cluster does our app's RPC point at? Privy needs this to scope its sign. */
function inferSolanaChain(): 'solana:mainnet' | 'solana:devnet' | 'solana:testnet' {
  const url = process.env.NEXT_PUBLIC_RPC_URL ?? '';
  if (url.includes('devnet')) return 'solana:devnet';
  if (url.includes('testnet')) return 'solana:testnet';
  return 'solana:mainnet';
}

/**
 * Runs INSIDE the Privy + wallet-adapter provider tree and mirrors the
 * unified wallet state into the light context shim that the rest of the
 * app reads. Renders nothing.
 *
 * Privy takes priority if a Privy session is active. Wallet-adapter is the
 * fallback for power users who connect Phantom directly.
 */
export function WalletBridge() {
  const { ready, authenticated, login, logout, user, linkTwitter, unlinkTwitter, getAccessToken } =
    usePrivy();
  const { wallets: privyWallets } = usePrivySolanaWallets();
  const { signAndSendTransaction: privySignAndSend } = useSignAndSendTransaction();
  const { signMessage: privySignMessage } = useSignMessage();
  const { exportWallet } = useExportWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const adapter = useAdapterWallet();
  const publish = useWalletPublish();

  const privyWallet = privyWallets[0] ?? null;
  // Only consider Privy connected once SDK is ready (hydrated from storage)
  const privyConnected = ready && authenticated && !!privyWallet;
  const adapterConnected = adapter.connected && !!adapter.publicKey;

  const wallet = useMemo<ActiveWallet>(() => {
    const openWalletModal = () => setWalletModalVisible(true);

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
          try {
            const result = await privySignAndSend({
              transaction: serializeTx(tx),
              wallet: privyWallet,
              chain: inferSolanaChain(),
            });
            const sig = result?.signature;
            if (!sig) throw new Error('Privy returned no signature');
            return typeof sig === 'string' ? sig : bs58.encode(sig);
          } catch (e) {
            console.error('[wallet-bridge] Privy signAndSendTransaction failed:', e);
            throw e;
          }
        },
        signAllTransactions: null,
        signMessage: async (message) => {
          const result = await privySignMessage({
            message,
            wallet: privyWallet,
            chain: inferSolanaChain(),
          } as never);
          const sig = (result as { signature?: Uint8Array | string })?.signature ?? result;
          if (typeof sig === 'string') return bs58.decode(sig);
          if (sig instanceof Uint8Array) return sig;
          throw new Error('Privy returned no signature');
        },
        login,
        logout,
        openWalletModal,
        exportWallet: async (addr: string) => {
          await exportWallet({ address: addr });
        },
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
          const signature = await adapter.sendTransaction(tx as Transaction, connection);
          return signature;
        },
        signAllTransactions: adapter.signAllTransactions
          ? async (txs) => (await adapter.signAllTransactions!(txs)) as Transaction[]
          : null,
        signMessage: adapter.signMessage
          ? async (message) => adapter.signMessage!(message)
          : null,
        login,
        // Adapter wallets disconnect via the adapter, not Privy.
        logout: async () => {
          await adapter.disconnect();
        },
        openWalletModal,
        exportWallet: null,
      };
    }

    return {
      source: null,
      publicKey: null,
      address: null,
      // ready means the SDK has finished hydrating - only then can we trust "not connected"
      ready,
      connected: false,
      signAndSendTransaction: null,
      signAllTransactions: null,
      signMessage: null,
      login,
      logout,
      openWalletModal,
      exportWallet: null,
    };
  }, [
    ready,
    privyConnected,
    privyWallet,
    privySignAndSend,
    privySignMessage,
    adapter,
    adapterConnected,
    login,
    logout,
    exportWallet,
    setWalletModalVisible,
  ]);

  // Publishing writes provider state, which re-renders this bridge (it is a
  // context consumer) - so publishing keyed on OBJECT IDENTITY loops forever
  // (React #185): every render builds new objects. Instead: keep the latest
  // wallet in a ref, publish a snapshot whose methods delegate through the
  // ref (so consumers always hit the live SDK closures), and re-publish only
  // when the connection's identity-stable facts change.
  const latestRef = useRef(wallet);
  latestRef.current = wallet;
  const userRef = useRef(user ?? null);
  userRef.current = user ?? null;
  // Privy hook functions are identity-unstable across renders - publish
  // stable wrappers that delegate through a ref (same pattern as wallet).
  const privyFnsRef = useRef({ linkTwitter, unlinkTwitter, getAccessToken });
  privyFnsRef.current = { linkTwitter, unlinkTwitter, getAccessToken };

  const source = wallet.source;
  const address = wallet.address;
  const connected = wallet.connected;
  const walletReady = wallet.ready;
  const canSign = !!wallet.signAndSendTransaction;
  const canSignAll = !!wallet.signAllTransactions;
  const canSignMsg = !!wallet.signMessage;
  const canExport = !!wallet.exportWallet;
  const userId = user?.id ?? null;

  useEffect(() => {
    const live = latestRef.current;
    const snapshot: ActiveWallet = {
      source,
      publicKey: live.publicKey,
      address,
      ready: walletReady,
      connected,
      signAndSendTransaction: canSign
        ? (tx) => latestRef.current.signAndSendTransaction!(tx)
        : null,
      signAllTransactions: canSignAll
        ? (txs) => latestRef.current.signAllTransactions!(txs)
        : null,
      signMessage: canSignMsg ? (m) => latestRef.current.signMessage!(m) : null,
      login: () => latestRef.current.login(),
      logout: () => latestRef.current.logout(),
      openWalletModal: () => latestRef.current.openWalletModal(),
      exportWallet: canExport ? (a) => latestRef.current.exportWallet!(a) : null,
    };
    publish({
      wallet: snapshot,
      privy: {
        user: userRef.current,
        ready,
        linkTwitter: () => privyFnsRef.current.linkTwitter(),
        unlinkTwitter: (subject: string) => privyFnsRef.current.unlinkTwitter(subject),
        getAccessToken: () => privyFnsRef.current.getAccessToken(),
      },
    });
  }, [
    publish,
    source,
    address,
    connected,
    walletReady,
    canSign,
    canSignAll,
    canSignMsg,
    canExport,
    ready,
    userId,
  ]);

  return null;
}
