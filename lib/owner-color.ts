import { PublicKey } from '@solana/web3.js';

/**
 * Deterministic HSL color from a wallet pubkey — an owner's identity on
 * the map, where distinguishing neighbouring claims matters.
 *
 * Hue varies; saturation is deliberately low. At 70% these read as a bag
 * of highlighter colours across the UI, which fights the monochrome
 * chrome everywhere else. Muted still separates owners without shouting.
 */
export function ownerColor(pubkey: PublicKey): string {
  const bytes = pubkey.toBytes();
  let hash = 0;
  for (const b of bytes) {
    hash = (hash * 31 + b) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 32%, 62%)`;
}
