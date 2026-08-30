'use client';

import { useEffect, useRef } from 'react';
import { useActiveWallet } from '@/lib/active-wallet';
import { usePrivyUser } from '@/lib/wallet-context';
import { invalidateAddress, queueAddress } from '@/lib/username-store';

/**
 * Headless global sync: someone who logged in WITH X (or linked it
 * earlier) already proved control of the account through the same
 * OAuth, so their badge appears automatically - no manual verify
 * needed. Watches the Privy user and mirrors the linked X handle
 * server-side once per (wallet, handle) pair per browser.
 */
export function XAutoVerify() {
  const wallet = useActiveWallet();
  const privy = usePrivyUser();
  const inFlightRef = useRef(false);

  const address = wallet.source === 'privy' ? wallet.address : null;
  const linkedHandle = privy.user?.twitter?.username ?? null;

  useEffect(() => {
    if (!address || !linkedHandle || !privy.getAccessToken || inFlightRef.current) return;

    // Once per pair per browser - a localStorage stamp survives reloads
    // so we don't hit the endpoint on every page view.
    const stampKey = 'vava-x-sync';
    const stamp = `${address}:${linkedHandle}`;
    try {
      if (window.localStorage.getItem(stampKey) === stamp) return;
    } catch {
      /* storage blocked - fall through, worst case one extra call */
    }

    inFlightRef.current = true;
    (async () => {
      try {
        const token = await privy.getAccessToken!();
        if (!token) return;
        const res = await fetch('/api/verify-x', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authToken: token, address }),
        });
        if (res.ok) {
          try {
            window.localStorage.setItem(stampKey, stamp);
          } catch {
            /* ignore */
          }
          invalidateAddress(address);
          queueAddress(address);
        }
      } catch {
        /* transient - retried on next login/page load */
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [address, linkedHandle, privy.getAccessToken, privy]);

  return null;
}
