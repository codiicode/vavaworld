'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPublicClient, TILES_ABI, TILES_ADDRESS } from './evm';
import { useActiveWallet } from './active-wallet';
import { VAVA_UNIT } from './tokenomics-constants';

/**
 * Staking against the VavaTiles contract. ERC-20 staking needs an
 * allowance first, so stakeTokens() transparently runs approve() when the
 * current allowance is short - two wallet confirmations the first time,
 * one after that.
 */

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

export type StakeState = {
  /** Whole $VAVA actively staked. */
  staked: number;
  /** Whole $VAVA in unstake cooldown. */
  pending: number;
  /** Unix seconds when pending becomes withdrawable (0 = none). */
  availableAt: number;
  /** Whole $VAVA in the connected wallet (unstaked). */
  walletBalance: number;
  mintConfigured: boolean;
};

export function useStake() {
  const wallet = useActiveWallet();
  const [state, setState] = useState<StakeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const client = getPublicClient();
        const vava = (await client.readContract({
          address: TILES_ADDRESS,
          abi: TILES_ABI,
          functionName: 'vava',
        })) as `0x${string}`;
        const mintConfigured = vava !== '0x0000000000000000000000000000000000000000';
        if (!mintConfigured || !wallet.address) {
          if (alive) setState({ staked: 0, pending: 0, availableAt: 0, walletBalance: 0, mintConfigured });
          return;
        }
        const [s, bal] = await Promise.all([
          client.readContract({
            address: TILES_ADDRESS,
            abi: TILES_ABI,
            functionName: 'stakes',
            args: [wallet.address],
          }) as Promise<readonly [bigint, bigint, bigint]>,
          client.readContract({
            address: vava,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [wallet.address],
          }) as Promise<bigint>,
        ]);
        if (alive) {
          setState({
            staked: Number(s[0]) / VAVA_UNIT,
            pending: Number(s[1]) / VAVA_UNIT,
            availableAt: Number(s[2]),
            walletBalance: Number(bal) / VAVA_UNIT,
            mintConfigured: true,
          });
        }
      } catch {
        if (alive) setState(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [wallet.address, refreshKey]);

  const send = useCallback(
    async (fn: () => Promise<void>) => {
      if (!wallet.address || !wallet.writeContract) {
        setError('Log in first');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await fn();
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [wallet, refresh],
  );

  const write = useCallback(
    async (functionName: string, args: unknown[]) => {
      const hash = await wallet.writeContract!({
        address: TILES_ADDRESS,
        abi: TILES_ABI,
        functionName,
        args,
      });
      await getPublicClient().waitForTransactionReceipt({ hash });
    },
    [wallet],
  );

  const stakeTokens = useCallback(
    (whole: number) =>
      send(async () => {
        const amount = BigInt(Math.round(whole * VAVA_UNIT));
        const client = getPublicClient();
        const vava = (await client.readContract({
          address: TILES_ADDRESS,
          abi: TILES_ABI,
          functionName: 'vava',
        })) as `0x${string}`;
        const allowance = (await client.readContract({
          address: vava,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [wallet.address!, TILES_ADDRESS],
        })) as bigint;
        if (allowance < amount) {
          const hash = await wallet.writeContract!({
            address: vava,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [TILES_ADDRESS, amount],
          });
          await client.waitForTransactionReceipt({ hash });
        }
        await write('stake', [amount]);
      }),
    [send, write, wallet],
  );

  const beginUnstake = useCallback(
    (whole: number) => send(() => write('beginUnstake', [BigInt(Math.round(whole * VAVA_UNIT))])),
    [send, write],
  );

  const withdraw = useCallback(() => send(() => write('withdrawUnstaked', [])), [send, write]);

  return { wallet, state, busy, error, stakeTokens, beginUnstake, withdraw, refresh };
}
