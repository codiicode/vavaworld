'use client';

import { useCallback, useEffect, useState } from 'react';
import { BorshAccountsCoder, type Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from './anchor-idl.json';
import { counterPda } from './tile-pda';
import { getConnection, PROGRAM_ID } from './anchor-client';
import { useClaimDoneListener } from './claim-events';

const programIdPk = new PublicKey(PROGRAM_ID);
const coder = new BorshAccountsCoder(idl as Idl);

export type Counters = { 1: bigint; 2: bigint; 3: bigint };

function decodeCounter(buf: Buffer): bigint {
  try {
    const decoded = coder.decode<{ sold: { toString: () => string } }>('TierCounter', buf);
    return BigInt(decoded.sold.toString());
  } catch {
    return 0n;
  }
}

/**
 * Reads the three TierCounter PDAs.
 *
 * Originally subscribed to live updates via `onAccountChange`, but Helius RPC
 * URLs carry a query-string API key which the web3.js WSS client mangles. The
 * resulting connection failures retry in a tight loop and swamp the browser.
 * Polling every 30s is plenty for pricing UI.
 */
const POLL_MS = 30_000;

export function useCounters(): Counters {
  const [counters, setCounters] = useState<Counters>({ 1: 0n, 2: 0n, 3: 0n });

  const fetchAll = useCallback(async () => {
    const conn = getConnection();
    for (const tier of [1, 2, 3] as const) {
      try {
        const [pda] = counterPda(tier, programIdPk);
        const ai = await conn.getAccountInfo(pda);
        if (!ai) continue;
        const sold = decodeCounter(ai.data as Buffer);
        setCounters((c) => ({ ...c, [tier]: sold }));
      } catch {
        /* one tier failed - keep going */
      }
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const intervalId = window.setInterval(fetchAll, POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [fetchAll]);

  useClaimDoneListener(() => {
    window.setTimeout(fetchAll, 800);
  });

  return counters;
}
