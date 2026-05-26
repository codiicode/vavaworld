'use client';

import { useState } from 'react';
import { ComputeBudgetProgram, LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import { BN, Program, type Idl } from '@coral-xyz/anchor';
import { hexCenter } from '@/lib/h3-utils';
import { classifyTier } from '@/lib/tier';
import { quoteBatch } from '@/lib/quote';
import { useCounters } from '@/lib/use-counters';
import { useActiveWallet } from '@/lib/active-wallet';
import { tilePda, counterPda } from '@/lib/tile-pda';
import { getConnection, PROGRAM_ID } from '@/lib/anchor-client';
import { dispatchClaimDone } from '@/lib/claim-events';
import idl from '@/lib/anchor-idl.json';
import type { Tiles } from '@/lib/anchor-types';

const programIdPk = new PublicKey(PROGRAM_ID);

const uiLabel: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--dim)',
  fontWeight: 500,
};

const monoNum: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '12px',
  fontFeatureSettings: '"tnum"',
};

type State = 'review' | 'signing' | 'confirmed' | 'partial' | 'error';

// Each claim ix burns ~550K CUs per tile on BPF and a TX caps at 1.4M, so
// the practical multi-tile batch is 2. Anything bigger needs the on-chain
// classifier optimised; until then we chunk client-side.
const CLAIM_CHUNK_SIZE = 2;

function chunk<T>(arr: ReadonlyArray<T>, size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function ClaimModal({
  selectedHexes,
  onClose,
  onConfirmed,
}: {
  selectedHexes: Set<string>;
  onClose: () => void;
  onConfirmed: (h3s: string[]) => void;
}) {
  const wallet = useActiveWallet();
  const counters = useCounters();
  const [state, setState] = useState<State>('review');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [txSig, setTxSig] = useState<string>('');
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    succeeded: string[];
  } | null>(null);

  const items = Array.from(selectedHexes).map((h3) => {
    const c = hexCenter(h3);
    return { h3, tier: classifyTier(c.lat, c.lng) };
  });
  const totalLamports = quoteBatch(items, counters);
  const totalSol = Number(totalLamports) / LAMPORTS_PER_SOL;

  const batches = chunk(items, CLAIM_CHUNK_SIZE);
  const totalBatches = batches.length;

  const handleConfirm = async () => {
    if (!wallet.connected || !wallet.publicKey || !wallet.signAndSendTransaction) {
      setState('error');
      setErrorMsg('Wallet not connected');
      return;
    }
    setState('signing');
    setProgress({ current: 0, total: totalBatches, succeeded: [] });

    const connection = getConnection();
    const program = new Program<Tiles>(idl as Idl, { connection });
    const succeeded: string[] = [];
    let lastSig = '';

    // Sequential — Solana fee payer + nonce ordering would race if we sent in
    // parallel. Each batch ≤ CLAIM_CHUNK_SIZE so we stay under the CU cap.
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      setProgress({ current: i + 1, total: totalBatches, succeeded: [...succeeded] });
      try {
        const batchLamports = quoteBatch(batch, counters);
        const batchExpectedMax = (batchLamports * 102n) / 100n;

        const h3Bns = batch.map((it) => new BN(BigInt('0x' + it.h3).toString()));
        const tilePdas = batch.map((it) => tilePda(it.h3, programIdPk)[0]);

        const ix = await program.methods
          .claim(h3Bns, new BN(batchExpectedMax.toString()))
          .accounts({
            claimer: wallet.publicKey,
            t1Counter: counterPda(1, programIdPk)[0],
            t2Counter: counterPda(2, programIdPk)[0],
            t3Counter: counterPda(3, programIdPk)[0],
          })
          .remainingAccounts(
            tilePdas.map((p) => ({ pubkey: p, isWritable: true, isSigner: false })),
          )
          .instruction();

        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        const tx = new Transaction({
          feePayer: wallet.publicKey,
          recentBlockhash: blockhash,
        })
          .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }))
          .add(ix);

        const sim = await connection.simulateTransaction(tx, undefined, [wallet.publicKey]);
        if (sim.value.err) {
          const logs = sim.value.logs ?? [];
          const programLog = logs.find((l) =>
            l.includes('AnchorError') || l.includes('failed:') || l.includes('Program log: Error'),
          );
          const friendly = programLog ?? `Simulation rejected: ${JSON.stringify(sim.value.err)}`;
          throw new Error(friendly + (logs.length ? '\n\nFull logs:\n' + logs.join('\n') : ''));
        }

        const sig = await wallet.signAndSendTransaction(tx);
        await connection.confirmTransaction(sig, 'confirmed');
        lastSig = sig;
        const justClaimed = batch.map((b) => b.h3);
        succeeded.push(...justClaimed);
        // Fire per-batch so /profile + counters update progressively, not just
        // at the end. Each batch is a separate "property" in the grouped view
        // because Postgres now() advances per batch insert.
        dispatchClaimDone({ h3s: justClaimed, txSig: sig });
        setProgress({ current: i + 1, total: totalBatches, succeeded: [...succeeded] });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErrorMsg(
          succeeded.length > 0
            ? `Stopped at batch ${i + 1}/${totalBatches} (${succeeded.length} hexes claimed before this failed):\n\n${msg}`
            : msg,
        );
        setTxSig(lastSig);
        setState(succeeded.length > 0 ? 'partial' : 'error');
        if (succeeded.length > 0) onConfirmed(succeeded);
        return;
      }
    }

    setTxSig(lastSig);
    setState('confirmed');
    onConfirmed(succeeded);
  };

  const primaryBtn: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '13.5px',
    fontWeight: 500,
    background: 'var(--signal)',
    color: '#ffffff',
    border: '1.5px solid var(--signal)',
    borderRadius: 999,
  };

  const ghostBtn: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '13.5px',
    fontWeight: 500,
    border: '1px solid var(--hairline)',
    background: 'transparent',
    color: 'var(--ink)',
    borderRadius: 999,
  };

  return (
    <div
      className="fixed inset-0 z-30 grid place-items-center"
      style={{
        background: 'rgba(29, 94, 149, 0.32)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="w-[460px] p-8"
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          border: '1.5px solid var(--hairline)',
          borderRadius: 18,
        }}
      >
        <div className="flex items-baseline justify-between mb-6">
          <h2 style={uiLabel}>Claim · {items.length} {items.length === 1 ? 'hex' : 'hexes'}</h2>
          <button
            onClick={onClose}
            style={{ ...uiLabel, color: 'var(--dim-2)', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim-2)')}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {state === 'review' && (
          <>
            <ul
              className="max-h-64 overflow-y-auto mb-5"
              style={{ borderTop: '1px solid var(--hair-2)', borderBottom: '1px solid var(--hair-2)' }}
            >
              {items.map((it) => (
                <li
                  key={it.h3}
                  className="flex justify-between px-1 py-2.5"
                  style={{ borderBottom: '1px solid var(--hair-2)' }}
                >
                  <span style={{ ...monoNum, color: 'var(--ink-2)' }}>{it.h3}</span>
                  <span style={{ ...uiLabel, fontSize: '10px' }}>T{it.tier}</span>
                </li>
              ))}
            </ul>
            {totalBatches > 1 && (
              <div
                className="mb-4 rounded-md px-3 py-2.5 text-[11.5px] leading-relaxed"
                style={{
                  background: 'rgba(245, 158, 11, 0.10)',
                  border: '1px solid rgba(245, 158, 11, 0.30)',
                  color: '#78350f',
                }}
              >
                Big batch — sent as <b>{totalBatches} transactions</b> of up to{' '}
                {CLAIM_CHUNK_SIZE} hexes each (the on-chain tier classifier&apos;s
                compute budget caps a single TX). Don&apos;t close this window
                until it&apos;s done.
              </div>
            )}
            <div className="flex items-baseline justify-between mb-7">
              <span style={uiLabel}>Estimated total</span>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: '36px',
                  lineHeight: 1,
                  color: 'var(--signal)',
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {totalSol.toFixed(4)}
                <span style={{ ...uiLabel, marginLeft: '8px', fontStyle: 'normal' }}>SOL</span>
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 transition-colors"
                style={ghostBtn}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ink)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hairline)')}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 transition-all"
                style={primaryBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--signal-deep)';
                  e.currentTarget.style.borderColor = 'var(--signal-deep)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--signal)';
                  e.currentTarget.style.borderColor = 'var(--signal)';
                }}
              >
                Confirm claim
              </button>
            </div>
          </>
        )}

        {state === 'signing' && (
          <div className="py-10 text-center flex flex-col items-center gap-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--signal)',
                animation: 'pulse 1.6s ease-in-out infinite',
              }}
            />
            <span style={uiLabel}>
              {progress && progress.total > 1
                ? `Claiming batch ${progress.current}/${progress.total}…`
                : 'Signing transaction…'}
            </span>
            {progress && progress.total > 1 && (
              <>
                <div
                  className="mt-2 h-1.5 w-56 overflow-hidden rounded-full"
                  style={{ background: 'rgba(0,0,0,0.08)' }}
                >
                  <div
                    style={{
                      width: `${(progress.succeeded.length / items.length) * 100}%`,
                      height: '100%',
                      background: 'var(--signal)',
                      transition: 'width 220ms ease-out',
                    }}
                  />
                </div>
                <span style={{ ...monoNum, color: 'var(--dim)' }}>
                  {progress.succeeded.length} / {items.length} hexes claimed
                </span>
              </>
            )}
            <style jsx>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.35; transform: scale(0.85); }
              }
            `}</style>
          </div>
        )}

        {state === 'confirmed' && (
          <>
            <div className="py-8 text-center flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 rounded-full grid place-items-center"
                style={{ background: 'var(--signal-soft)', color: 'var(--signal)', fontSize: '20px' }}
              >
                ✓
              </div>
              <div style={{ ...uiLabel, color: 'var(--ink)' }}>
                {items.length} {items.length === 1 ? 'hex' : 'hexes'} claimed
              </div>
              <a
                href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                style={{ ...uiLabel, color: 'var(--signal)', textDecoration: 'underline' }}
              >
                View on Solscan →
              </a>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 transition-colors"
              style={ghostBtn}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hairline)')}
            >
              Close
            </button>
          </>
        )}

        {state === 'partial' && (
          <>
            <div className="py-4 mb-4">
              <div style={{ ...uiLabel, color: '#b45309', marginBottom: '10px' }}>
                Partially claimed
              </div>
              <div style={{ ...monoNum, color: 'var(--ink)', marginBottom: '12px' }}>
                {progress?.succeeded.length ?? 0} of {items.length} hexes claimed before stopping.
              </div>
              <pre
                className="whitespace-pre-wrap overflow-y-auto"
                style={{
                  maxHeight: 200,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11px',
                  color: 'var(--ink-2)',
                  lineHeight: 1.5,
                }}
              >
                {errorMsg}
              </pre>
              {txSig && (
                <a
                  href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block"
                  style={{ ...uiLabel, color: 'var(--signal)', textDecoration: 'underline' }}
                >
                  Last successful tx →
                </a>
              )}
            </div>
            <button onClick={onClose} className="w-full py-3 transition-colors" style={ghostBtn}>
              Close
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="py-4 mb-4">
              <div style={{ ...uiLabel, color: '#b91c1c', marginBottom: '10px' }}>Error</div>
              <pre
                className="whitespace-pre-wrap overflow-y-auto"
                style={{
                  maxHeight: 280,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11px',
                  color: 'var(--ink-2)',
                  lineHeight: 1.5,
                }}
              >
                {errorMsg}
              </pre>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 transition-colors" style={ghostBtn}>
                Cancel
              </button>
              <button
                onClick={() => {
                  setState('review');
                  setErrorMsg('');
                }}
                className="flex-1 py-3 transition-all"
                style={primaryBtn}
              >
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
