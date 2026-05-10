'use client';

import { hexCenter } from '@/lib/h3-utils';
import { classifyTier, TIER_FILL } from '@/lib/tier';
import { quoteBatch } from '@/lib/quote';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCounters } from '@/lib/use-counters';

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
      <div className="flex flex-col gap-4">
        <span style={monoLabel}>No selection</span>
        <p className="text-sm" style={{ color: 'var(--dim)', lineHeight: 1.55 }}>
          Klicka en hex för att markera. Shift-klicka för fler. Ctrl-dra för ett område.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span style={monoLabel}>Selection</span>
        <span style={{ ...monoValue, color: 'var(--ink)' }}>
          {items.length} / 20
        </span>
      </div>

      <ul
        className="max-h-64 overflow-y-auto"
        style={{ borderTop: '1px solid var(--hair-2)', borderBottom: '1px solid var(--hair-2)' }}
      >
        {items.map((it) => (
          <li
            key={it.h3}
            className="flex items-center justify-between px-1 py-2.5"
            style={{ borderBottom: '1px solid var(--hair-2)' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: TIER_FILL[it.tier] }}
              />
              <span style={{ ...monoValue, color: 'var(--ink-2)' }}>
                {it.h3.slice(0, 9)}…
              </span>
              <span style={{ ...monoLabel, fontSize: '9.5px' }}>T{it.tier}</span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(it.h3)}
              className="px-2 transition-colors"
              style={{ color: 'var(--dim-2)', fontSize: '12px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim-2)')}
              aria-label="Remove"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between">
        <span style={monoLabel}>Total</span>
        <span
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: '28px',
            lineHeight: 1,
            color: 'var(--signal)',
          }}
        >
          {totalSol.toFixed(4)}
          <span style={{ ...monoLabel, marginLeft: '8px', fontSize: '10.5px' }}>SOL</span>
        </span>
      </div>

      <button
        type="button"
        disabled={!walletConnected || items.length > 20}
        onClick={onClaim}
        className="w-full py-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '13.5px',
          fontWeight: 500,
          background: walletConnected && items.length <= 20 ? 'var(--signal)' : 'transparent',
          color: walletConnected && items.length <= 20 ? '#000' : 'var(--ink)',
          border:
            walletConnected && items.length <= 20
              ? '1px solid var(--signal)'
              : '1px solid var(--hairline)',
        }}
        onMouseEnter={(e) => {
          if (walletConnected && items.length <= 20) {
            e.currentTarget.style.filter = 'brightness(1.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = '';
        }}
      >
        {items.length > 20
          ? 'Max 20 per claim'
          : walletConnected
          ? `Claim ${items.length} ${items.length === 1 ? 'tile' : 'tiles'}`
          : 'Connect wallet to claim'}
      </button>
    </div>
  );
}
