'use client';

import { useEffect } from 'react';

/**
 * Cross-component "a claim just succeeded" pub/sub via a window CustomEvent.
 *
 * After ClaimModal confirms a tx, dispatchClaimDone() fires here. Any hook
 * that holds wallet- or tile-derived state (useTiles, useUserTiles,
 * useWalletBalance, useCounters) subscribes via useClaimDoneListener and
 * refetches immediately — no waiting for the 30s polling tick, no stale
 * portfolio after the user navigates to /profile.
 */
const EVENT_NAME = 'vavaworld:claim-done';

export type ClaimDoneDetail = {
  h3s: string[];
  txSig: string;
};

export function dispatchClaimDone(detail: ClaimDoneDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ClaimDoneDetail>(EVENT_NAME, { detail }));
}

export function useClaimDoneListener(callback: (detail: ClaimDoneDetail) => void): void {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ClaimDoneDetail>).detail;
      callback(detail);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [callback]);
}
