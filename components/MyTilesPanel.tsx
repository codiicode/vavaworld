'use client';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
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
  const { publicKey, connected } = useWallet();
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

  if (!connected) {
    return <p className="text-[var(--muted)] text-sm">Anslut wallet för att se dina tiles.</p>;
  }
  if (loading) {
    return <p className="text-[var(--muted)] text-sm">Laddar…</p>;
  }
  if (!tiles || tiles.length === 0) {
    return <p className="text-[var(--muted)] text-sm">Du har inte claimat några tiles än.</p>;
  }
  return (
    <ul className="flex flex-col">
      {tiles.map((t) => (
        <li
          key={t.h3}
          className="flex items-center justify-between px-3 py-2 text-sm border-b border-[var(--border)] last:border-b-0"
        >
          <div className="flex items-center gap-3">
            <span className="inline-block w-2 h-2" style={{ background: TIER_FILL[t.tier] }} />
            <span className="font-mono text-xs">{t.h3.slice(0, 7)}…</span>
            <span className="text-[var(--muted)] text-xs">
              {(Number(t.pricePaid) / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </span>
          </div>
          <button
            type="button"
            onClick={() => flyTo(t.h3)}
            className="text-[var(--muted)] hover:text-[var(--fg)] text-xs"
          >
            ↗ fly to
          </button>
        </li>
      ))}
    </ul>
  );
}
