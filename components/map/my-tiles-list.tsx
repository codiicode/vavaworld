'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BorshAccountsCoder, type Idl } from '@coral-xyz/anchor';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import type { MapRef } from 'react-map-gl/mapbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActiveWallet } from '@/lib/active-wallet';
import idl from '@/lib/anchor-idl.json';
import { getConnection, PROGRAM_ID } from '@/lib/anchor-client';
import { hexCenter } from '@/lib/h3-utils';
import { useHexLocations } from '@/lib/use-hex-locations';
import { flagEmoji } from '@/lib/flag-emoji';
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

export function MyTilesList({ mapRef }: { mapRef: React.RefObject<MapRef | null> }) {
  const { publicKey, connected } = useActiveWallet();
  const [tiles, setTiles] = useState<ClaimedTile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  const hexSet = useMemo(() => new Set(tiles?.map((t) => t.h3) ?? []), [tiles]);
  const locations = useHexLocations(hexSet);

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
    mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 15, duration: 1500 });
  };

  if (!connected) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Connect a wallet to see your tiles.
      </p>
    );
  }
  if (loading) {
    return (
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Loading…
      </span>
    );
  }
  if (!tiles || tiles.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        No tiles claimed yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Holdings
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{tiles.length}</span>
      </div>

      <ScrollArea className="max-h-[420px]">
        <div className="flex flex-col">
          {tiles.map((t) => {
            const loc = locations.get(t.h3);
            const flag = flagEmoji(loc?.countryCode);
            const title = loc?.neighborhood ?? loc?.place ?? loc?.countryName ?? 'Locating…';
            const c = hexCenter(t.h3);
            return (
              <button
                key={t.h3}
                type="button"
                onClick={() => flyTo(t.h3)}
                className="group -mx-2 flex cursor-pointer items-center justify-between rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="text-sm leading-none">{flag || '🌐'}</span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium leading-tight">{title}</span>
                    <span className="mt-0.5 text-[11px] leading-tight tabular-nums text-muted-foreground">
                      {Math.abs(c.lat).toFixed(3)}°{c.lat >= 0 ? 'N' : 'S'},{' '}
                      {Math.abs(c.lng).toFixed(3)}°{c.lng >= 0 ? 'E' : 'W'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
                    T{t.tier}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {(Number(t.pricePaid) / LAMPORTS_PER_SOL).toFixed(2)}
                  </span>
                  <ArrowRight
                    size={12}
                    className="text-muted-foreground transition-colors group-hover:text-foreground"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
