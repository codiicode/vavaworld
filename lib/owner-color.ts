/**
 * Deterministic HSL color from a wallet address string (0x... on EVM) -
 * an owner's identity on the map, where distinguishing neighbouring
 * claims matters.
 *
 * Hue varies; saturation is deliberately low. At 70% these read as a bag
 * of highlighter colours across the UI, which fights the monochrome
 * chrome everywhere else. Muted still separates owners without shouting.
 */
export function ownerColor(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 32%, 62%)`;
}
