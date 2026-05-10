'use client';

import { useState } from 'react';
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
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

const monoLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10.5px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--dim)',
};

const monoValue: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '12px',
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
  const expectedMax = (totalLamports * 102n) / 100n; // 2% slippage tolerance

  const handleConfirm = async () => {
    if (!wallet.connected || !wallet.publicKey || !wallet.signAndSendTransaction) {
      setState('error');
      setErrorMsg('Wallet not connected');
      return;
    }
    setState('signing');
    try {
      const connection = getConnection();
      // Build the claim instruction via Anchor (no provider needed — read-only program for ix building)
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
      const tx = new Transaction({
        feePayer: wallet.publicKey,
        recentBlockhash: blockhash,
      }).add(ix);

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

  return (
    <div className="fixed inset-0 z-30 grid place-items-center" style={{ background: 'rgba(7, 9, 11, 0.78)', backdropFilter: 'blur(8px)' }}>
      <div
        className="w-[440px] p-7"
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--hairline)',
        }}
      >
        <div className="flex items-baseline justify-between mb-6">
          <h2 style={monoLabel}>Claim · {items.length} {items.length === 1 ? 'tile' : 'tiles'}</h2>
          <button
            onClick={onClose}
            style={{ ...monoLabel, color: 'var(--dim-2)', cursor: 'pointer' }}
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
                  <span style={{ ...monoValue, color: 'var(--ink-2)' }}>{it.h3}</span>
                  <span style={{ ...monoLabel, fontSize: '9.5px' }}>T{it.tier}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between mb-7">
              <span style={monoLabel}>Estimated total</span>
              <span
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontSize: '32px',
                  lineHeight: 1,
                  color: 'var(--signal)',
                }}
              >
                {totalSol.toFixed(4)}
                <span style={{ ...monoLabel, marginLeft: '8px' }}>SOL</span>
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 transition-colors"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '13.5px',
                  fontWeight: 500,
                  border: '1px solid var(--hairline)',
                  background: 'transparent',
                  color: 'var(--ink)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ink)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hairline)')}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 transition-all"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '13.5px',
                  fontWeight: 500,
                  background: 'var(--signal)',
                  color: '#000',
                  border: '1px solid var(--signal)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.filter = '')}
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
                boxShadow: '0 0 12px var(--signal)',
                animation: 'pulse 1.6s ease-in-out infinite',
              }}
            />
            <span style={monoLabel}>Signing transaction…</span>
            <style jsx>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.35; }
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
              <div style={{ ...monoLabel, color: 'var(--ink)' }}>
                {items.length} {items.length === 1 ? 'tile' : 'tiles'} claimed
              </div>
              <a
                href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                style={{ ...monoLabel, color: 'var(--dim)', textDecoration: 'underline' }}
              >
                View on Solscan →
              </a>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 transition-colors"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '13.5px',
                fontWeight: 500,
                border: '1px solid var(--hairline)',
                background: 'transparent',
                color: 'var(--ink)',
              }}
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
              <div style={{ ...monoLabel, color: '#ff6b6b', marginBottom: '10px' }}>Error</div>
              <pre
                className="whitespace-pre-wrap"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  color: 'var(--ink-2)',
                  lineHeight: 1.5,
                }}
              >
                {errorMsg}
              </pre>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 transition-colors"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '13.5px',
                  fontWeight: 500,
                  border: '1px solid var(--hairline)',
                  background: 'transparent',
                  color: 'var(--ink)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setState('review');
                  setErrorMsg('');
                }}
                className="flex-1 py-3 transition-all"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '13.5px',
                  fontWeight: 500,
                  background: 'var(--signal)',
                  color: '#000',
                  border: '1px solid var(--signal)',
                }}
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
