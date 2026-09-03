/**
 * Server-side end-to-end rehearsal of the Solana rail against the REAL
 * Supabase state machine and devnet:
 *   1. createForeignQuote -> fp_create row
 *   2. settle with a bogus signature -> 'retry' (tx not found), row untouched
 *   3. (if a devnet payment can be made) settle with the real signature ->
 *      verified, then funding attempted (needs KEEPER_EVM_KEY)
 *
 *   npx tsx scripts/solana-rail-rehearsal.ts
 *
 * Needs .env.local with INDEXER_API_SECRET + Supabase URL/key. The funded
 * leg needs devnet SOL for a throwaway payer - the public faucet is often
 * dry; without it the script validates the DB + verifier plumbing only.
 */
import { readFileSync } from 'fs';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Load .env.local the way Next does, before any lib import reads env.
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
process.env.NEXT_PUBLIC_SOLANA_PAY = '1';
process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
process.env.NEXT_PUBLIC_SOLANA_CLUSTER = 'devnet';
process.env.NEXT_PUBLIC_EVM_RPC_URL ??= 'https://rpc.mainnet.chain.robinhood.com/rpc';
process.env.NEXT_PUBLIC_EVM_CHAIN_ID ??= '4663';

async function main() {
  const { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } =
    await import('@solana/web3.js');
  const treasury = Keypair.generate();
  process.env.NEXT_PUBLIC_SOLANA_TREASURY = treasury.publicKey.toBase58();

  const { createForeignQuote, settleForeignPayment } = await import('../lib/foreign-payments');
  const { MEMO_PROGRAM_ID } = await import('../lib/solana-pay-config');

  const payerEvm = '0x1111111111111111111111111111111111111111';
  const q = await createForeignQuote({
    purpose: 'claim',
    reference: 'rehearsal',
    payerEvm,
    usd: 0.5,
    weiNeeded: 200_000_000_000_000n,
    currency: 'sol',
    hexCount: 5,
  });
  console.log('quote:', q.paymentId, q.amountUnits, 'lamports, memo', q.memo);

  const bogus = await settleForeignPayment(q.paymentId, '5'.repeat(64));
  console.log('bogus signature ->', bogus.status, 'reason' in bogus ? bogus.reason : '');
  if (bogus.status !== 'retry') throw new Error('expected retry for unknown signature');

  const unknown = await settleForeignPayment('0'.repeat(24), '5'.repeat(64));
  console.log('unknown payment ->', unknown.status);
  if (unknown.status !== 'failed') throw new Error('expected failed for unknown payment id');

  // Real payment on devnet, if the faucet cooperates.
  const conn = new Connection(process.env.SOLANA_RPC_URL!, 'confirmed');
  const payer = Keypair.generate();
  try {
    const a = await conn.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL / 5);
    await conn.confirmTransaction(a, 'confirmed');
  } catch (e) {
    console.log('airdrop unavailable - DB + verifier plumbing validated, skipping the funded leg');
    return;
  }
  const tx = new Transaction()
    .add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: treasury.publicKey, lamports: BigInt(q.amountUnits) }))
    .add(new TransactionInstruction({ keys: [], programId: new PublicKey(MEMO_PROGRAM_ID), data: Buffer.from(q.memo) }));
  const sig = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: 'finalized' });
  console.log('paid on devnet:', sig);

  const r = await settleForeignPayment(q.paymentId, sig);
  console.log('settle ->', JSON.stringify(r));
  const again = await settleForeignPayment(q.paymentId, sig);
  console.log('settle again (idempotent) ->', JSON.stringify(again));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('E2E FAILED:', e);
    process.exit(1);
  });
