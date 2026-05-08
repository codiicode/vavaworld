'use client';

import { hexCenter } from '@/lib/h3-utils';
import { classifyTier, TIER_FILL } from '@/lib/tier';
import { quoteBatch } from '@/lib/quote';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCounters } from '@/lib/use-counters';

export function SelectionPanel({
  selectedHexes,
  onRemove,
  onClaim,
  walletConnected,
}: {
  selectedHexes: Set<string>;
  onRemove: (h3: string) => void;
  onClaim: () => void;
  walletConnected: boolean;
}) {
  const counters = useCounters();
  const items = Array.from(selectedHexes).map((h3) => {
    const c = hexCenter(h3);
    const tier = classifyTier(c.lat, c.lng);
    return { h3, tier };
  });
  const totalLamports = quoteBatch(items, counters);
  const totalSol = Number(totalLamports) / LAMPORTS_PER_SOL;

  if (items.length === 0) {
    return (
      <p className="text-[var(--muted)] text-sm">
        Klicka en hex för att markera. Shift-klicka för att lägga till fler. Ctrl-dra för att markera ett område.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest text-[var(--muted)]">
        {items.length} {items.length === 1 ? 'tile' : 'tiles'} markerade
      </p>

      <ul className="max-h-64 overflow-y-auto border border-[var(--border)]">
        {items.map((it) => (
          <li
            key={it.h3}
            className="flex items-center justify-between px-3 py-2 text-sm border-b border-[var(--border)] last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2 h-2"
                style={{ background: TIER_FILL[it.tier] }}
              />
              <span className="font-mono text-xs">{it.h3.slice(0, 7)}…</span>
              <span className="text-[var(--muted)] text-xs">T{it.tier}</span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(it.h3)}
              className="text-[var(--muted)] hover:text-[var(--fg)] text-xs"
              aria-label="Remove"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between text-sm">
        <span className="text-[var(--muted)]">Total</span>
        <span className="font-mono">{totalSol.toFixed(6)} SOL</span>
      </div>

      <button
        type="button"
        disabled={!walletConnected || items.length > 20}
        onClick={onClaim}
        className="w-full py-3 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] disabled:opacity-40 hover:border-[var(--fg)] transition-colors"
      >
        {items.length > 20
          ? 'Max 20 per claim'
          : walletConnected
          ? `Claim ${items.length} ${items.length === 1 ? 'tile' : 'tiles'}`
          : 'Anslut wallet för att claima'}
      </button>
    </div>
  );
}
