'use client';

import { hexCenter } from '@/lib/h3-utils';
import { classifyTier, TIER_FILL } from '@/lib/tier';
import { quoteBatch } from '@/lib/quote';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCounters } from '@/lib/use-counters';

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
        <span style={uiLabel}>No selection</span>
        <p
          style={{
            color: 'var(--ink-2)',
            lineHeight: 1.55,
            fontStyle: 'italic',
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '16px',
          }}
        >
          Klicka en hex för att markera. Shift-klicka för fler. Ctrl-dra för ett område.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span style={uiLabel}>Selection</span>
        <span style={{ ...monoNum, color: 'var(--ink)' }}>
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
              <span style={{ ...monoNum, color: 'var(--ink-2)' }}>
                {it.h3.slice(0, 9)}…
              </span>
              <span style={{ ...uiLabel, fontSize: '10px' }}>T{it.tier}</span>
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
        <span style={uiLabel}>Total</span>
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: '32px',
            lineHeight: 1,
            color: 'var(--signal)',
            fontFeatureSettings: '"tnum"',
          }}
        >
          {totalSol.toFixed(4)}
          <span style={{ ...uiLabel, marginLeft: '8px', fontSize: '10.5px', fontStyle: 'normal' }}>SOL</span>
        </span>
      </div>

      <button
        type="button"
        disabled={!walletConnected || items.length > 20}
        onClick={onClaim}
        className="w-full py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '13.5px',
          fontWeight: 500,
          letterSpacing: '0.01em',
          background: walletConnected && items.length <= 20 ? 'var(--signal)' : 'transparent',
          color: walletConnected && items.length <= 20 ? '#ffffff' : 'var(--ink-2)',
          border:
            walletConnected && items.length <= 20
              ? '1.5px solid var(--signal)'
              : '1.5px solid var(--hairline)',
          borderRadius: 999,
        }}
        onMouseEnter={(e) => {
          if (walletConnected && items.length <= 20) {
            e.currentTarget.style.background = 'var(--signal-deep)';
            e.currentTarget.style.borderColor = 'var(--signal-deep)';
          }
        }}
        onMouseLeave={(e) => {
          if (walletConnected && items.length <= 20) {
            e.currentTarget.style.background = 'var(--signal)';
            e.currentTarget.style.borderColor = 'var(--signal)';
          }
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
