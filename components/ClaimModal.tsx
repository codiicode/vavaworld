'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { hexCenter } from '@/lib/h3-utils';
import { classifyTier } from '@/lib/tier';
import { quoteBatch } from '@/lib/quote';
import { useCounters } from '@/lib/use-counters';
import { tilePda, counterPda } from '@/lib/tile-pda';
import { getProgram, PROGRAM_ID } from '@/lib/anchor-client';

const programIdPk = new PublicKey(PROGRAM_ID);

type State = 'review' | 'signing' | 'confirmed' | 'error';

export function ClaimModal({
  selectedHexes,
  onClose,
  onConfirmed,
}: {
  selectedHexes: Set<string>;
  onClose: () => void;
  onConfirmed: (h3s: string[]) => void;
}) {
  const wallet = useWallet();
  const counters = useCounters();
  const [state, setState] = useState<State>('review');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [txSig, setTxSig] = useState<string>('');

  const items = Array.from(selectedHexes).map((h3) => {
    const c = hexCenter(h3);
    return { h3, tier: classifyTier(c.lat, c.lng) };
  });
  const totalLamports = quoteBatch(items, counters);
  const totalSol = Number(totalLamports) / LAMPORTS_PER_SOL;
  const expectedMax = (totalLamports * 102n) / 100n; // 2% slippage tolerance

  const handleConfirm = async () => {
    const program = getProgram(wallet);
    if (!program || !wallet.publicKey) {
      setState('error');
      setErrorMsg('Wallet not connected');
      return;
    }
    setState('signing');
    try {
      const h3Bns = items.map((it) => new BN(BigInt('0x' + it.h3).toString()));
      const tilePdas = items.map((it) => tilePda(it.h3, programIdPk)[0]);

      const sig = await program.methods
        .claim(h3Bns, new BN(expectedMax.toString()))
        .accounts({
          claimer: wallet.publicKey,
          t1Counter: counterPda(1, programIdPk)[0],
          t2Counter: counterPda(2, programIdPk)[0],
          t3Counter: counterPda(3, programIdPk)[0],
        })
        .remainingAccounts(
          tilePdas.map((p) => ({ pubkey: p, isWritable: true, isSigner: false })),
        )
        .rpc();

      setTxSig(sig);
      setState('confirmed');
      onConfirmed(items.map((it) => it.h3));
    } catch (e: unknown) {
      setState('error');
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/60">
      <div className="w-[420px] bg-[var(--panel)] border border-[var(--border)] p-6">
        <h2 className="text-sm uppercase tracking-widest text-[var(--muted)] mb-4">
          Claim {items.length} tile{items.length === 1 ? '' : 's'}
        </h2>

        {state === 'review' && (
          <>
            <ul className="max-h-64 overflow-y-auto mb-4 border border-[var(--border)]">
              {items.map((it) => (
                <li
                  key={it.h3}
                  className="flex justify-between px-3 py-2 text-xs font-mono border-b border-[var(--border)] last:border-b-0"
                >
                  <span>{it.h3}</span>
                  <span>T{it.tier}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-sm mb-6">
              <span className="text-[var(--muted)]">Total (uppskattat)</span>
              <span className="font-mono">{totalSol.toFixed(6)} SOL</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 border border-[var(--border)] hover:border-[var(--fg)]"
              >
                Avbryt
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 border border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] hover:opacity-90"
              >
                Bekräfta
              </button>
            </div>
          </>
        )}

        {state === 'signing' && (
          <div className="py-12 text-center text-sm text-[var(--muted)]">
            Signerar och skickar transaktion…
          </div>
        )}

        {state === 'confirmed' && (
          <>
            <div className="py-6 text-center">
              <div className="text-sm mb-3">
                Klart. {items.length} tile{items.length === 1 ? '' : 's'} claimade.
              </div>
              <a
                href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--muted)] underline"
              >
                Visa på Solscan
              </a>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 border border-[var(--border)] hover:border-[var(--fg)]"
            >
              Stäng
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="py-4 text-sm text-[var(--fg)] mb-4">
              <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Fel</div>
              <pre className="text-xs whitespace-pre-wrap">{errorMsg}</pre>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 border border-[var(--border)] hover:border-[var(--fg)]"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  setState('review');
                  setErrorMsg('');
                }}
                className="flex-1 py-2 border border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
              >
                Försök igen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
