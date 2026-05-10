'use client';

import { useEffect, useRef, useState } from 'react';
import { useActiveWallet } from '@/lib/active-wallet';
import { BorshAccountsCoder, type Idl } from '@coral-xyz/anchor';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import idl from '@/lib/anchor-idl.json';
import { getConnection, PROGRAM_ID } from '@/lib/anchor-client';
import { hexCenter } from '@/lib/h3-utils';
import { TIER_FILL } from '@/lib/tier';
import type { ClaimedTile } from '@/types/tile';
import type { MapRef } from 'react-map-gl/mapbox';

const coder = new BorshAccountsCoder(idl as Idl);

type DecodedTile = {
  owner: PublicKey;
  h3Id: { toString: (radix?: number) => string };
  claimedAt: { toNumber: () => number };
  tier: number;
  pricePaid: { toString: () => string };
  bump: number;
};

export function MyTilesPanel({ mapRef }: { mapRef: React.RefObject<MapRef | null> }) {
  const { publicKey, connected } = useActiveWallet();
  const [tiles, setTiles] = useState<ClaimedTile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!connected || !publicKey) {
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
            { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
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
          } catch { /* skip undecodable */ }
        }
        out.sort((a, b) => b.claimedAt - a.claimedAt);
        setTiles(out);
      } finally {
        if (id === reqIdRef.current) setLoading(false);
      }
    })();
  }, [connected, publicKey]);

  const flyTo = (h3: string) => {
    const c = hexCenter(h3);
    mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 14, duration: 1500 });
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

  if (!connected) {
    return (
      <div className="flex flex-col gap-4">
        <span style={monoLabel}>Wallet required</span>
        <p className="text-sm" style={{ color: 'var(--dim)', lineHeight: 1.55 }}>
          Anslut wallet för att se dina tiles.
        </p>
      </div>
    );
  }
  if (loading) {
    return <p style={{ ...monoLabel, color: 'var(--dim-2)' }}>Loading…</p>;
  }
  if (!tiles || tiles.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <span style={monoLabel}>Empty</span>
        <p className="text-sm" style={{ color: 'var(--dim)', lineHeight: 1.55 }}>
          Du har inte claimat några tiles än.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span style={monoLabel}>Holdings</span>
        <span style={{ ...monoValue, color: 'var(--ink)' }}>{tiles.length}</span>
      </div>
      <ul style={{ borderTop: '1px solid var(--hair-2)' }}>
        {tiles.map((t) => (
          <li
            key={t.h3}
            className="flex items-center justify-between px-1 py-2.5"
            style={{ borderBottom: '1px solid var(--hair-2)' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: TIER_FILL[t.tier] }}
              />
              <span style={{ ...monoValue, color: 'var(--ink-2)' }}>{t.h3.slice(0, 9)}…</span>
              <span style={{ ...monoLabel, fontSize: '9.5px' }}>
                {(Number(t.pricePaid) / LAMPORTS_PER_SOL).toFixed(4)} SOL
              </span>
            </div>
            <button
              type="button"
              onClick={() => flyTo(t.h3)}
              className="px-2 transition-colors"
              style={{ ...monoLabel, fontSize: '9.5px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--signal)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim)')}
            >
              Fly →
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
