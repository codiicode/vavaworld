'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useActiveWallet } from '@/lib/active-wallet';
import { Flag } from '@/components/flag';

type HexFloor = {
  h3Id: string;
  countryIso: string;
  countryName: string;
  available: boolean;
  claimCount: number;
  currentFloor: number;
  nextFloor: number;
  claimed: null | { owner: string; purchasePrice: number; claimedAt: string };
  locked?: boolean;
  lockName?: string;
};

const fmt = (n: number) => n.toFixed(4);
const short = (a: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '-');
const grouped = (n: number) => n.toLocaleString('en-US');

/**
 * Primary-claim pricing for the active hex. Shows the live country floor
 * (3 decimals), claim count, and either a Claim button or the owner +
 * price paid. Polls every 15s (served from the CDN cache) so the floor tracks claims elsewhere.
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
    // Live floor updates - but pause polling while the tab is hidden so a
    // backgrounded map doesn't keep hammering /api/hex-floor on the interval.
    const tick = () => {
      if (!document.hidden) void load();
    };
    const t = window.setInterval(tick, 15000);
    const onVis = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [h3, load]);

  const claim = useCallback(async () => {
    if (!h3 || !wallet.address || !data) return;
    setClaiming(true);
    setErr(null);
    try {
      const r = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          h3,
          owner: wallet.address,
          quotedPriceUsd: data.currentFloor,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        // Stale-quote → re-quote silently, user can confirm again
        if (j.code === 'stale_quote') await load();
        setErr(j.error ?? 'claim failed');
      } else {
        await load();
      }
    } catch {
      setErr('network error');
    } finally {
      setClaiming(false);
    }
  }, [h3, wallet.address, data, load]);

  if (!h3) return null;

  return (
    <div
      className="rounded-[14px] p-3.5"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)',
        border: '1px solid rgba(255,255,255,0.16)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Flag code={data?.countryIso} size={18} />
        <span className="truncate text-[14px] font-semibold text-white">
          {data?.countryName ?? (loading ? 'Locating…' : '-')}
        </span>
        {loading && <Loader2 size={13} className="animate-spin text-white/50" />}
      </div>

      {err && !data && (
        <p className="text-[12px] text-white/60">{err}</p>
      )}

      {data && (
        <>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-white/55">
                Current floor
              </div>
              <div className="text-[22px] font-bold leading-tight tabular-nums text-white">
                ${fmt(data.currentFloor)}
              </div>
              <div className="mt-0.5 text-[11px] tabular-nums text-white/55">
                Next claim ${fmt(data.nextFloor)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.08em] text-white/55">
                Claims
              </div>
              <div className="text-[15px] font-semibold tabular-nums text-white">
                {grouped(data.claimCount)}
              </div>
            </div>
          </div>

          {data.locked ? (
            <div
              className="mt-3 rounded-[10px] px-3 py-2.5 text-[12.5px]"
              style={{
                background: 'rgba(212, 169, 78, 0.16)',
                border: '1px solid rgba(240, 201, 107, 0.4)',
              }}
            >
              <div className="font-semibold text-[#f0c96b]">🔒 Locked in the Vault</div>
              <div className="mt-0.5 text-white/70">
                {data.lockName ?? data.countryName} is not claimable yet. Watch{' '}
                <span className="font-medium text-white/90">@vavaworldnet</span> for the unlock.
              </div>
            </div>
          ) : data.claimed ? (
            <div
              className="mt-3 rounded-[10px] px-3 py-2 text-[12.5px]"
              style={{ background: 'rgba(255,255,255,0.10)' }}
            >
              <div className="flex justify-between">
                <span className="text-white/60">Owner</span>
                <span className="font-medium text-white">
                  {short(data.claimed.owner)}
                </span>
              </div>
              <div className="mt-0.5 flex justify-between">
                <span className="text-white/60">Paid</span>
                <span className="font-semibold tabular-nums text-white">
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
                  background: '#ffffff',
                  color: '#06080d',
                  boxShadow: '0 6px 18px -8px rgba(0, 0, 0, 0.6)',
                }}
              >
                {claiming && <Loader2 size={14} className="animate-spin" />}
                {wallet.connected
                  ? `Claim for $${fmt(data.currentFloor)}`
                  : 'Log in to claim'}
              </button>
              {err && <p className="mt-1.5 text-[12px] text-white/60">{err}</p>}
            </>
          )}
        </>
      )}
    </div>
  );
}
