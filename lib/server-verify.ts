import { recoverMessageAddress } from 'viem';
import { getPublicClient, TILES_ABI, TILES_ADDRESS } from './evm';
import { TIERS, VAVA_UNIT } from './tokenomics-constants';

/** Whole $VAVA actively staked by an address (on-chain read). */
export async function getStakedWhole(address: string): Promise<number> {
  try {
    const s = (await getPublicClient().readContract({
      address: TILES_ADDRESS,
      abi: TILES_ABI,
      functionName: 'stakes',
      args: [address as `0x${string}`],
    })) as readonly [bigint, bigint, bigint];
    return Number(s[0]) / VAVA_UNIT;
  } catch {
    return 0;
  }
}

export async function meetsPresidentStake(address: string): Promise<boolean> {
  const staked = await getStakedWhole(address);
  return staked >= TIERS.find((t) => t.key === 'president')!.threshold;
}

/**
 * Verify a personal_sign wallet signature over a message. The message must
 * embed the action + a recent timestamp so signatures can't be reused
 * across actions or replayed much later.
 */
export async function verifySignedAction(args: {
  address: string;
  message: string;
  signatureB58: string; // 0x-hex signature; param name kept for callers
  expectPrefix: string;
  maxAgeMs?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { address, message, signatureB58, expectPrefix, maxAgeMs = 5 * 60_000 } = args;
  if (!message.startsWith(expectPrefix)) return { ok: false, error: 'wrong message prefix' };
  const tsMatch = message.match(/:ts=(\d+)$/);
  if (!tsMatch) return { ok: false, error: 'message missing timestamp' };
  const age = Date.now() - Number(tsMatch[1]);
  if (age < -60_000 || age > maxAgeMs) return { ok: false, error: 'signature expired' };
  try {
    const recovered = await recoverMessageAddress({
      message,
      signature: signatureB58 as `0x${string}`,
    });
    return recovered.toLowerCase() === address.toLowerCase()
      ? { ok: true }
      : { ok: false, error: 'invalid signature' };
  } catch {
    return { ok: false, error: 'malformed signature' };
  }
}
