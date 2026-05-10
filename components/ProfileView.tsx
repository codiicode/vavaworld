'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BorshAccountsCoder, type Idl } from '@coral-xyz/anchor';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import idl from '@/lib/anchor-idl.json';
import { getConnection, PROGRAM_ID } from '@/lib/anchor-client';
import { useActiveWallet } from '@/lib/active-wallet';
import { TIER_FILL } from '@/lib/tier';
import type { ClaimedTile } from '@/types/tile';

const coder = new BorshAccountsCoder(idl as Idl);

type DecodedTile = {
  owner: PublicKey;
  h3Id: { toString: (radix?: number) => string };
  claimedAt: { toNumber: () => number };
  tier: number;
  pricePaid: { toString: () => string };
  bump: number;
};

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

const tierName = (t: 1 | 2 | 3) =>
  t === 1 ? 'City' : t === 2 ? 'Suburb' : 'Remote';

export function ProfileView() {
  const wallet = useActiveWallet();
  const [tiles, setTiles] = useState<ClaimedTile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const reqIdRef = useRef(0);

  // Fetch SOL balance
  useEffect(() => {
    if (!wallet.publicKey) {
      setBalance(null);
      return;
    }
    const conn: Connection = getConnection();
    let cancelled = false;
    (async () => {
      try {
        const lamports = await conn.getBalance(wallet.publicKey!);
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        if (!cancelled) setBalance(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet.publicKey]);

  // Fetch user's tiles
  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) {
      setTiles(null);
      return;
    }
    const id = ++reqIdRef.current;
    setLoading(true);
    (async () => {
      try {
        const conn = getConnection();
        const accs = await conn.getProgramAccounts(new PublicKey(PROGRAM_ID), {
          filters: [
            { dataSize: 66 },
            { memcmp: { offset: 8, bytes: wallet.publicKey!.toBase58() } },
          ],
        });
        if (id !== reqIdRef.current) return;
        const out: ClaimedTile[] = [];
        for (const acc of accs) {
          try {
            const decoded = coder.decode<DecodedTile>('Tile', acc.account.data);
            out.push({
              h3: decoded.h3Id.toString(16).padStart(15, '0'),
              owner: decoded.owner.toBase58(),
              tier: decoded.tier as 1 | 2 | 3,
              claimedAt: decoded.claimedAt.toNumber(),
              pricePaid: BigInt(decoded.pricePaid.toString()),
              bump: decoded.bump,
            });
          } catch {
            /* skip undecodable */
          }
        }
        out.sort((a, b) => b.claimedAt - a.claimedAt);
        setTiles(out);
      } finally {
        if (id === reqIdRef.current) setLoading(false);
      }
    })();
  }, [wallet.connected, wallet.publicKey]);

  // Loading SDK hydration
  if (!wallet.ready) {
    return null;
  }

  // Not signed in
  if (!wallet.connected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-md text-center flex flex-col gap-6">
          <span style={monoLabel}>Profile</span>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '40px',
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
            }}
          >
            Sign in to view <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: 'var(--signal)' }}>your world</span>.
          </h1>
          <p style={{ color: 'var(--dim)', fontSize: '15px', lineHeight: 1.55 }}>
            Connect to see your wallet, your tiles, and your portfolio value.
          </p>
          <button
            onClick={wallet.login}
            className="self-center transition-all"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '13.5px',
              fontWeight: 500,
              padding: '12px 24px',
              background: 'var(--signal)',
              color: '#000',
              border: '1px solid var(--signal)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = '')}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const totalSpent = tiles
    ? tiles.reduce((sum, t) => sum + Number(t.pricePaid) / LAMPORTS_PER_SOL, 0)
    : 0;
  const tierCounts = { 1: 0, 2: 0, 3: 0 };
  tiles?.forEach((t) => {
    tierCounts[t.tier] += 1;
  });

  return (
    <div className="min-h-screen px-6 md:px-10" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-12">

        {/* Header */}
        <div className="flex flex-col gap-3">
          <span style={monoLabel}>Profile</span>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(32px, 4vw, 56px)',
              fontWeight: 500,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
            }}
          >
            Your <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: 'var(--signal)' }}>portfolio</span>
          </h1>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: 'var(--hairline)', border: '1px solid var(--hairline)' }}>
          <Stat label="Wallet" value={shortAddr(wallet.address ?? '')} mono />
          <Stat label="Balance" value={balance !== null ? balance.toFixed(4) : '—'} unit="SOL" />
          <Stat label="Tiles owned" value={tiles ? String(tiles.length) : '—'} />
          <Stat label="Total spent" value={totalSpent.toFixed(4)} unit="SOL" />
        </div>

        {/* Tier breakdown */}
        {tiles && tiles.length > 0 && (
          <div className="flex gap-6 flex-wrap" style={monoLabel}>
            <span><span style={{ color: TIER_FILL[1] }}>●</span> {tierCounts[1]} City</span>
            <span><span style={{ color: TIER_FILL[2] }}>●</span> {tierCounts[2]} Suburb</span>
            <span><span style={{ color: TIER_FILL[3] }}>●</span> {tierCounts[3]} Remote</span>
          </div>
        )}

        {/* Tiles section */}
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <span style={monoLabel}>Your tiles</span>
            <Link
              href="/map"
              style={{ ...monoLabel, textDecoration: 'none' }}
              className="transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--signal)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim)')}
            >
              Open map →
            </Link>
          </div>

          {loading && <p style={{ ...monoLabel, color: 'var(--dim-2)' }}>Loading tiles…</p>}

          {!loading && tiles && tiles.length === 0 && (
            <div
              className="flex flex-col items-center text-center gap-4 py-16"
              style={{ border: '1px solid var(--hairline)' }}
            >
              <p style={{ color: 'var(--dim)', fontSize: '15px', lineHeight: 1.55 }}>
                You don&apos;t own any tiles yet.
              </p>
              <Link
                href="/map"
                className="transition-all"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '13.5px',
                  fontWeight: 500,
                  padding: '10px 20px',
                  background: 'var(--signal)',
                  color: '#000',
                  textDecoration: 'none',
                }}
              >
                Claim your first tile →
              </Link>
            </div>
          )}

          {!loading && tiles && tiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px" style={{ background: 'var(--hairline)', border: '1px solid var(--hairline)' }}>
              {tiles.map((t) => (
                <Link
                  key={t.h3}
                  href={`/map#${t.h3}`}
                  className="flex flex-col gap-3 p-5 transition-colors"
                  style={{ background: 'var(--bg)', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-2"
                      style={{ ...monoLabel, fontSize: '9.5px' }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: TIER_FILL[t.tier] }}
                      />
                      Tier {t.tier} · {tierName(t.tier)}
                    </span>
                    <span style={{ ...monoLabel, fontSize: '9.5px', color: 'var(--dim-2)' }}>
                      {new Date(t.claimedAt * 1000).toISOString().slice(0, 10)}
                    </span>
                  </div>
                  <div style={{ ...monoValue, color: 'var(--ink)' }}>
                    {t.h3.slice(0, 9)}…
                  </div>
                  <div style={{ ...monoLabel, fontSize: '10px', color: 'var(--dim)' }}>
                    Paid {(Number(t.pricePaid) / LAMPORTS_PER_SOL).toFixed(4)} SOL
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity placeholder */}
        <div className="flex flex-col gap-5">
          <span style={monoLabel}>Activity</span>
          <div
            className="py-12 text-center"
            style={{ border: '1px solid var(--hairline)' }}
          >
            <p style={{ color: 'var(--dim-2)', ...monoLabel }}>Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  mono,
}: {
  label: string;
  value: string;
  unit?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 p-5" style={{ background: 'var(--bg)' }}>
      <span style={monoLabel}>{label}</span>
      <span
        style={{
          fontFamily: mono ? "'JetBrains Mono', monospace" : "'Instrument Serif', serif",
          fontSize: mono ? '14px' : '32px',
          fontStyle: mono ? 'normal' : 'normal',
          color: 'var(--ink)',
          lineHeight: 1,
        }}
      >
        {value}
        {unit && (
          <span style={{ ...monoLabel, marginLeft: '6px', fontSize: '10px' }}>
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

function shortAddr(addr: string): string {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
