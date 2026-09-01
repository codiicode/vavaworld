'use client';

import { useMemo } from 'react';

/**
 * Decorative flat-top hex lattice echoing the H3 grid on /map.
 * Pure SVG so it stays crisp and costs no JS after mount.
 */

const COLS = 14;
const ROWS = 8;
const R = 34; // circumradius
const W = R * 2;
const H = Math.sqrt(3) * R;

function hexPath(cx: number, cy: number) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${(cx + R * Math.cos(a)).toFixed(2)},${(cy + H / 2 * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
}

export function HexField({ className }: { className?: string }) {
  // Deterministic pseudo-random so server and client markup match.
  const cells = useMemo(() => {
    const out: { d: string; lit: number; i: number }[] = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cx = col * W * 0.75;
        const cy = row * H + (col % 2 ? H / 2 : 0);
        const r = rnd();
        out.push({ d: hexPath(cx, cy), lit: r > 0.86 ? 1 : r > 0.7 ? 0.5 : 0, i: out.length });
      }
    }
    return out;
  }, []);

  return (
    <svg
      className={className}
      viewBox={`-40 -40 ${COLS * W * 0.75 + 40} ${ROWS * H + 40}`}
      fill="none"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="hf-fade" cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="hf-mask">
          <rect x="-40" y="-40" width="100%" height="100%" fill="url(#hf-fade)" />
        </mask>
      </defs>
      <g mask="url(#hf-mask)">
        {cells.map((c) => (
          <path
            key={c.i}
            d={c.d}
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1"
            fill={c.lit ? `rgba(27,63,160,${c.lit * 0.14})` : 'transparent'}
          >
            {c.lit === 1 && (
              <animate
                attributeName="opacity"
                values="0.35;1;0.35"
                dur={`${5 + (c.i % 5)}s`}
                repeatCount="indefinite"
              />
            )}
          </path>
        ))}
      </g>
    </svg>
  );
}
