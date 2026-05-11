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

const uiLabel: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--signal)',
  fontWeight: 500,
};

const uiLabelMuted: React.CSSProperties = {
  ...uiLabel,
  color: 'var(--dim)',
};

const monoNum: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '12px',
  fontFeatureSettings: '"tnum"',
  color: 'var(--ink)',
};

const tierName = (t: 1 | 2 | 3) =>
  t === 1 ? 'City' : t === 2 ? 'Suburb' : 'Remote';

const cardBg = 'rgba(255, 255, 255, 0.62)';
const cardBorder = '1.5px solid rgba(29, 94, 149, 0.45)';
const cardRadius = 14;

export function ProfileView() {
  const wallet = useActiveWallet();
  const [tiles, setTiles] = useState<ClaimedTile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const reqIdRef = useRef(0);

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

  if (!wallet.ready) return null;

  if (!wallet.connected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-md text-center flex flex-col gap-6">
          <span style={uiLabel}>i — Profile</span>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '52px',
              fontWeight: 500,
              lineHeight: 1.0,
              letterSpacing: '-0.018em',
              color: 'var(--ink)',
              fontVariant: 'small-caps',
            }}
          >
            Sign in to view{' '}
            <em
              style={{
                fontVariant: 'normal',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--signal)',
              }}
            >
              your world.
            </em>
          </h1>
          <p
            style={{
              color: 'var(--ink-2)',
              fontSize: '17px',
              lineHeight: 1.55,
              fontStyle: 'italic',
              fontFamily: "'Cormorant Garamond', serif",
            }}
          >
            Connect to see your wallet, your tiles, and your portfolio value.
          </p>
          <button
            onClick={wallet.login}
            className="self-center transition-all"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '15.5px',
              fontWeight: 500,
              padding: '12px 28px',
              background: 'var(--signal)',
              color: '#ffffff',
              border: '1.5px solid var(--signal)',
              borderRadius: 999,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--signal-deep)';
              e.currentTarget.style.borderColor = 'var(--signal-deep)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--signal)';
              e.currentTarget.style.borderColor = 'var(--signal)';
            }}
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
    <div className="min-h-screen px-6 md:px-12" style={{ paddingTop: '120px', paddingBottom: '100px' }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-14">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <span style={uiLabel}>i — Profile</span>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(40px, 5vw, 72px)',
              fontWeight: 500,
              lineHeight: 0.96,
              letterSpacing: '-0.018em',
              color: 'var(--ink)',
              fontVariant: 'small-caps',
              textWrap: 'balance',
            }}
          >
            Your{' '}
            <em
              style={{
                fontVariant: 'normal',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--signal)',
              }}
            >
              portfolio.
            </em>
          </h1>
        </div>

        {/* Stats grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-0"
          style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: cardRadius,
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <Stat label="Wallet" value={shortAddr(wallet.address ?? '')} mono first />
          <Stat label="Balance" value={balance !== null ? balance.toFixed(4) : '—'} unit="SOL" />
          <Stat label="Tiles owned" value={tiles ? String(tiles.length) : '—'} />
          <Stat label="Total spent" value={totalSpent.toFixed(4)} unit="SOL" last />
        </div>

        {/* Tier breakdown */}
        {tiles && tiles.length > 0 && (
          <div className="flex gap-8 flex-wrap" style={uiLabelMuted}>
            <span>
              <span style={{ color: TIER_FILL[1] }}>●</span> {tierCounts[1]} City
            </span>
            <span>
              <span style={{ color: TIER_FILL[2] }}>●</span> {tierCounts[2]} Suburb
            </span>
            <span>
              <span style={{ color: TIER_FILL[3] }}>●</span> {tierCounts[3]} Remote
            </span>
          </div>
        )}

        {/* Tiles section */}
        <div className="flex flex-col gap-6">
          <div
            className="flex items-baseline justify-between pb-4"
            style={{ borderBottom: '1px solid var(--hairline)' }}
          >
            <div className="flex flex-col gap-2">
              <span style={uiLabelMuted}>ii — your tiles</span>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 'clamp(28px, 3vw, 44px)',
                  fontWeight: 500,
                  lineHeight: 1.0,
                  fontVariant: 'small-caps',
                  letterSpacing: '-0.012em',
                  color: 'var(--ink)',
                }}
              >
                The{' '}
                <em
                  style={{
                    fontVariant: 'normal',
                    fontStyle: 'italic',
                    color: 'var(--signal)',
                  }}
                >
                  register.
                </em>
              </h2>
            </div>
            <Link
              href="/map"
              style={{ ...uiLabelMuted, textDecoration: 'none' }}
              className="transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--signal)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim)')}
            >
              Open map →
            </Link>
          </div>

          {loading && <p style={{ ...uiLabelMuted, color: 'var(--dim-2)' }}>Loading tiles…</p>}

          {!loading && tiles && tiles.length === 0 && (
            <div
              className="flex flex-col items-center text-center gap-5 py-16"
              style={{
                background: cardBg,
                border: cardBorder,
                borderRadius: cardRadius,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <p
                style={{
                  color: 'var(--ink-2)',
                  fontSize: '17px',
                  lineHeight: 1.55,
                  fontStyle: 'italic',
                  fontFamily: "'Cormorant Garamond', serif",
                  maxWidth: 360,
                }}
              >
                You don&apos;t own any cells yet — the earth is still mostly unclaimed.
              </p>
              <Link
                href="/map"
                className="transition-all"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13.5px',
                  fontWeight: 500,
                  padding: '11px 22px',
                  background: 'var(--signal)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: 999,
                  border: '1.5px solid var(--signal)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--signal-deep)';
                  e.currentTarget.style.borderColor = 'var(--signal-deep)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--signal)';
                  e.currentTarget.style.borderColor = 'var(--signal)';
                }}
              >
                Claim your first cell →
              </Link>
            </div>
          )}

          {!loading && tiles && tiles.length > 0 && (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-0"
              style={{
                background: cardBg,
                border: cardBorder,
                borderRadius: cardRadius,
                overflow: 'hidden',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              {tiles.map((t, i) => (
                <Link
                  key={t.h3}
                  href={`/map#${t.h3}`}
                  className="flex flex-col gap-3 p-6 transition-colors"
                  style={{
                    textDecoration: 'none',
                    borderRight:
                      (i + 1) % 3 !== 0 ? '1px solid var(--hair-2)' : 'none',
                    borderBottom: '1px solid var(--hair-2)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.55)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-2"
                      style={{ ...uiLabelMuted, fontSize: '10px' }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: TIER_FILL[t.tier] }}
                      />
                      Tier {t.tier} · {tierName(t.tier)}
                    </span>
                    <span style={{ ...uiLabelMuted, fontSize: '10px', color: 'var(--dim-2)' }}>
                      {new Date(t.claimedAt * 1000).toISOString().slice(0, 10)}
                    </span>
                  </div>
                  <div style={{ ...monoNum, fontSize: '14px' }}>{t.h3.slice(0, 9)}…</div>
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontStyle: 'italic',
                      fontSize: '15px',
                      color: 'var(--ink-2)',
                    }}
                  >
                    Paid {(Number(t.pricePaid) / LAMPORTS_PER_SOL).toFixed(4)} SOL
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity placeholder */}
        <div className="flex flex-col gap-5">
          <div
            className="flex items-baseline justify-between pb-4"
            style={{ borderBottom: '1px solid var(--hairline)' }}
          >
            <span style={uiLabelMuted}>iii — activity</span>
          </div>
          <div
            className="py-14 text-center"
            style={{
              background: cardBg,
              border: cardBorder,
              borderRadius: cardRadius,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: '16px',
                color: 'var(--dim)',
              }}
            >
              A log of transfers and listings — coming soon.
            </p>
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
  last,
}: {
  label: string;
  value: string;
  unit?: string;
  mono?: boolean;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-2 p-6"
      style={{
        borderRight: !last ? '1px solid var(--hair-2)' : 'none',
      }}
    >
      <span style={{ ...uiLabelMuted, fontSize: '10.5px' }}>{label}</span>
      <span
        style={{
          fontFamily: mono
            ? "'Inter', sans-serif"
            : "'Inter', sans-serif",
          fontSize: mono ? '15px' : '32px',
          fontWeight: 300,
          letterSpacing: mono ? '0.02em' : '-0.02em',
          color: mono ? 'var(--ink)' : 'var(--signal)',
          lineHeight: 1,
          fontFeatureSettings: '"tnum"',
        }}
      >
        {value}
        {unit && (
          <span style={{ ...uiLabelMuted, marginLeft: '8px', fontSize: '10.5px' }}>
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
