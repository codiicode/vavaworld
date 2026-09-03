'use client';

import { useCallback } from 'react';
import {
  useWallets as useSolanaWallets,
  useSignAndSendTransaction,
  useCreateWallet,
} from '@privy-io/react-auth/solana';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { resilientFetch } from './resilient-fetch';
import {
  MEMO_PROGRAM_ID,
  SOLANA_CLUSTER,
  SOLANA_RPC_URL,
  USDC_MINT,
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

/**
 * Pays a foreign quote from the user's Privy Solana wallet, then waits for
 * the server to verify the transfer and fund the EVM wallet. Resolves once
 * the ETH leg has landed - the caller then runs the normal on-chain action
 * (claim / buy / placeBid) from the EVM wallet as if the user paid in ETH.
 */
export function useSolanaPay() {
  const { wallets, ready } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { createWallet } = useCreateWallet();
  const wallet = wallets[0] ?? null;

  const pay = useCallback(
    async (q: ForeignQuote, onPhase?: (p: SolanaPayPhase) => void): Promise<{ signature: string; fundTx: string }> => {
      // Users who logged in before Solana wallets were switched on get one
      // created on the spot.
      const w = wallet ?? (await createWallet().then(() => null));
      const solWallet = w ?? wallets[0];
      if (!solWallet) throw new Error('Your Solana wallet is still being created - try again in a moment');

      onPhase?.('signing');
      const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
      const payer = new PublicKey(solWallet.address);
      const treasury = new PublicKey(q.treasury);
      const amount = BigInt(q.amountUnits);
      const tx = new Transaction();
      if (q.currency === 'sol') {
        tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: treasury, lamports: amount }));
      } else {
        const mint = new PublicKey(USDC_MINT);
        const from = getAssociatedTokenAddressSync(mint, payer);
        const to = getAssociatedTokenAddressSync(mint, treasury);
        // Idempotent create so a fresh treasury (no USDC account yet) can't
        // make the first payment fail.
        tx.add(createAssociatedTokenAccountIdempotentInstruction(payer, to, treasury, mint));
        tx.add(createTransferInstruction(from, to, payer, amount));
      }
      tx.add(
        new TransactionInstruction({
          keys: [],
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: Buffer.from(q.memo, 'utf8'),
        }),
      );
      const { blockhash } = await conn.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer;
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
