import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { getRpcUrl } from './anchor-client';
import { TIERS, VAVA_UNIT } from './tokenomics-constants';
import idl from './anchor-idl.json';

const PROGRAM_ID = new PublicKey((idl as { address: string }).address);

/** Whole $VAVA actively staked by an address (on-chain read). */
export async function getStakedWhole(address: string): Promise<number> {
  try {
    const owner = new PublicKey(address);
    const [stakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('stake'), owner.toBuffer()],
      PROGRAM_ID,
    );
    const info = await new Connection(getRpcUrl(), 'confirmed').getAccountInfo(stakePda);
    if (!info) return 0;
    // StakeAccount layout: 8 disc + 32 owner + 8 amount (LE) + ...
    return Number(info.data.readBigUInt64LE(40)) / VAVA_UNIT;
  } catch {
    return 0;
  }
}

export async function meetsPresidentStake(address: string): Promise<boolean> {
  const staked = await getStakedWhole(address);
  return staked >= TIERS.find((t) => t.key === 'president')!.threshold;
}

/**
 * Verify an ed25519 wallet signature over a message. The message must
 * embed the action + a recent timestamp so signatures can't be reused
 * across actions or replayed much later.
 */
export function verifySignedAction(args: {
  address: string;
  message: string;
  signatureB58: string;
  expectPrefix: string;
  maxAgeMs?: number;
}): { ok: true } | { ok: false; error: string } {
  const { address, message, signatureB58, expectPrefix, maxAgeMs = 5 * 60_000 } = args;
  if (!message.startsWith(expectPrefix)) return { ok: false, error: 'wrong message prefix' };
  const tsMatch = message.match(/:ts=(\d+)$/);
  if (!tsMatch) return { ok: false, error: 'message missing timestamp' };
  const age = Date.now() - Number(tsMatch[1]);
  if (age < -60_000 || age > maxAgeMs) return { ok: false, error: 'signature expired' };
  try {
    const ok = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(signatureB58),
      new PublicKey(address).toBytes(),
    );
    return ok ? { ok: true } : { ok: false, error: 'invalid signature' };
  } catch {
    return { ok: false, error: 'malformed signature' };
  }
}
