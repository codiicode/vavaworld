/** Compact number formatting shared site-wide: 2.4M / 340K / 999. */
export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}
