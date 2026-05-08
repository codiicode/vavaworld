'use client';

import { useEffect, useState } from 'react';
import { BorshAccountsCoder, type Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from './anchor-idl.json';
import { counterPda } from './tile-pda';
import { getConnection, PROGRAM_ID } from './anchor-client';

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

export function useCounters(): Counters {
  const [counters, setCounters] = useState<Counters>({ 1: 0n, 2: 0n, 3: 0n });

  useEffect(() => {
    const conn = getConnection();
    const subs: number[] = [];

    (async () => {
      for (const tier of [1, 2, 3] as const) {
        const [pda] = counterPda(tier, programIdPk);

        const ai = await conn.getAccountInfo(pda);
        if (ai) {
          const sold = decodeCounter(ai.data as Buffer);
          setCounters((c) => ({ ...c, [tier]: sold }));
        }

        const sub = conn.onAccountChange(pda, (acc) => {
          const sold = decodeCounter(acc.data as Buffer);
          setCounters((c) => ({ ...c, [tier]: sold }));
        });
        subs.push(sub);
      }
    })();

    return () => {
      const conn = getConnection();
      subs.forEach((s) => conn.removeAccountChangeListener(s));
    };
  }, []);

  return counters;
}
