'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useActiveWallet } from '@/lib/active-wallet';
import { Flag } from '@/components/flag';

type HexFloor = {
  h3Id: string;
  countryIso: string;
  countryName: string;
  claimCount: number;
  floor: number;
  claimed: null | { owner: string; purchasePrice: number; claimedAt: string };
};

const fmt = (n: number) => n.toFixed(3);
const short = (a: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '—');
const grouped = (n: number) => n.toLocaleString('en-US');

/**
 * Primary-claim pricing for the active hex. Shows the live country floor
 * (3 decimals), claim count, and either a Claim button or the owner +
 * price paid. Polls every 5s so the floor tracks claims elsewhere.
 */
export function HexPricingCard({ h3 }: { h3: string | null }) {
  const wallet = useActiveWallet();
  const [data, setData] = useState<HexFloor | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!h3) return;
    const id = ++reqId.current;
    try {
      const r = await fetch(`/api/hex-floor?h3=${encodeURIComponent(h3)}`, {
        cache: 'no-store',
      });
      const j = await r.json();
      if (id !== reqId.current) return; // stale
      if (!r.ok) {
        setErr(j.error ?? 'lookup failed');
        setData(null);
      } else {
        setErr(null);
        setData(j as HexFloor);
      }
    } catch {
      if (id === reqId.current) setErr('network error');
    }
  }, [h3]);

  useEffect(() => {
    setData(null);
    setErr(null);
    if (!h3) return;
    setLoading(true);
    load().finally(() => setLoading(false));
    const t = window.setInterval(load, 5000); // live floor updates
    return () => window.clearInterval(t);
  }, [h3, load]);

  const claim = useCallback(async () => {
    if (!h3 || !wallet.address) return;
    setClaiming(true);
    setErr(null);
    try {
      const r = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ h3, owner: wallet.address }),
      });
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? 'claim failed');
      await load();
    } catch {
      setErr('network error');
    } finally {
      setClaiming(false);
    }
  }, [h3, wallet.address, load]);

  if (!h3) return null;

  return (
    <div
      className="rounded-[14px] p-3.5"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.10) 100%)',
        border: '1px solid rgba(255,255,255,0.45)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Flag code={data?.countryIso} size={18} />
        <span className="truncate text-[14px] font-semibold text-foreground">
          {data?.countryName ?? (loading ? 'Locating…' : '—')}
        </span>
        {loading && <Loader2 size={13} className="animate-spin text-foreground/50" />}
      </div>

      {err && !data && (
        <p className="text-[12px] text-red-600/80">{err}</p>
      )}

      {data && (
        <>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-foreground/55">
                Current floor
              </div>
              <div className="text-[22px] font-bold leading-tight tabular-nums text-foreground">
                ${fmt(data.floor)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.08em] text-foreground/55">
                Claims
              </div>
              <div className="text-[15px] font-semibold tabular-nums text-foreground">
                {grouped(data.claimCount)}
              </div>
            </div>
          </div>

          {data.claimed ? (
            <div
              className="mt-3 rounded-[10px] px-3 py-2 text-[12.5px]"
              style={{ background: 'rgba(255,255,255,0.30)' }}
            >
              <div className="flex justify-between">
                <span className="text-foreground/60">Owner</span>
                <span className="font-medium text-foreground">
                  {short(data.claimed.owner)}
                </span>
              </div>
              <div className="mt-0.5 flex justify-between">
                <span className="text-foreground/60">Paid</span>
                <span className="font-semibold tabular-nums text-foreground">
                  ${fmt(data.claimed.purchasePrice)}
                </span>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={!wallet.connected || claiming}
                onClick={claim}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-[13.5px] font-semibold text-white transition-[filter] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
                  boxShadow: '0 6px 18px -8px rgba(20,184,166,0.6)',
                }}
              >
                {claiming && <Loader2 size={14} className="animate-spin" />}
                {wallet.connected
                  ? `Claim for $${fmt(data.floor)}`
                  : 'Connect wallet to claim'}
              </button>
              {err && <p className="mt-1.5 text-[12px] text-red-600/80">{err}</p>}
            </>
          )}
        </>
      )}
    </div>
  );
}
