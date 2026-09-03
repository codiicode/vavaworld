'use client';

import { useCallback } from 'react';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
  useCreateWallet,
} from '@privy-io/react-auth/solana';
import { Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { buildPaymentTransaction } from './solana-tx';
import { resilientFetch } from './resilient-fetch';
import {
  SOLANA_CLUSTER,
  SOLANA_PAY_ENABLED,
  SOLANA_RPC_URL,
  type ForeignCurrency,
} from './solana-pay-config';

/** The `foreign` block /api/quote and /api/foreign-quote return. */
export type ForeignQuote = {
  paymentId: string;
  currency: ForeignCurrency;
  amountUnits: string;
  treasury: string;
  memo: string;
  usd: number;
  expiresAt: number;
};

export type SolanaPayPhase = 'signing' | 'verifying' | 'funding';

export type SolanaPay = {
  ready: boolean;
  address: string | null;
  pay: (q: ForeignQuote, onPhase?: (p: SolanaPayPhase) => void) => Promise<{ signature: string; fundTx: string }>;
};

/**
 * Pays a foreign quote from the user's Privy Solana wallet, then waits for
 * the server to verify the transfer and fund the EVM wallet. Resolves once
 * the ETH leg has landed - the caller then runs the normal on-chain action
 * (claim / buy / placeBid) from the EVM wallet as if the user paid in ETH.
 */
function useSolanaPayLive(): SolanaPay {
  const { wallets, ready } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { createWallet } = useCreateWallet();
  const wallet = wallets[0] ?? null;

  const pay = useCallback<SolanaPay['pay']>(
    async (q, onPhase) => {
      // Users who logged in before Solana wallets were switched on get one
      // created on the spot.
      const w = wallet ?? (await createWallet().then(() => null));
      const solWallet = w ?? wallets[0];
      if (!solWallet) throw new Error('Your Solana wallet is still being created - try again in a moment');

      onPhase?.('signing');
      const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
      const { blockhash } = await conn.getLatestBlockhash('confirmed');
      const tx = buildPaymentTransaction({
        payer: solWallet.address,
        treasury: q.treasury,
        currency: q.currency,
        amountUnits: BigInt(q.amountUnits),
        memo: q.memo,
        recentBlockhash: blockhash,
      });
      const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

      const { signature } = await signAndSendTransaction({
        transaction: new Uint8Array(serialized),
        wallet: solWallet,
        chain: `solana:${SOLANA_CLUSTER}`,
      });
      const sig = bs58.encode(signature);

      onPhase?.('verifying');
      // Finalization takes ~10-20s; the server answers 202 until then.
      for (let attempt = 0; attempt < 45; attempt++) {
        const r = await resilientFetch('/api/solana-pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: q.paymentId, signature: sig }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok) return { signature: sig, fundTx: j.fundTx };
        if (r.status === 202) {
          if (attempt === 6) onPhase?.('funding');
          await new Promise((res) => setTimeout(res, 2000));
          continue;
        }
        throw new Error(j.error ?? 'Payment could not be verified');
      }
      throw new Error(
        'Your payment is confirmed on Solana but settlement is slow - it completes automatically, check back in a minute',
      );
    },
    [wallet, wallets, signAndSendTransaction, createWallet],
  );

  return { ready, address: wallet?.address ?? null, pay };
}

/**
 * With the rail switched off the Privy Solana hooks must not even be
 * called - without a Solana config in the provider they read a null
 * connectors context and crash the page. The flag is a build-time
 * constant, so picking the implementation once at module load keeps hook
 * order stable across renders.
 */
function useSolanaPayDisabled(): SolanaPay {
  const pay = useCallback<SolanaPay['pay']>(async () => {
    throw new Error('Solana payments are not enabled');
  }, []);
  return { ready: false, address: null, pay };
}

const useSolanaPayImpl = SOLANA_PAY_ENABLED ? useSolanaPayLive : useSolanaPayDisabled;

export function useSolanaPay(): SolanaPay {
  return useSolanaPayImpl();
}
