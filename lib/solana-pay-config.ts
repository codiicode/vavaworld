/**
 * Solana payment rail - shared client/server constants.
 *
 * Off until NEXT_PUBLIC_SOLANA_PAY=1 AND a treasury address is set, so the
 * rail can ship dark and be switched on without a deploy. Payments land in
 * the treasury on Solana; settlement happens on Robinhood Chain by funding
 * the payer's EVM wallet with the equivalent ETH (see lib/foreign-payments).
 */
export type ForeignCurrency = 'sol' | 'usdc';

export const SOLANA_PAY_ENABLED =
  process.env.NEXT_PUBLIC_SOLANA_PAY === '1' && !!process.env.NEXT_PUBLIC_SOLANA_TREASURY;
export const SOLANA_TREASURY = process.env.NEXT_PUBLIC_SOLANA_TREASURY ?? '';
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
export const SOLANA_CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'mainnet') as
  | 'mainnet'
  | 'devnet';
/** Circle USDC mint (mainnet default; devnet override via env). */
export const USDC_MINT =
  process.env.NEXT_PUBLIC_SOLANA_USDC_MINT ?? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

/** Treasury absorbs FX between the Solana leg and the ETH payout - this
 *  spread covers it with margin. */
export const FOREIGN_SURCHARGE = 0.01;
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const USDC_DECIMALS = 6;
/** Memo prefix so a treasury inflow is unambiguously a VAVA payment. */
export const MEMO_PREFIX = 'vava:';

export function isForeignCurrency(c: unknown): c is ForeignCurrency {
  return c === 'sol' || c === 'usdc';
}

/** USD -> smallest units of the foreign currency, surcharge included. */
export function usdToForeignUnits(usd: number, currency: ForeignCurrency, solUsd: number): bigint {
  const gross = usd * (1 + FOREIGN_SURCHARGE);
  if (currency === 'usdc') return BigInt(Math.ceil(gross * 10 ** USDC_DECIMALS));
  if (!(solUsd > 0)) throw new Error('SOL price unavailable');
  return BigInt(Math.ceil((gross / solUsd) * LAMPORTS_PER_SOL));
}

export function formatForeign(units: bigint, currency: ForeignCurrency): string {
  if (currency === 'usdc') return `${(Number(units) / 10 ** USDC_DECIMALS).toFixed(2)} USDC`;
  const sol = Number(units) / LAMPORTS_PER_SOL;
  return `${sol.toFixed(sol < 0.01 ? 6 : 4)} SOL`;
}
