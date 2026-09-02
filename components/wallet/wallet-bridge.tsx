'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  usePrivy,
  useWallets,
  type ConnectedWallet,
} from '@privy-io/react-auth';
import { createWalletClient, custom, type WalletClient } from 'viem';
import { getPublicClient, robinhoodChain } from '@/lib/evm';
import { useWalletPublish, type ActiveWallet, type WriteCall } from '@/lib/wallet-context';

/**
 * Runs INSIDE the Privy provider tree and mirrors the unified wallet state
 * into the light context shim that the rest of the app reads. Renders
 * nothing.
 *
 * EVM edition: Privy is the ONLY wallet path - its modal covers social
 * login (embedded wallet) AND external wallets (MetaMask/Rabby/etc), so
 * the separate wallet-adapter stack from the Solana build is gone.
 */

async function walletClientFor(wallet: ConnectedWallet): Promise<WalletClient> {
  // External wallets may sit on another chain - switch before writing.
  try {
    await wallet.switchChain(robinhoodChain.id);
  } catch {
    /* embedded wallets are already on the configured chain */
  }
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({ chain: robinhoodChain, transport: custom(provider) });
}

export function WalletBridge() {
  const { ready, authenticated, login, logout, user, linkTwitter, unlinkTwitter, getAccessToken, exportWallet } =
    usePrivy();
  const { wallets } = useWallets();
  const publish = useWalletPublish();

  const wallet = wallets[0] ?? null;
  const connected = ready && authenticated && !!wallet;
  const address = (connected && wallet ? wallet.address : null) as `0x${string}` | null;

  const live = useMemo<ActiveWallet>(() => {
    const base = {
      source: connected ? ('privy' as const) : null,
      address,
      ready,
      connected,
      login,
      logout,
      openWalletModal: login,
      exportWallet: connected ? async () => exportWallet() : null,
    };
    if (!connected || !wallet) {
      return { ...base, writeContract: null, signMessage: null };
    }
    return {
      ...base,
      writeContract: async (call: WriteCall) => {
        const client = await walletClientFor(wallet);
        const account = wallet.address as `0x${string}`;
        // Pre-fill gas + fees through our retrying/fallback public client.
        // Left to the wallet provider, these become bare reads against the
        // public RPC and die on launch-day rate limits mid-purchase. If
        // even the resilient path fails, fall back to provider-side fill.
        let gas: bigint | undefined;
        let fees: { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint } | undefined;
        try {
          const pub = getPublicClient();
          gas = await pub.estimateContractGas({ ...call, account } as never);
          fees = await pub.estimateFeesPerGas();
        } catch {
          /* provider fills them */
        }
        return client.writeContract({
          ...call,
          chain: robinhoodChain,
          account,
          ...(gas ? { gas: (gas * 12n) / 10n } : {}),
          ...(fees?.maxFeePerGas
            ? { maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas }
            : {}),
          // Loose WriteCall -> viem's exhaustive generic; runtime shape is right.
        } as Parameters<typeof client.writeContract>[0]);
      },
      signMessage: async (message: string) => {
        const client = await walletClientFor(wallet);
        return client.signMessage({
          account: wallet.address as `0x${string}`,
          message,
        });
      },
    };
  }, [connected, wallet, address, ready, login, logout, exportWallet]);

  // Publishing writes provider state, which re-renders this bridge - so
  // publishing keyed on OBJECT IDENTITY loops forever (React #185). Keep
  // the latest wallet in a ref, publish a snapshot whose methods delegate
  // through the ref, and re-publish only on identity-stable facts.
  const latestRef = useRef(live);
  latestRef.current = live;
  const userRef = useRef(user ?? null);
  userRef.current = user ?? null;
  const privyFnsRef = useRef({ linkTwitter, unlinkTwitter, getAccessToken });
  privyFnsRef.current = { linkTwitter, unlinkTwitter, getAccessToken };

  const canWrite = !!live.writeContract;
  const canSignMsg = !!live.signMessage;
  const canExport = !!live.exportWallet;
  const userId = user?.id ?? null;

  useEffect(() => {
    const snapshot: ActiveWallet = {
      source: connected ? 'privy' : null,
      address,
      ready,
      connected,
      writeContract: canWrite ? (c) => latestRef.current.writeContract!(c) : null,
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
  }, [publish, connected, address, ready, canWrite, canSignMsg, canExport, userId]);

  return null;
}
