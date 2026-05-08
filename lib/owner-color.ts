import { PublicKey } from '@solana/web3.js';

/**
 * Deterministic HSL color from a wallet pubkey.
 * Hue varies; saturation and lightness fixed for legibility against dark satellite background.
 */
export function ownerColor(pubkey: PublicKey): string {
  const bytes = pubkey.toBytes();
  let hash = 0;
  for (const b of bytes) {
    hash = (hash * 31 + b) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 55%)`;
}
