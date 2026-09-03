import { describe, expect, it } from 'vitest';
import { Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { buildPaymentTransaction } from '../solana-tx';
import { MEMO_PROGRAM_ID, USDC_MINT } from '../solana-pay-config';
import { PublicKey } from '@solana/web3.js';

const payer = Keypair.generate().publicKey.toBase58();
const treasury = Keypair.generate().publicKey.toBase58();
const blockhash = '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi';

describe('buildPaymentTransaction', () => {
  it('SOL: one system transfer of the exact lamports to the treasury, then the memo', () => {
    const tx = buildPaymentTransaction({
      payer, treasury, currency: 'sol', amountUnits: 123_456n, memo: 'vava:abc', recentBlockhash: blockhash,
    });
    expect(tx.instructions).toHaveLength(2);
    const [transfer, memo] = tx.instructions;
    expect(transfer.programId.equals(SystemProgram.programId)).toBe(true);
    // System transfer layout: u32 instruction index (2) + u64 lamports LE
    expect(transfer.data.readUInt32LE(0)).toBe(2);
    expect(transfer.data.readBigUInt64LE(4)).toBe(123_456n);
    expect(transfer.keys[1].pubkey.toBase58()).toBe(treasury);
    expect(memo.programId.toBase58()).toBe(MEMO_PROGRAM_ID);
    expect(memo.data.toString('utf8')).toBe('vava:abc');
    expect(tx.feePayer?.toBase58()).toBe(payer);
    expect(tx.recentBlockhash).toBe(blockhash);
  });

  it('USDC: creates the treasury ATA idempotently, transfers to it, then the memo', () => {
    const tx = buildPaymentTransaction({
      payer, treasury, currency: 'usdc', amountUnits: 10_100_000n, memo: 'vava:def', recentBlockhash: blockhash,
    });
    expect(tx.instructions).toHaveLength(3);
    const [createAta, transfer, memo] = tx.instructions;
    expect(createAta.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)).toBe(true);
    expect(transfer.programId.equals(TOKEN_PROGRAM_ID)).toBe(true);
    const treasuryAta = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), new PublicKey(treasury));
    expect(transfer.keys[1].pubkey.equals(treasuryAta)).toBe(true);
    // SPL Transfer layout: u8 instruction (3) + u64 amount LE
    expect(transfer.data[0]).toBe(3);
    expect(transfer.data.readBigUInt64LE(1)).toBe(10_100_000n);
    expect(memo.data.toString('utf8')).toBe('vava:def');
  });

  it('serializes without signatures (what Privy signs)', () => {
    const tx = buildPaymentTransaction({
      payer, treasury, currency: 'sol', amountUnits: 1n, memo: 'vava:x', recentBlockhash: blockhash,
    });
    const bytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    expect(bytes.length).toBeGreaterThan(100);
  });
});
