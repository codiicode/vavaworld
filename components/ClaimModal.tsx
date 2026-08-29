'use client';

import { useEffect, useMemo, useState } from 'react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { hexCenter } from '@/lib/h3-utils';
import { classifyTier } from '@/lib/tier';
import { useActiveWallet } from '@/lib/active-wallet';
import { useUserProfile } from '@/lib/use-user-profile';
import { useHexLocations } from '@/lib/use-hex-locations';
import { useTiles } from '@/lib/use-tiles';
import { useClaimedRegistry } from '@/lib/use-claimed-registry';
import { useCountryCounts } from '@/lib/use-country-counts';
import { getConnection } from '@/lib/anchor-client';
import { preflight } from '@/lib/preflight';
import { dispatchClaimDone } from '@/lib/claim-events';
import { PRICING, SOL_USD } from '@/lib/pricing';

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY;
const treasuryPk = TREASURY_ADDRESS ? new PublicKey(TREASURY_ADDRESS) : null;

const uiLabel: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--dim)',
  fontWeight: 500,
};

const monoNum: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '12px',
  fontFeatureSettings: '"tnum"',
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
  const profile = useUserProfile();
  const locations = useHexLocations(selectedHexes);
  const [state, setState] = useState<State>('review');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [txSig, setTxSig] = useState<string>('');

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
  // Live SOL/USD from Pyth (server-cached); falls back to the reference
  // rate so the modal always renders.
  const [solUsd, setSolUsd] = useState<number>(SOL_USD);
  useEffect(() => {
    let alive = true;
    fetch('/api/sol-price')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.solUsd) setSolUsd(j.solUsd);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const totalLamports = BigInt(Math.round((totalUsd / solUsd) * 1_000_000_000));
  const totalSol = Number(totalLamports) / 1_000_000_000;

  // Shareable reveal link - built from the primary (first) hex's location.
  const buildShareUrl = (): string => {
    const first = items[0];
    const loc = first ? locations.get(first.h3) : undefined;
    const center = first ? hexCenter(first.h3) : { lat: 0, lng: 0 };
    const by = profile.username ?? (wallet.publicKey ? wallet.publicKey.toBase58() : 'someone');
    const params = new URLSearchParams({
      by,
      place: loc?.place ?? loc?.countryName ?? 'the map',
      country: loc?.countryCode ?? '',
      lat: center.lat.toFixed(4),
      lon: center.lng.toFixed(4),
      n: String(items.length),
      sol: totalSol.toFixed(totalSol < 0.01 ? 5 : 3),
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
    if (!wallet.connected || !wallet.publicKey || !wallet.signAndSendTransaction) {
      setState('error');
      setErrorMsg('Wallet not connected');
      return;
    }
    if (!treasuryPk) {
      setState('error');
      setErrorMsg('Treasury address not configured (NEXT_PUBLIC_TREASURY)');
      return;
    }
    setState('signing');

    try {
      const connection = getConnection();

      // One SystemProgram.transfer for the batch total - primary claims now
      // pay the USD-spec floor in SOL straight to the treasury. The Tile
      // registry is off-chain in Supabase; on-chain Anchor program is kept
      // for the future bonding-curve resale path only.
      const ix = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: treasuryPk,
        lamports: Number(totalLamports),
      });

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction({
        feePayer: wallet.publicKey,
        recentBlockhash: blockhash,
      }).add(ix);

      // Balance guard + simulate before the wallet sees it, so a doomed
      // tx never triggers Phantom's "could be malicious" warning.
      await preflight({
        connection,
        feePayer: wallet.publicKey,
        tx,
        lamportsNeeded: Number(totalLamports),
      });

      const sig = await wallet.signAndSendTransaction(tx);
      await connection.confirmTransaction(sig, 'confirmed');

      // Mirror each hex into Supabase with the per-hex USD quote so the DB
      // function records the exact floor the user paid. Parallel - order
      // inside the same country is enforced by the SELECT FOR UPDATE in
      // claim_hex, so the count walks monotonically regardless of arrival.
      const owner = wallet.publicKey.toBase58();
      const mirrorResults = await Promise.allSettled(
        items.map((it, i) =>
          fetch('/api/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              h3: it.h3,
              owner,
              txHash: sig,
              quotedPriceUsd: perItemUsd[i],
            }),
          }).then((r) => (r.ok ? it.h3 : null)),
        ),
      );
      const succeeded = mirrorResults
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((h): h is string => h !== null);

      setTxSig(sig);
      dispatchClaimDone({ h3s: succeeded, txSig: sig });
      setState('confirmed');
      onConfirmed(succeeded);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      setState('error');
    }
  };

  const primaryBtn: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '13.5px',
    fontWeight: 500,
    background: 'var(--signal)',
    color: '#ffffff',
    border: '1.5px solid var(--signal)',
    borderRadius: 999,
  };

  const ghostBtn: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '13.5px',
    fontWeight: 500,
    border: '1px solid var(--hairline)',
    background: 'transparent',
    color: 'var(--ink)',
    borderRadius: 999,
  };

  return (
    <div
      className="force-light fixed inset-0 z-30 grid place-items-center"
      style={{
        background: 'rgba(29, 94, 149, 0.32)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="relative w-[calc(100vw-24px)] max-w-[460px] overflow-hidden p-6 md:p-8"
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          border: '1.5px solid var(--hairline)',
          borderRadius: 18,
        }}
      >
        <div className="flex items-baseline justify-between mb-6">
          <h2 style={uiLabel}>Claim · {items.length} {items.length === 1 ? 'hex' : 'hexes'}</h2>
          <button
            onClick={onClose}
            style={{ ...uiLabel, color: 'var(--dim-2)', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim-2)')}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {state === 'review' && (
          <>
            {excludedCount > 0 && (
              <p
                className="mb-4 rounded-md px-3 py-2 text-[12px] leading-relaxed"
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#92400e',
                }}
              >
                {excludedCount} selected {excludedCount === 1 ? 'hex is' : 'hexes are'} already
                owned by someone else and excluded - you only pay for the {items.length} below.
              </p>
            )}
            {items.length === 0 ? (
              <p className="mb-5 text-[13px]" style={{ color: 'var(--dim)' }}>
                Every hex in this selection is already owned. Pick free hexes to claim.
              </p>
            ) : (
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
                  <span style={{ ...monoNum, color: 'var(--ink-2)' }}>{it.h3}</span>
                  <span style={{ ...uiLabel, fontSize: '10px' }}>T{it.tier}</span>
                </li>
              ))}
            </ul>
            )}
            <div className="flex items-baseline justify-between mb-2">
              <span style={uiLabel}>Total</span>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: '36px',
                  lineHeight: 1,
                  color: 'var(--signal)',
                  fontFeatureSettings: '"tnum"',
                }}
              >
                ${totalUsd.toFixed(totalUsd < 10 ? 4 : 2)}
              </span>
            </div>
            <div
              className="mb-7 flex items-center justify-end gap-1"
              style={{ ...monoNum, color: 'var(--dim)' }}
            >
              <span>≈ {totalSol.toFixed(6)} SOL</span>
              <span style={{ opacity: 0.5 }}> · @ ${solUsd.toFixed(2)}/SOL</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 transition-colors"
                style={ghostBtn}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ink)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hairline)')}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={items.length === 0}
                className="flex-1 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={primaryBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--signal-deep)';
                  e.currentTarget.style.borderColor = 'var(--signal-deep)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--signal)';
                  e.currentTarget.style.borderColor = 'var(--signal)';
                }}
              >
                Confirm claim
              </button>
            </div>
          </>
        )}

        {state === 'signing' && (
          <div className="py-10 text-center flex flex-col items-center gap-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--signal)',
                animation: 'pulse 1.6s ease-in-out infinite',
              }}
            />
            <span style={uiLabel}>Signing transaction…</span>
            <style jsx>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.35; transform: scale(0.85); }
              }
            `}</style>
          </div>
        )}

        {state === 'confirmed' && (
          <>
            <ClaimCelebration />
            <div className="py-8 text-center flex flex-col items-center gap-3">
              <div className="relative grid place-items-center">
                <span
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: 'var(--signal-soft)', animationIterationCount: 2 }}
                />
                <div
                  className="relative w-10 h-10 rounded-full grid place-items-center"
                  style={{ background: 'var(--signal-soft)', color: 'var(--signal)', fontSize: '20px' }}
                >
                  ✓
                </div>
              </div>
              <div style={{ ...uiLabel, color: 'var(--ink)' }}>
                {items.length} {items.length === 1 ? 'hex' : 'hexes'} claimed
              </div>
              <a
                href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                style={{ ...uiLabel, color: 'var(--signal)', textDecoration: 'underline' }}
              >
                View on Solscan →
              </a>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 transition-colors"
                style={ghostBtn}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ink)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hairline)')}
              >
                Close
              </button>
              <button
                onClick={shareOnX}
                className="flex-1 py-3 transition-all"
                style={primaryBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--signal-deep)';
                  e.currentTarget.style.borderColor = 'var(--signal-deep)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--signal)';
                  e.currentTarget.style.borderColor = 'var(--signal)';
                }}
              >
                Share your claim
              </button>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="py-4 mb-4">
              <div style={{ ...uiLabel, color: '#b91c1c', marginBottom: '10px' }}>Error</div>
              <pre
                className="whitespace-pre-wrap overflow-y-auto"
                style={{
                  maxHeight: 280,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11px',
                  color: 'var(--ink-2)',
                  lineHeight: 1.5,
                }}
              >
                {errorMsg}
              </pre>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 transition-colors" style={ghostBtn}>
                Cancel
              </button>
              <button
                onClick={() => {
                  setState('review');
                  setErrorMsg('');
                }}
                className="flex-1 py-3 transition-all"
                style={primaryBtn}
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
