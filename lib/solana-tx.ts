import {
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
import { MEMO_PROGRAM_ID, USDC_MINT, type ForeignCurrency } from './solana-pay-config';

/**
 * The exact transaction a foreign payment sends: one transfer of the
 * quoted units to the treasury (SOL, or USDC via the treasury's ATA which
 * is created idempotently) plus our memo, so the server can bind the tx
 * to a single payment. Pure - no wallet, no RPC - so it is unit-testable.
 */
export function buildPaymentTransaction(args: {
  payer: string;
  treasury: string;
  currency: ForeignCurrency;
  amountUnits: bigint;
  memo: string;
  recentBlockhash: string;
  usdcMint?: string;
}): Transaction {
  const payer = new PublicKey(args.payer);
  const treasury = new PublicKey(args.treasury);
  const tx = new Transaction();
  if (args.currency === 'sol') {
    tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: treasury, lamports: args.amountUnits }));
  } else {
    const mint = new PublicKey(args.usdcMint ?? USDC_MINT);
    const from = getAssociatedTokenAddressSync(mint, payer);
    const to = getAssociatedTokenAddressSync(mint, treasury);
    tx.add(createAssociatedTokenAccountIdempotentInstruction(payer, to, treasury, mint));
    tx.add(createTransferInstruction(from, to, payer, args.amountUnits));
  }
  tx.add(
    new TransactionInstruction({
      keys: [],
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from(args.memo, 'utf8'),
    }),
  );
  tx.recentBlockhash = args.recentBlockhash;
  tx.feePayer = payer;
  return tx;
}
