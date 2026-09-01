'use client';

import { useCallback, useEffect, useState } from 'react';
import { Crown, Loader2, Swords } from 'lucide-react';
import { useActiveWallet } from '@/lib/active-wallet';
import { UserLink } from '@/components/user-link';
import { TIERS } from '@/lib/tokenomics-constants';

import { useUsdFmt } from '@/lib/usd';
const CARD = 'rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md';

type Throne = { country_iso: string; holder: string; seized_at: string; via: 'claim' | 'coup' };
type Coup = {
  id: string;
  challenger: string;
  incumbent: string;
  started_at: string;
  ends_at: string;
  status: 'active' | 'won' | 'defended';
  challenger_hexes_start: number;
  incumbent_hexes_start: number;
};
type ThroneData = {
  thrones: Throne[];
  coups: Coup[];
  earnings: { primaryUsd: number; secondarySol: number } | null;
  landFloor: number | null;
};

/**
 * The live throne of one country: holder + salary earned, active coup
 * countdown, and the claim/coup actions (signed wallet message; the
 * server verifies signature, on-chain stake and land atomically).
 */
export function ThronePanel({ iso }: { iso: string }) {
  const usd = useUsdFmt();
  const wallet = useActiveWallet();
  const [data, setData] = useState<ThroneData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(() => {
    fetch(`/api/thrones?country=${iso}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setData(null));
  }, [iso]);

  useEffect(refresh, [refresh]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const throne = data?.thrones[0] ?? null;
  const activeCoup = data?.coups.find((c) => c.status === 'active') ?? null;
  const presidentStake = TIERS.find((t) => t.key === 'president')!.threshold;

  const act = async (action: 'claim' | 'coup') => {
    if (!wallet.connected || !wallet.address || !wallet.signMessage) {
      setError('Log in with a wallet that can sign messages');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const message = `vava:throne:${action}:${iso}:${wallet.address}:ts=${Date.now()}`;
      const sig = await wallet.signMessage(message);
      const res = await fetch('/api/thrones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          countryIso: iso,
          address: wallet.address,
          message,
          signature: sig,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Action failed');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const coupLeft = activeCoup ? Math.max(0, new Date(activeCoup.ends_at).getTime() - now) : 0;

  return (
    <section className={`${CARD} p-6 md:p-7`}>
      <div className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
        <Crown size={13} />
        The throne
      </div>

      {!data ? (
        <div className="flex items-center gap-2 py-3 text-sm text-foreground/60">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : throne ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-foreground">
                <UserLink addr={throne.holder} />
              </div>
              <div className="mt-0.5 text-xs text-foreground/60">
                President since {new Date(throne.seized_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {throne.via === 'coup' ? ' · seized by coup' : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/60">
                Salary earned this reign
              </div>
              <div className="text-lg font-semibold tabular-nums text-foreground">
                ${data.earnings?.primaryUsd.toFixed(2) ?? '0.00'}
                <span className="ml-2 text-xs font-normal text-foreground/60">
                  + {usd(data.earnings?.secondarySol ?? 0)} trade cut
                </span>
              </div>
            </div>
          </div>

          {activeCoup ? (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
                <Swords size={15} />
                Coup underway
              </div>
              <p className="mt-1 text-sm text-foreground/70">
                <UserLink addr={activeCoup.challenger} /> ({activeCoup.challenger_hexes_start} hexes)
                is challenging <UserLink addr={activeCoup.incumbent} /> (
                {activeCoup.incumbent_hexes_start} hexes). Whoever owns more when the window
                closes takes the throne.
              </p>
              <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {fmtCountdown(coupLeft)}
              </div>
            </div>
          ) : (
            wallet.connected &&
            wallet.address !== throne.holder && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act('coup')}
                className="self-start rounded-xl border border-red-400/50 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/20 dark:text-red-300"
              >
                {busy ? 'Working…' : 'Attempt coup'}
              </button>
            )
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground/70">
            <span className="font-semibold text-foreground">This throne is vacant.</span>{' '}
            5% of every claim here is unclaimed salary. Requirements: own at least{' '}
            <span className="font-semibold tabular-nums">{data.landFloor ?? 250}</span> hexes in
            this country and stake{' '}
            <span className="font-semibold tabular-nums">{presidentStake.toLocaleString('en-US')}</span>{' '}
            $VAVA.
          </p>
          {wallet.connected && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void act('claim')}
              className="self-start rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {busy ? 'Working…' : 'Claim the throne'}
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </section>
  );
}

function fmtCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
