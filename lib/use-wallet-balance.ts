'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { getPublicClient, USDG_ADDRESS } from './evm';
import { useSolPrice } from './use-sol-price';
import { useClaimDoneListener } from './claim-events';

/**
 * Spendable balance in dollars: native ETH at the live rate plus USDG at
 * par. Reading only ETH showed "$0.00" to users funded entirely in USDG.
 * Polls slowly and refreshes right after a local claim confirms.
 */
const POLL_MS = 30_000;

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export function useWalletBalance(address: string | null): {
  balanceUsd: number | null;
  loading: boolean;
  refetch: () => void;
} {
  const [eth, setEth] = useState<number | null>(null);
  const [usdg, setUsdg] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [reqId, setReqId] = useState(0);
  const ethUsd = useSolPrice();
  const refetch = useCallback(() => setReqId((x) => x + 1), []);

  useEffect(() => {
    if (!address) {
      setEth(null);
      setUsdg(0);
      return;
    }
    let cancelled = false;

    const fetchOnce = async () => {
      const client = getPublicClient();
      const addr = address as `0x${string}`;
      try {
        const wei = await client.getBalance({ address: addr });
        if (!cancelled) setEth(Number(formatEther(wei)));
      } catch {
        if (!cancelled) setEth(null);
      }
      if (!USDG_ADDRESS) return;
      try {
        const units = await client.readContract({
          address: USDG_ADDRESS,
          abi: ERC20_BALANCE_ABI,
          functionName: 'balanceOf',
          args: [addr],
        });
        if (!cancelled) setUsdg(Number(units) / 1e6);
      } catch {
        /* keep last-known USDG - a flaky read shouldn't zero the display */
      }
    };

    setLoading(true);
    fetchOnce().finally(() => {
      if (!cancelled) setLoading(false);
    });

    const intervalId = window.setInterval(fetchOnce, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [address, reqId]);

  useClaimDoneListener(() => {
    window.setTimeout(refetch, 800);
  });

  return { balanceUsd: eth === null ? null : eth * ethUsd + usdg, loading, refetch };
}
