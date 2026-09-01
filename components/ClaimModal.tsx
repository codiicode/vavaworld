'use client';

import { useEffect, useMemo, useState } from 'react';
import { hexCenter } from '@/lib/h3-utils';
import { classifyTier } from '@/lib/tier';
import { useActiveWallet } from '@/lib/active-wallet';
import { useUserProfile } from '@/lib/use-user-profile';
import { useHexLocations } from '@/lib/use-hex-locations';
import { useTiles } from '@/lib/use-tiles';
import { useClaimedRegistry } from '@/lib/use-claimed-registry';
import { useCountryCounts } from '@/lib/use-country-counts';
import { buildClaimCall, buildUsdgApproveCall, fetchQuotes, type PayCurrency } from '@/lib/claim-chain-evm';
import { USDG_ADDRESS } from '@/lib/evm';
import { getPublicClient } from '@/lib/evm';
import { dispatchClaimDone } from '@/lib/claim-events';
import { PRICING } from '@/lib/pricing';
import { Flag } from '@/components/flag';



// Fixed white-on-dark-glass, matching the /map chrome the modal floats over.
const EYEBROW =
  'text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55';
const DARK_PILL =
  'rounded-full border border-white/20 bg-white/[0.06] text-white transition-colors hover:bg-white/[0.12]';

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
  const profile = useUserProfile();
  const locations = useHexLocations(selectedHexes);
  const [state, setState] = useState<State>('review');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [txSig, setTxSig] = useState<string>('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  // '$' is the language of the UI; the currency picker only decides which
  // asset settles the dollars: ETH (default) or USDG 1:1.
  const [currency, setCurrency] = useState<PayCurrency>('eth');

  // NEVER charge for hexes someone already owns: the selection can contain
  // claimed cells (area select / mark-closest sweeps them up). Without this
  // filter the user pays SOL for the whole batch and the claimed hex's
  // mirror insert then fails - money spent, nothing received.
  const allSelected = useMemo(() => Array.from(selectedHexes), [selectedHexes]);
  const { tiles: onchainClaimed } = useTiles(allSelected);
  const offchainClaimed = useClaimedRegistry();
  const claimable = allSelected.filter(
    (h3) => !onchainClaimed.get(h3) && !offchainClaimed.has(h3),
  );
  const excludedCount = allSelected.length - claimable.length;
  const items = claimable.map((h3) => {
    const c = hexCenter(h3);
    return { h3, tier: classifyTier(c.lat, c.lng) };
  });

  // USD-spec pricing curve per country: floor(n) = 0.10 + n × 0.00001. Each
  // hex in the same country pays the next floor after the previous one in
  // the batch. The treasury settles in SOL via SOL_USD reference rate.
  const isos = items
    .map((it) => locations.get(it.h3)?.countryCode)
    .filter((iso): iso is string => Boolean(iso));
  const countryCounts = useCountryCounts(isos);
  const localOffset: Record<string, number> = {};
  const perItemUsd = items.map((it) => {
    const iso = locations.get(it.h3)?.countryCode ?? 'INTL';
    const base = countryCounts.get(iso) ?? 0;
    const off = localOffset[iso] ?? 0;
    localOffset[iso] = off + 1;
    return PRICING.BASE_FLOOR_USD + (base + off) * PRICING.SLOPE_PER_CLAIM_USD;
  });
  const totalUsd = perItemUsd.reduce((s, u) => s + u, 0);
  // Live ETH/USD (server-cached Chainlink) so the modal can show the ETH
  // figure; the authoritative wei prices come signed from /api/quote.
  const [ethUsd, setEthUsd] = useState<number>(4500);
  useEffect(() => {
    let alive = true;
    fetch('/api/eth-price')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.ethUsd) setEthUsd(j.ethUsd);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const totalEth = totalUsd / ethUsd;

  // Shareable reveal link - built from the primary (first) hex's location.
  const buildShareUrl = (): string => {
    const first = items[0];
    const loc = first ? locations.get(first.h3) : undefined;
    const center = first ? hexCenter(first.h3) : { lat: 0, lng: 0 };
    const by = profile.username ?? wallet.address ?? 'someone';
    const params = new URLSearchParams({
      by,
      place: loc?.place ?? loc?.countryName ?? 'the map',
      country: loc?.countryCode ?? '',
      lat: center.lat.toFixed(4),
      lon: center.lng.toFixed(4),
      n: String(items.length),
      eth: totalEth.toFixed(totalEth < 0.01 ? 6 : 4),
    });
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vavaworld.fun';
    return `${origin}/c?${params.toString()}`;
  };

  const shareOnX = () => {
    const url = buildShareUrl();
    const first = items[0];
    const loc = first ? locations.get(first.h3) : undefined;
    const where = loc?.place ?? loc?.countryName ?? 'the map';
    const text = `I just claimed ${items.length} hex${items.length === 1 ? '' : 'es'} in ${where} on VAVAWORLD 🌍 Hold your ground:`;
    const u = new URL('https://twitter.com/intent/tweet');
    u.searchParams.set('text', text);
    u.searchParams.set('url', url);
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleConfirm = async () => {
    if (!wallet.connected || !wallet.address || !wallet.writeContract) {
      setState('error');
      setErrorMsg('Log in first');
      return;
    }
    setState('signing');

    try {
      const client = getPublicClient();
      const owner = wallet.address;

      // On-chain settlement. ONE quote round prices the whole basket and
      // returns one keeper-signed EIP-712 quote per chunk; each chunk is
      // ONE claim(...) transaction (up to 400 hexes) that the contract
      // splits 85/15. Without the signature it reverts, so pricing can
      // never be bypassed.
      const succeeded: string[] = [];
      let lastSig = '';

      const quotes = await fetchQuotes(items.map((it) => it.h3), owner, currency);

      const totalNeeded = quotes.reduce((s, q) => s + BigInt(q.totalWei), 0n);
      if (currency === 'eth') {
        // Balance guard before the wallet is asked to sign anything.
        const balance = await client.getBalance({ address: owner });
        if (balance < totalNeeded) {
          throw new Error('Insufficient balance for this claim');
        }
      } else {
        // $ path: one approve covering every chunk, then the claims can
        // draw it down via transferFrom.
        const approveHash = await wallet.writeContract({
          ...buildUsdgApproveCall(quotes[0]),
          args: [buildUsdgApproveCall(quotes[0]).args[0], totalNeeded],
        });
        await client.waitForTransactionReceipt({ hash: approveHash });
      }

      const mirrorChunk = async (q: (typeof quotes)[number]) => {
        // Mirror into Supabase (registry + pricing ledger). The server
        // verifies on-chain ownership before accepting.
        const mirrors = await Promise.allSettled(
          q.h3s.map((h3, i) =>
            fetch('/api/claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ h3, owner, quotedPriceUsd: q.perHexUsd[i] }),
            }).then((r) => (r.ok ? h3 : null)),
          ),
        );
        for (const m of mirrors) {
          if (m.status === 'fulfilled' && m.value) succeeded.push(m.value);
        }
      };

      setProgress({ done: 0, total: quotes.length });
      let done = 0;
      for (const q of quotes) {
        const hash = await wallet.writeContract(buildClaimCall(q));
        await client.waitForTransactionReceipt({ hash });
        await mirrorChunk(q);
        done += 1;
        setProgress({ done, total: quotes.length });
        lastSig = hash;
      }

      setTxSig(lastSig);
      dispatchClaimDone({ h3s: succeeded, txSig: lastSig });
      setState('confirmed');
      onConfirmed(succeeded);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      setState('error');
    }
  };

  // Group claimable hexes per country for the review list - a wall of raw
  // h3 ids says nothing; flag + place + running price does.
  const groups = (() => {
    const m = new Map<
      string,
      {
        iso: string;
        name: string;
        rows: Array<{ h3: string; label: string; tier: 1 | 2 | 3; usd: number }>;
        usd: number;
      }
    >();
    items.forEach((it, i) => {
      const loc = locations.get(it.h3);
      const iso = (loc?.countryCode ?? 'intl').toLowerCase();
      const g = m.get(iso) ?? {
        iso,
        name: loc?.countryName ?? 'Locating…',
        rows: [],
        usd: 0,
      };
      if (loc?.countryName) g.name = loc.countryName;
      g.rows.push({
        h3: it.h3,
        label: loc?.neighborhood ?? loc?.place ?? loc?.countryName ?? '…',
        tier: it.tier,
        usd: perItemUsd[i],
      });
      g.usd += perItemUsd[i];
      m.set(iso, g);
    });
    return Array.from(m.values());
  })();
  const showRows = items.length <= 12;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center p-4"
      style={{
        background: 'rgba(4, 8, 18, 0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="relative flex max-h-[86vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[24px] p-6 text-white md:p-7"
        style={{
          background:
            'linear-gradient(150deg, rgba(16, 24, 44, 0.94) 0%, rgba(9, 14, 28, 0.96) 100%)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow:
            '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        }}
      >
        {/* Soft top shine, same trick as .glass-panel::after */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(130% 55% at 50% -12%, rgba(255, 255, 255, 0.08), transparent 60%)',
          }}
        />

        <div className="relative mb-5 flex items-start justify-between">
          <div>
            <div className={EYEBROW}>Claim land</div>
            <div className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight">
              {items.length} {items.length === 1 ? 'hex' : 'hexes'}
              {groups.length === 1 && groups[0].name !== 'Locating…' && (
                <span className="text-white/60"> · {groups[0].name}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 flex-none place-items-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {state === 'review' && (
          <>
            {excludedCount > 0 && (
              <p className="relative mb-4 rounded-xl border border-white/12 bg-white/[0.07] px-3.5 py-2.5 text-[12px] leading-relaxed text-white/85">
                {excludedCount} selected {excludedCount === 1 ? 'hex is' : 'hexes are'} already
                owned and excluded - you only pay for the {items.length} below.
              </p>
            )}

            {items.length === 0 ? (
              <p className="relative mb-5 text-[13.5px] text-white/65">
                Every hex in this selection is already owned. Pick free hexes to claim.
              </p>
            ) : (
              <div className="relative -mx-1 mb-5 min-h-0 flex-1 overflow-y-auto px-1">
                <div className="flex flex-col gap-2.5">
                  {groups.map((g) => (
                    <div
                      key={g.iso}
                      className="rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Flag code={g.iso} size={20} />
                          <span className="truncate text-[14.5px] font-semibold">{g.name}</span>
                          <span className="flex-none rounded-full bg-white/10 px-2 py-0.5 text-[11px] tabular-nums text-white/70">
                            {g.rows.length} {g.rows.length === 1 ? 'hex' : 'hexes'}
                          </span>
                        </div>
                        <span className="flex-none text-[14px] font-semibold tabular-nums">
                          ${g.usd.toFixed(g.usd < 10 ? 4 : 2)}
                        </span>
                      </div>
                      {showRows && (
                        <div className="mt-2.5 flex flex-col border-t border-white/10 pt-1">
                          {g.rows.map((r) => (
                            <div
                              key={r.h3}
                              className="flex items-center justify-between gap-3 py-[7px]"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className="flex-none rounded px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider tabular-nums"
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.11)',
                                    color: 'var(--brand)',
                                  }}
                                >
                                  T{r.tier}
                                </span>
                                <span className="truncate text-[13px] text-white/85">
                                  {r.label}
                                </span>
                              </div>
                              <span className="flex-none text-[12.5px] tabular-nums text-white/70">
                                ${r.usd.toFixed(4)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative flex items-end justify-between border-t border-white/10 pt-4">
              <span className={EYEBROW}>Total</span>
              <div className="text-right">
                <div
                  className="text-[34px] font-semibold leading-none tracking-[-0.035em] tabular-nums"
                  style={{ color: '#ffffff', textShadow: '0 0 24px rgba(255, 255, 255, 0.28)' }}
                >
                  ${totalUsd.toFixed(totalUsd < 10 ? 4 : 2)}
                </div>
                {currency === 'eth' && (
                  <div className="mt-1.5 text-[11.5px] tabular-nums text-white/50">
                    settles as {totalEth.toFixed(6)} ETH
                  </div>
                )}
              </div>
            </div>

            {/* Pay-with picker: the price is in dollars either way. */}
            <div className="relative mt-4 flex items-center gap-2">
              <span className={`${EYEBROW} mr-1`}>Pay with</span>
              <button
                type="button"
                onClick={() => setCurrency('eth')}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  currency === 'eth'
                    ? 'border-white/70 bg-white text-[#06080d]'
                    : 'border-white/20 bg-white/[0.06] text-white/70 hover:bg-white/[0.12]'
                }`}
              >
                ETH
              </button>
              {USDG_ADDRESS && (
                <button
                  type="button"
                  onClick={() => setCurrency('usdg')}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    currency === 'usdg'
                      ? 'border-white/70 bg-white text-[#06080d]'
                      : 'border-white/20 bg-white/[0.06] text-white/70 hover:bg-white/[0.12]'
                  }`}
                >
                  USDG
                </button>
              )}
            </div>

            <div className="relative mt-5 flex gap-3">
              <button onClick={onClose} className={`${DARK_PILL} flex-1 py-3 text-[13.5px] font-medium`}>
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={items.length === 0}
                className="glass glass--cta relative flex-1 rounded-full py-3 text-[13.5px] font-bold tracking-[0.02em] transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                style={{ border: '1px solid rgba(255,255,255,0.24)' }}
              >
                Confirm claim
              </button>
            </div>
          </>
        )}

        {state === 'signing' && (
          <div className="relative flex flex-col items-center gap-4 py-12 text-center">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: '#ffffff', animation: 'claim-pulse 1.6s ease-in-out infinite' }}
            />
            <span className={EYEBROW}>
              {progress && progress.total > 1
                ? `Settling ${progress.done * 10 >= items.length ? items.length : progress.done * 10}/${items.length} hexes…`
                : 'Confirm in your wallet…'}
            </span>
            <style jsx>{`
              @keyframes claim-pulse {
                0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 18px rgba(255, 255, 255, 0.40); }
                50% { opacity: 0.35; transform: scale(0.8); box-shadow: 0 0 4px rgba(255, 255, 255, 0.16); }
              }
            `}</style>
          </div>
        )}

        {state === 'confirmed' && (
          <>
            <ClaimCelebration />
            <div className="relative flex flex-col items-center gap-3 py-8 text-center">
              <div className="relative grid place-items-center">
                <span
                  className="absolute inset-0 animate-ping rounded-full"
                  style={{ background: 'rgba(255, 255, 255, 0.20)', animationIterationCount: 2 }}
                />
                <div
                  className="relative grid h-12 w-12 place-items-center rounded-full text-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.13)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.32)',
                  }}
                >
                  ✓
                </div>
              </div>
              <div className="text-[17px] font-semibold">
                {items.length} {items.length === 1 ? 'hex' : 'hexes'} claimed
              </div>
              <a
                href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-medium text-white/55 underline underline-offset-4 transition-colors hover:text-white"
              >
                View on Solscan →
              </a>
            </div>
            <div className="relative flex gap-3">
              <button onClick={onClose} className={`${DARK_PILL} flex-1 py-3 text-[13.5px] font-medium`}>
                Close
              </button>
              <button
                onClick={shareOnX}
                className="glass glass--cta relative flex-1 rounded-full py-3 text-[13.5px] font-bold tracking-[0.02em] transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0"
                style={{ border: '1px solid rgba(255,255,255,0.24)' }}
              >
                Share your claim
              </button>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="relative mb-4 py-2">
              <div className={`${EYEBROW} mb-2.5 !text-white/60`}>Error</div>
              <pre className="max-h-[260px] overflow-y-auto whitespace-pre-wrap text-[11.5px] leading-relaxed text-white/75">
                {errorMsg}
              </pre>
            </div>
            <div className="relative flex gap-3">
              <button onClick={onClose} className={`${DARK_PILL} flex-1 py-3 text-[13.5px] font-medium`}>
                Cancel
              </button>
              <button
                onClick={() => {
                  setState('review');
                  setErrorMsg('');
                }}
                className="glass glass--cta relative flex-1 rounded-full py-3 text-[13.5px] font-bold tracking-[0.02em]"
                style={{ border: '1px solid rgba(255,255,255,0.24)' }}
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

const CONFETTI_COLORS = ['#1d5e95', '#f59e0b', '#10b981', '#fb7185', '#8b5cf6'];

/**
 * One-shot confetti burst overlaid on the success state. Pure CSS - each piece
 * gets a deterministic angle/distance from its index so there's no layout
 * thrash and nothing to clean up.
 */
function ClaimCelebration() {
  const pieces = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const dist = 90 + (i % 4) * 26;
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist - 30, // bias upward so they arc then fall
      rot: (i % 2 ? 1 : -1) * (180 + i * 24),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: (i % 5) * 30,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              background: p.color,
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              '--rot': `${p.rot}deg`,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
      <style jsx>{`
        .confetti-piece {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          opacity: 0;
          animation: confetti-fly 900ms ease-out forwards;
        }
        @keyframes confetti-fly {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(0.6);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(1);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .confetti-piece {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
