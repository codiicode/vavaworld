'use client';

import { PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, BN, type Idl, type Wallet } from '@coral-xyz/anchor';
import idl from './anchor-idl.json';
import { getConnection } from './anchor-client';
import { preflight } from './preflight';
import type { ActiveWallet } from './wallet-context';

/**
 * On-chain bid escrow. Placing a bid locks the offered SOL in a program
 * PDA immediately; accept settles seller/treasury and flips the tile in
 * one atomic transaction; decline/cancel refund by closing the escrow.
 * After each confirmed transaction the caller mirrors to the database
 * via /api/bids (place) or /api/bids/respond (accept/decline/cancel).
 */

const PROGRAM_ID = new PublicKey((idl as { address: string }).address);
const TREASURY = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY ?? '74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X',
);

function readProgram(): Program {
  const connection = getConnection();
  const dummy = {
    publicKey: PublicKey.default,
    signTransaction: async (t: unknown) => t,
    signAllTransactions: async (t: unknown) => t,
  } as unknown as Wallet;
  return new Program(idl as Idl, new AnchorProvider(connection, dummy, {}));
}

function h3ToBn(h3Hex: string): BN {
  return new BN(h3Hex, 16);
}

export function bidEscrowPda(h3Hex: string, bidder: PublicKey): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt('0x' + h3Hex));
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bid'), buf, bidder.toBuffer()],
    PROGRAM_ID,
  )[0];
}

function tilePdaOf(h3Hex: string): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt('0x' + h3Hex));
  return PublicKey.findProgramAddressSync([Buffer.from('tile'), buf], PROGRAM_ID)[0];
}

function stakePdaOf(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('stake'), owner.toBuffer()], PROGRAM_ID)[0];
}

async function sendTx(
  wallet: ActiveWallet,
  buildIx: (program: Program, signer: PublicKey) => Promise<Transaction>,
  lamportsNeeded?: number,
): Promise<string> {
  if (!wallet.publicKey || !wallet.signAndSendTransaction) {
    throw new Error('Connect a wallet first');
  }
  const connection = getConnection();
  const signer = new PublicKey(wallet.publicKey.toString());
  const tx = await buildIx(readProgram(), signer);
  tx.feePayer = signer;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  await preflight({ connection, feePayer: signer, tx, lamportsNeeded });
  const sig = await wallet.signAndSendTransaction(tx);
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

async function mirror(path: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    // The chain transaction already succeeded - surface the mirror
    // failure but with that context.
    throw new Error(j.error ? `Settled on-chain, sync failed: ${j.error}` : 'Settled on-chain, sync failed');
  }
}

/** Lock `lamports` in the bid escrow and notify the owner. */
export async function placeBidOnChain(args: {
  wallet: ActiveWallet;
  h3: string;
  lamports: number;
}): Promise<void> {
  const { wallet, h3, lamports } = args;
  const bidderPk = new PublicKey(wallet.publicKey!.toString());
  await sendTx(
    wallet,
    async (program, signer) => {
      const ix = await program.methods
        .placeBid(h3ToBn(h3), new BN(lamports))
        .accounts({
          bidder: signer,
          tile: tilePdaOf(h3),
          bidEscrow: bidEscrowPda(h3, signer),
        })
        .instruction();
      return new Transaction().add(ix);
    },
    lamports + 3_000_000, // escrow rent + fee margin
  );
  await mirror('/api/bids', { h3, bidder: bidderPk.toBase58() });
}

/** Withdraw own bid - escrow closes, full refund. */
export async function cancelBidOnChain(args: {
  wallet: ActiveWallet;
  h3: string;
  bidId: string;
}): Promise<void> {
  const { wallet, h3, bidId } = args;
  const sig = await sendTx(wallet, async (program, signer) => {
    const ix = await program.methods
      .cancelBid(h3ToBn(h3))
      .accounts({ bidder: signer, bidEscrow: bidEscrowPda(h3, signer) })
      .instruction();
    return new Transaction().add(ix);
  });
  await mirror('/api/bids/respond', { bidId, txSig: sig });
}

/** Owner declines - bidder auto-refunded on-chain. */
export async function declineBidOnChain(args: {
  wallet: ActiveWallet;
  h3: string;
  bidId: string;
  bidder: string;
}): Promise<void> {
  const { wallet, h3, bidId, bidder } = args;
  const bidderPk = new PublicKey(bidder);
  const sig = await sendTx(wallet, async (program, signer) => {
    const ix = await program.methods
      .declineBid(h3ToBn(h3))
      .accounts({
        owner: signer,
        tile: tilePdaOf(h3),
        bidder: bidderPk,
        bidEscrow: bidEscrowPda(h3, bidderPk),
      })
      .instruction();
    return new Transaction().add(ix);
  });
  await mirror('/api/bids/respond', { bidId, txSig: sig });
}

/**
 * Owner accepts - one atomic transaction: escrow splits 95/5 (97/3 for
 * baron-staked sellers) between seller and treasury, and the tile flips
 * to the bidder.
 */
export async function acceptBidOnChain(args: {
  wallet: ActiveWallet;
  h3: string;
  bidId: string;
  bidder: string;
}): Promise<void> {
  const { wallet, h3, bidId, bidder } = args;
  const bidderPk = new PublicKey(bidder);
  const sig = await sendTx(wallet, async (program, signer) => {
    const ix = await program.methods
      .acceptBid(h3ToBn(h3))
      .accounts({
        owner: signer,
        tile: tilePdaOf(h3),
        bidder: bidderPk,
        bidEscrow: bidEscrowPda(h3, bidderPk),
        treasury: TREASURY,
        sellerStake: stakePdaOf(signer),
      })
      .instruction();
    return new Transaction().add(ix);
  });
  await mirror('/api/bids/respond', { bidId, txSig: sig });
}
