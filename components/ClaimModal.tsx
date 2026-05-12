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
  const wallet = useActiveWallet();
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
  const expectedMax = (totalLamports * 102n) / 100n;

  const handleConfirm = async () => {
    if (!wallet.connected || !wallet.publicKey || !wallet.signAndSendTransaction) {
      setState('error');
      setErrorMsg('Wallet not connected');
      return;
    }
    setState('signing');
    try {
      const connection = getConnection();
      const program = new Program<Tiles>(idl as Idl, { connection });
      const h3Bns = items.map((it) => new BN(BigInt('0x' + it.h3).toString()));
      const tilePdas = items.map((it) => tilePda(it.h3, programIdPk)[0]);

      const ix = await program.methods
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
        .instruction();

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      // The claim instruction's tier classifier walks 102 cities with libm-based
      // haversine and burns way past the 200K default CU limit. Bump to 1M up
      // front for headroom (Solana allows up to 1.4M per tx). Scales linearly
      // with batch size, so we add ~150K extra per tile on top of a base 400K.
      const computeUnits = Math.min(1_400_000, 400_000 + items.length * 150_000);
      const tx = new Transaction({
        feePayer: wallet.publicKey,
        recentBlockhash: blockhash,
      })
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }))
        .add(ix);

      // Simulate before sending — if the program rejects, we get the on-chain logs
      // (Anchor custom errors, account constraint failures, etc.) and can show them
      // instead of the opaque "simulation failed" message Privy bubbles up.
      const sim = await connection.simulateTransaction(tx, undefined, [wallet.publicKey]);
      if (sim.value.err) {
        const logs = sim.value.logs ?? [];
        const programLog = logs.find((l) => l.includes('AnchorError') || l.includes('failed:') || l.includes('Program log: Error'));
        const friendly = programLog ?? `Simulation rejected: ${JSON.stringify(sim.value.err)}`;
        console.error('[claim] simulation failed', { err: sim.value.err, logs });
        throw new Error(friendly + (logs.length ? '\n\nFull logs:\n' + logs.join('\n') : ''));
      }

      const sig = await wallet.signAndSendTransaction(tx);
      await connection.confirmTransaction(sig, 'confirmed');

      setTxSig(sig);
      setState('confirmed');
      onConfirmed(items.map((it) => it.h3));
    } catch (e: unknown) {
      setState('error');
      setErrorMsg(e instanceof Error ? e.message : String(e));
    }
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
          <h2 style={uiLabel}>Claim · {items.length} {items.length === 1 ? 'tile' : 'tiles'}</h2>
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
          <div className="py-12 text-center flex flex-col items-center gap-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--signal)',
                animation: 'pulse 1.6s ease-in-out infinite',
              }}
            />
            <span style={uiLabel}>Signing transaction…</span>
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
                {items.length} {items.length === 1 ? 'tile' : 'tiles'} claimed
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
