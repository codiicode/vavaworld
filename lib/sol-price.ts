import { getEthUsd } from './eth-price';

/**
 * Legacy name from the Solana era: every "solUsd" consumer (UI $
 * conversions, activity/owner/leaderboard USD values, keeper volume
 * labels) now runs on ETH, so this MUST be the ETH/USD rate - the
 * native unit the site converts is ether, not SOL.
 */
export async function getSolUsd(): Promise<number> {
  return getEthUsd();
}
