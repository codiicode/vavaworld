'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, BN, type Idl, type Wallet } from '@coral-xyz/anchor';
import idl from './anchor-idl.json';
import { getConnection } from './anchor-client';
import { preflight } from './preflight';
import { useActiveWallet } from './active-wallet';
import { VAVA_UNIT } from './tokenomics-constants';

const PROGRAM_ID = new PublicKey((idl as { address: string }).address);
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

function ata(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ATA_PROGRAM_ID,
  )[0];
}

/** Read-only Program for building instructions (no signer needed). */
function readProgram(): Program {
  const connection = getConnection();
  const dummy = {
    publicKey: PublicKey.default,
    signTransaction: async (t: unknown) => t,
    signAllTransactions: async (t: unknown) => t,
  } as unknown as Wallet;
  return new Program(idl as Idl, new AnchorProvider(connection, dummy, {}));
}

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
        const program = readProgram();
        const connection = getConnection();
        const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
        const cfg = await (program.account as never as {
          config: { fetchNullable: (pk: PublicKey) => Promise<{ vavaMint: PublicKey } | null> };
        }).config.fetchNullable(configPda);
        if (!cfg) {
          if (alive) setState({ staked: 0, pending: 0, availableAt: 0, walletBalance: 0, mintConfigured: false });
          return;
        }
        if (!wallet.publicKey) {
          if (alive) setState({ staked: 0, pending: 0, availableAt: 0, walletBalance: 0, mintConfigured: true });
          return;
        }
        const owner = new PublicKey(wallet.publicKey.toString());
        const [stakePda] = PublicKey.findProgramAddressSync(
          [Buffer.from('stake'), owner.toBuffer()],
          PROGRAM_ID,
        );
        const acct = await (program.account as never as {
          stakeAccount: {
            fetchNullable: (pk: PublicKey) => Promise<{
              amount: BN;
              pendingAmount: BN;
              unstakeAvailableAt: BN;
            } | null>;
          };
        }).stakeAccount.fetchNullable(stakePda);

        let walletBalance = 0;
        try {
          const bal = await connection.getTokenAccountBalance(ata(cfg.vavaMint, owner));
          walletBalance = Number(bal.value.amount) / VAVA_UNIT;
        } catch {
          walletBalance = 0; // no ATA yet
        }

        if (alive) {
          setState({
            staked: acct ? Number(acct.amount.toString()) / VAVA_UNIT : 0,
            pending: acct ? Number(acct.pendingAmount.toString()) / VAVA_UNIT : 0,
            availableAt: acct ? Number(acct.unstakeAvailableAt.toString()) : 0,
            walletBalance,
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
  }, [wallet.publicKey, refreshKey]);

  const send = useCallback(
    async (build: (program: Program, owner: PublicKey, mint: PublicKey) => Promise<Transaction>) => {
      if (!wallet.publicKey || !wallet.signAndSendTransaction) {
        setError('Connect a wallet first');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const program = readProgram();
        const connection = getConnection();
        const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
        const cfg = await (program.account as never as {
          config: { fetch: (pk: PublicKey) => Promise<{ vavaMint: PublicKey }> };
        }).config.fetch(configPda);
        const owner = new PublicKey(wallet.publicKey.toString());
        const tx = await build(program, owner, cfg.vavaMint);
        tx.feePayer = owner;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        // Balance + simulation guard (staking pays only the network fee).
        await preflight({ connection, feePayer: owner, tx });
        const sig = await wallet.signAndSendTransaction(tx);
        await connection.confirmTransaction(sig, 'confirmed');
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [wallet, refresh],
  );

  const pdas = useMemo(
    () => (owner: PublicKey, mint: PublicKey) => ({
      config: PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)[0],
      stakeAccount: PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), owner.toBuffer()],
        PROGRAM_ID,
      )[0],
      stakeVault: PublicKey.findProgramAddressSync(
        [Buffer.from('stake_vault'), mint.toBuffer()],
        PROGRAM_ID,
      )[0],
      ownerToken: ata(mint, owner),
    }),
    [],
  );

  const stakeTokens = useCallback(
    (whole: number) =>
      send(async (program, owner, mint) => {
        const p = pdas(owner, mint);
        const ix = await program.methods
          .stake(new BN(Math.round(whole * VAVA_UNIT).toString()))
          .accounts({
            owner,
            config: p.config,
            stakeAccount: p.stakeAccount,
            ownerToken: p.ownerToken,
            stakeVault: p.stakeVault,
          })
          .instruction();
        return new Transaction().add(ix);
      }),
    [send, pdas],
  );

  const beginUnstake = useCallback(
    (whole: number) =>
      send(async (program, owner, mint) => {
        const p = pdas(owner, mint);
        const ix = await program.methods
          .beginUnstake(new BN(Math.round(whole * VAVA_UNIT).toString()))
          .accounts({ owner, stakeAccount: p.stakeAccount })
          .instruction();
        return new Transaction().add(ix);
      }),
    [send, pdas],
  );

  const withdraw = useCallback(
    () =>
      send(async (program, owner, mint) => {
        const p = pdas(owner, mint);
        const ix = await program.methods
          .withdrawUnstaked()
          .accounts({
            owner,
            config: p.config,
            stakeAccount: p.stakeAccount,
            ownerToken: p.ownerToken,
            stakeVault: p.stakeVault,
          })
          .instruction();
        return new Transaction().add(ix);
      }),
    [send, pdas],
  );

  return { wallet, state, busy, error, stakeTokens, beginUnstake, withdraw, refresh };
}
