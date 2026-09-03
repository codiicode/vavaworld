import { randomBytes } from 'crypto';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getServerSupabase } from './supabase-server';
import { getPublicClient, robinhoodChain, getEvmRpcUrl } from './evm';
import { getSolUsdRate } from './sol-usd';
import { verifySolanaPayment } from './solana-verify';
import {
  MEMO_PREFIX,
  SOLANA_TREASURY,
  usdToForeignUnits,
  type ForeignCurrency,
} from './solana-pay-config';

/**
 * "Pay there, settle here." A foreign payment is priced in USD, paid on
 * Solana into the treasury, then the keeper key funds the payer's EVM
 * wallet with the ETH the on-chain action needs (plus gas) so their own
 * wallet can execute claim / buy / placeBid exactly like an ETH payer.
 *
 * State machine (foreign_payments.status):
 *   pending -> verified -> funded            (happy path)
 *   pending -> failed                        (bad/expired payment)
 * Every step is idempotent; the keeper sweeps 'verified' rows whose
 * funding never landed.
 */
const API_SECRET = process.env.INDEXER_API_SECRET ?? '';
const QUOTE_TTL_MS = 10 * 60_000;
/** Payments seen this long after expiry still settle - the user paid. */
const LATE_GRACE_MS = 30 * 60_000;

export type ForeignPurpose = 'claim' | 'buy' | 'bid';

export type ForeignQuote = {
  paymentId: string;
  currency: ForeignCurrency;
  amountUnits: string;
  treasury: string;
  memo: string;
  usd: number;
  expiresAt: number;
};

export type ForeignPaymentRow = {
  id: string;
  currency: ForeignCurrency;
  purpose: ForeignPurpose;
  reference: string | null;
  payer_evm: string;
  amount_units: number | string;
  wei_needed: number | string;
  usd: number | string;
  status: string;
  signature: string | null;
  fund_tx: string | null;
  settle_tx: string | null;
  error: string | null;
  expires_at: string;
};

function keeperWallet() {
  const raw = process.env.KEEPER_EVM_KEY;
  if (!raw) throw new Error('KEEPER_EVM_KEY not configured');
  const account = privateKeyToAccount(raw.trim() as `0x${string}`);
  return createWalletClient({ account, chain: robinhoodChain, transport: http(getEvmRpcUrl()) });
}

/** Gas the payer's wallet will need for the action, at the live price. */
async function gasAllowanceWei(purpose: ForeignPurpose, hexCount: number): Promise<bigint> {
  const gasPrice = await getPublicClient().getGasPrice();
  const units = purpose === 'claim' ? 150_000n + 60_000n * BigInt(Math.max(1, hexCount)) : 250_000n;
  // 1.5x headroom + a floor so listing/raze later isn't stranded.
  const wei = (gasPrice * units * 15n) / 10n;
  const floor = 200_000_000_000_000n; // 0.0002 ETH
  return wei > floor ? wei : floor;
}

export async function createForeignQuote(args: {
  purpose: ForeignPurpose;
  reference: string;
  payerEvm: string;
  usd: number;
  weiNeeded: bigint;
  currency: ForeignCurrency;
  hexCount?: number;
}): Promise<ForeignQuote> {
  if (!SOLANA_TREASURY) throw new Error('Solana payments not configured');
  const solUsd = await getSolUsdRate();
  const amountUnits = usdToForeignUnits(args.usd, args.currency, solUsd);
  const gas = await gasAllowanceWei(args.purpose, args.hexCount ?? 1);
  const paymentId = randomBytes(12).toString('hex');
  const expiresAt = Date.now() + QUOTE_TTL_MS;

  const sb = getServerSupabase();
  const { error } = await sb.rpc('fp_create', {
    p_id: paymentId,
    p_currency: args.currency,
    p_purpose: args.purpose,
    p_reference: args.reference,
    p_payer_evm: args.payerEvm,
    p_amount_units: Number(amountUnits),
    p_wei_needed: (args.weiNeeded + gas).toString(),
    p_usd: args.usd,
    p_expires_at: new Date(expiresAt).toISOString(),
    p_secret: API_SECRET,
  });
  if (error) throw new Error(`payment record failed: ${error.message}`);

  return {
    paymentId,
    currency: args.currency,
    amountUnits: amountUnits.toString(),
    treasury: SOLANA_TREASURY,
    memo: MEMO_PREFIX + paymentId,
    usd: args.usd,
    expiresAt,
  };
}

async function getPayment(id: string): Promise<ForeignPaymentRow | null> {
  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('fp_get', { p_id: id, p_secret: API_SECRET });
  if (error) throw new Error(error.message);
  const row = data as ForeignPaymentRow | null;
  return row && row.id ? row : null;
}

async function mark(
  id: string,
  status: string,
  patch: { signature?: string; fundTx?: string; error?: string | null } = {},
): Promise<void> {
  const sb = getServerSupabase();
  const { error } = await sb.rpc('fp_mark', {
    p_id: id,
    p_status: status,
    p_signature: patch.signature ?? null,
    p_fund_tx: patch.fundTx ?? null,
    p_settle_tx: null,
    p_error: patch.error ?? null,
    p_secret: API_SECRET,
  });
  if (error) throw new Error(error.message);
}

/** Send the ETH leg to the payer. Idempotent via the recorded fund_tx. */
export async function fundPayment(row: ForeignPaymentRow): Promise<`0x${string}`> {
  if (row.fund_tx) return row.fund_tx as `0x${string}`;
  const wallet = keeperWallet();
  const hash = await wallet.sendTransaction({
    to: row.payer_evm as `0x${string}`,
    value: BigInt(String(row.wei_needed)),
  });
  // Record the hash BEFORE waiting so a crash mid-wait can't double-fund.
  await mark(row.id, 'verified', { fundTx: hash });
  await getPublicClient().waitForTransactionReceipt({ hash });
  await mark(row.id, 'funded', { fundTx: hash });
  return hash;
}

export type SettleResult =
  | { status: 'funded'; fundTx: string }
  | { status: 'retry'; reason: string }
  | { status: 'failed'; reason: string };

/**
 * Verify the Solana payment for `id` and fund the payer. Safe to call
 * repeatedly: an already-funded payment just returns its fund tx.
 */
export async function settleForeignPayment(id: string, signature: string): Promise<SettleResult> {
  const row = await getPayment(id);
  if (!row) return { status: 'failed', reason: 'unknown payment' };
  if (row.status === 'funded' && row.fund_tx) return { status: 'funded', fundTx: row.fund_tx };
  if (row.status === 'failed') return { status: 'failed', reason: row.error ?? 'payment failed' };
  if (row.signature && row.signature !== signature) {
    return { status: 'failed', reason: 'payment already settled with another transaction' };
  }
  if (Date.parse(row.expires_at) + LATE_GRACE_MS < Date.now()) {
    return { status: 'failed', reason: 'payment window closed - request a new quote' };
  }

  if (row.status === 'pending') {
    const v = await verifySolanaPayment({
      signature,
      treasury: SOLANA_TREASURY,
      currency: row.currency,
      amountUnits: BigInt(String(row.amount_units)),
      memo: MEMO_PREFIX + row.id,
    });
    if (!v.ok) {
      if (v.retry) return { status: 'retry', reason: v.reason };
      await mark(row.id, 'failed', { error: v.reason });
      return { status: 'failed', reason: v.reason };
    }
    try {
      await mark(row.id, 'verified', { signature });
    } catch (e) {
      // Unique index on signature: this tx already paid for another id.
      return { status: 'failed', reason: `transaction already used (${String(e).slice(0, 60)})` };
    }
  }

  const fresh = (await getPayment(id))!;
  const fundTx = await fundPayment(fresh);
  return { status: 'funded', fundTx };
}

/** Keeper sweep: fund any verified payment whose ETH leg never landed. */
export async function sweepStuckPayments(): Promise<number> {
  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('fp_stuck', { p_secret: API_SECRET });
  if (error) throw new Error(error.message);
  let n = 0;
  for (const row of (data ?? []) as ForeignPaymentRow[]) {
    try {
      if (row.fund_tx) {
        // Sent but never confirmed - check the chain before re-sending.
        const rc = await getPublicClient().getTransactionReceipt({ hash: row.fund_tx as `0x${string}` }).catch(() => null);
        if (rc?.status === 'success') {
          await mark(row.id, 'funded', { fundTx: row.fund_tx });
          n += 1;
          continue;
        }
      }
      await fundPayment({ ...row, fund_tx: null });
      n += 1;
    } catch (e) {
      await mark(row.id, 'verified', { error: String(e).slice(0, 160) });
    }
  }
  return n;
}
