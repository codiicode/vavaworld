'use client';

import { useCallback } from 'react';
import { useSolPrice } from './use-sol-price';

/**
 * The UI speaks dollars. Chain amounts stay native (ETH wei / listing
 * floats), and this hook converts them for display at the live rate -
 * the single rule that replaced every "X SOL" readout.
 */
export function useUsdFmt(): (native: number) => string {
  const price = useSolPrice();
  // Stable identity per rate so the formatter can sit in memo deps.
  return useCallback((native: number) => fmtUsdValue(native * price), [price]);
}

export function fmtUsdValue(v: number): string {
  if (!Number.isFinite(v)) return '$0.00';
  if (v !== 0 && Math.abs(v) < 0.01) return `$${v.toFixed(4)}`;
  if (Math.abs(v) >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${v.toFixed(2)}`;
}
