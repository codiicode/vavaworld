import { Connection, type ParsedInstruction, type PartiallyDecodedInstruction } from '@solana/web3.js';
import { MEMO_PROGRAM_ID, SOLANA_RPC_URL, USDC_MINT, type ForeignCurrency } from './solana-pay-config';

/**
 * Server-side proof that a Solana transaction paid the treasury. The tx
 * must be finalized, succeeded, carry our memo (binds it to exactly one
 * payment), and have moved at least the expected amount of the expected
 * asset into the treasury. The caller records the signature as a
 * nullifier so the same tx can never settle twice.
 */
export type VerifyResult =
  | { ok: true; blockTime: number }
  | { ok: false; reason: string; retry: boolean };

const MAX_AGE_SECS = 24 * 3600;

function rpcUrl(): string {
  return process.env.SOLANA_RPC_URL ?? SOLANA_RPC_URL;
}

export async function verifySolanaPayment(args: {
  signature: string;
  treasury: string;
  currency: ForeignCurrency;
  amountUnits: bigint;
  memo: string;
}): Promise<VerifyResult> {
  const { signature, treasury, currency, amountUnits, memo } = args;
  const conn = new Connection(rpcUrl(), 'finalized');
  let tx;
  try {
    tx = await conn.getParsedTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // A malformed signature is never going to finalize - don't make the
    // client poll for it.
    const permanent = /Invalid param|WrongSize|invalid base58/i.test(msg);
    return { ok: false, reason: `rpc: ${msg}`, retry: !permanent };
  }
  if (!tx) return { ok: false, reason: 'transaction not finalized yet', retry: true };
  if (tx.meta?.err) return { ok: false, reason: 'transaction failed on-chain', retry: false };
  const blockTime = tx.blockTime ?? 0;
  if (!blockTime || Date.now() / 1000 - blockTime > MAX_AGE_SECS) {
    return { ok: false, reason: 'transaction too old', retry: false };
  }

  // Memo: the payment id must ride inside the tx itself.
  const ixs = tx.transaction.message.instructions as Array<ParsedInstruction | PartiallyDecodedInstruction>;
  const memoOk = ixs.some((ix) => {
    if (ix.programId.toBase58() !== MEMO_PROGRAM_ID) return false;
    const parsed = (ix as ParsedInstruction).parsed;
    return typeof parsed === 'string' && parsed.includes(memo);
  });
  if (!memoOk) return { ok: false, reason: 'memo does not match this payment', retry: false };

  if (currency === 'sol') {
    const keys = tx.transaction.message.accountKeys;
    const idx = keys.findIndex((k) => k.pubkey.toBase58() === treasury);
    if (idx < 0) return { ok: false, reason: 'treasury not in transaction', retry: false };
    const pre = BigInt(tx.meta?.preBalances[idx] ?? 0);
    const post = BigInt(tx.meta?.postBalances[idx] ?? 0);
    if (post - pre < amountUnits) {
      return { ok: false, reason: `paid ${post - pre} lamports, expected ${amountUnits}`, retry: false };
    }
    return { ok: true, blockTime };
  }

  // USDC: compare the treasury's token balance for the USDC mint.
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const sum = (rows: typeof pre) =>
    rows
      .filter((r) => r.owner === treasury && r.mint === USDC_MINT)
      .reduce((s, r) => s + BigInt(r.uiTokenAmount.amount), 0n);
  const delta = sum(post) - sum(pre);
  if (delta < amountUnits) {
    return { ok: false, reason: `paid ${delta} USDC units, expected ${amountUnits}`, retry: false };
  }
  return { ok: true, blockTime };
}
