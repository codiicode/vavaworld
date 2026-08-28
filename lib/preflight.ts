import {
  Connection,
  PublicKey,
  Transaction,
  type VersionedTransaction,
} from '@solana/web3.js';

/**
 * Pre-flight a transaction before handing it to the wallet, so a
 * doomed transaction never reaches Phantom (a failed simulation there
 * triggers the scary "This dApp could be malicious" warning). We do
 * two cheap checks:
 *
 *  1. Balance guard - the fee payer must cover lamportsNeeded plus a
 *     fee/rent cushion. Empty embedded wallets (fresh email/Google
 *     signups) are the common case; we catch them with a clear message
 *     instead of a wallet-level red flag.
 *  2. Simulation - run the exact transaction with sigVerify:false
 *     (Phantom's own recommendation) and surface a friendly error if
 *     it would fail on-chain.
 *
 * Throws a PreflightError with a human message on failure.
 */

export class PreflightError extends Error {}

const FEE_CUSHION_LAMPORTS = 5_000; // one signature + headroom

export async function preflight(args: {
  connection: Connection;
  feePayer: PublicKey;
  tx: Transaction;
  lamportsNeeded?: number;
}): Promise<void> {
  const { connection, feePayer, tx, lamportsNeeded = 0 } = args;

  // 1. Balance guard.
  const balance = await connection.getBalance(feePayer, 'confirmed');
  const required = lamportsNeeded + FEE_CUSHION_LAMPORTS;
  if (balance < required) {
    const short = (required - balance) / 1e9;
    throw new PreflightError(
      `Not enough SOL in your wallet. You need about ${short.toFixed(4)} more SOL to cover this${
        lamportsNeeded > 0 ? ' purchase' : ' transaction'
      } plus the network fee.`,
    );
  }

  // 2. Simulation (Phantom recommends sigVerify:false pre-check).
  if (!tx.recentBlockhash) {
    tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  }
  if (!tx.feePayer) tx.feePayer = feePayer;

  const sim = await connection.simulateTransaction(tx);
  if (sim.value.err) {
    const logs = sim.value.logs ?? [];
    const insufficient = logs.some((l) => /insufficient (lamports|funds)/i.test(l));
    throw new PreflightError(
      insufficient
        ? 'Not enough SOL to complete this transaction.'
        : 'This transaction would fail on-chain. Please try again in a moment.',
    );
  }
}

/** Preflight for a VersionedTransaction (not used yet, kept symmetric). */
export async function preflightVersioned(
  connection: Connection,
  feePayer: PublicKey,
  tx: VersionedTransaction,
  lamportsNeeded = 0,
): Promise<void> {
  const balance = await connection.getBalance(feePayer, 'confirmed');
  if (balance < lamportsNeeded + FEE_CUSHION_LAMPORTS) {
    throw new PreflightError('Not enough SOL in your wallet for this transaction.');
  }
  const sim = await connection.simulateTransaction(tx, { sigVerify: false });
  if (sim.value.err) {
    throw new PreflightError('This transaction would fail on-chain. Please try again.');
  }
}
