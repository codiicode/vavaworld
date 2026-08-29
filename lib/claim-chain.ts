'use client';

import {
  ComputeBudgetProgram,
  Ed25519Program,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import bs58 from 'bs58';
import idl from './anchor-idl.json';

/**
 * On-chain primary-claim settlement. One quote from /api/quote authorizes
 * exactly one program transaction: [ed25519 keeper signature, claim].
 * The program splits the quoted price 85/15 (treasury / buyback escrow),
 * creates the Tile PDAs and rejects anything without a valid quote.
 */

export const PROGRAM_ID = new PublicKey((idl as { address: string }).address);
/** Keep in sync with /api/quote MAX_PER_QUOTE (and program MAX_TILES_PER_TX). */
export const CLAIM_CHUNK = 10;

export type ClaimQuote = {
  h3s: string[];
  perHexUsd: number[];
  pricesLamports: string[];
  totalLamports: string;
  totalUsd: number;
  solUsd: number;
  expiry: string;
  messageHash: string;
  signature: string;
  keeper: string;
};

export function chunkHexes(h3s: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < h3s.length; i += CLAIM_CHUNK) out.push(h3s.slice(i, i + CLAIM_CHUNK));
  return out;
}

export async function fetchQuote(h3s: string[], claimer: string): Promise<ClaimQuote> {
  const r = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ h3s, claimer }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? 'quote failed');
  return j as ClaimQuote;
}

export function tilePda(h3: string): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt('0x' + h3));
  return PublicKey.findProgramAddressSync([Buffer.from('tile'), buf], PROGRAM_ID)[0];
}

function counterPda(tier: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('counter'), Buffer.from([tier])],
    PROGRAM_ID,
  )[0];
}

const CLAIM_DISCRIMINATOR = Buffer.from(
  ((idl as { instructions: Array<{ name: string; discriminator: number[] }> }).instructions.find(
    (i) => i.name === 'claim',
  )!).discriminator,
);

function encodeClaimData(h3s: string[], prices: bigint[], expiry: bigint): Buffer {
  // borsh: disc(8) + vec<u64> h3s + vec<u64> prices + i64 expiry
  const buf = Buffer.alloc(8 + 4 + h3s.length * 8 + 4 + prices.length * 8 + 8);
  let o = 0;
  CLAIM_DISCRIMINATOR.copy(buf, o); o += 8;
  buf.writeUInt32LE(h3s.length, o); o += 4;
  for (const h3 of h3s) { buf.writeBigUInt64LE(BigInt('0x' + h3), o); o += 8; }
  buf.writeUInt32LE(prices.length, o); o += 4;
  for (const p of prices) { buf.writeBigUInt64LE(p, o); o += 8; }
  buf.writeBigInt64LE(expiry, o);
  return buf;
}

/**
 * Build the full claim transaction for one quoted chunk. The ed25519
 * verification instruction MUST be at index 0 - the program reads it there.
 */
export function buildClaimTransaction(quote: ClaimQuote, claimer: PublicKey): {
  tx: Transaction;
  totalLamports: bigint;
} {
  const treasury = new PublicKey(process.env.NEXT_PUBLIC_TREASURY ?? '');
  const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
  const [buybackVault] = PublicKey.findProgramAddressSync([Buffer.from('buyback')], PROGRAM_ID);

  const edIx = Ed25519Program.createInstructionWithPublicKey({
    publicKey: new PublicKey(quote.keeper).toBytes(),
    message: bs58.decode(quote.messageHash),
    signature: bs58.decode(quote.signature),
  });

  const prices = quote.pricesLamports.map((p) => BigInt(p));
  const claimIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: claimer, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: buybackVault, isSigner: false, isWritable: true },
      { pubkey: counterPda(1), isSigner: false, isWritable: true },
      { pubkey: counterPda(2), isSigner: false, isWritable: true },
      { pubkey: counterPda(3), isSigner: false, isWritable: true },
      { pubkey: new PublicKey('Sysvar1nstructions1111111111111111111111111'), isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ...quote.h3s.map((h3) => ({ pubkey: tilePda(h3), isSigner: false, isWritable: true })),
    ],
    data: encodeClaimData(quote.h3s, prices, BigInt(quote.expiry)),
  });

  const tx = new Transaction()
    .add(edIx)
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }))
    .add(claimIx);

  return { tx, totalLamports: BigInt(quote.totalLamports) };
}
