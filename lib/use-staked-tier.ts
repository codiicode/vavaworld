'use client';

import { useEffect, useState } from 'react';
import { BorshAccountsCoder, type Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from './anchor-idl.json';
import { getConnection, PROGRAM_ID } from './anchor-client';
import { VAVA_UNIT, tierFor, type TierKey } from './tokenomics-constants';

const coder = new BorshAccountsCoder(idl as Idl);
const cache = new Map<string, TierKey>();

/**
 * Staking tier (Tourist / Citizen / Baron / President) for ANY wallet -
 * reads the stake PDA directly so public profiles can show the badge.
 * No stake account (or RPC hiccup) = Tourist.
 */
export function useStakedTier(address: string | null): TierKey {
  const [tier, setTier] = useState<TierKey>(
    address ? (cache.get(address) ?? 'tourist') : 'tourist',
  );

  useEffect(() => {
    if (!address) {
      setTier('tourist');
      return;
    }
    const cached = cache.get(address);
    if (cached) {
      setTier(cached);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const owner = new PublicKey(address);
        const [pda] = PublicKey.findProgramAddressSync(
          [Buffer.from('stake'), owner.toBuffer()],
          new PublicKey(PROGRAM_ID),
        );
        const ai = await getConnection().getAccountInfo(pda);
        let staked = 0;
        if (ai) {
          const d = coder.decode<{ amount: { toString(): string } }>(
            'StakeAccount',
            ai.data as Buffer,
          );
          staked = Number(d.amount.toString()) / VAVA_UNIT;
        }
        const t = tierFor(staked);
        cache.set(address, t);
        if (alive) setTier(t);
      } catch {
        /* invalid address or RPC down - stay Tourist */
      }
    })();
    return () => {
      alive = false;
    };
  }, [address]);

  return tier;
}
