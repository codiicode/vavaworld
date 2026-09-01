'use client';

/**
 * Where the money goes. A weighted dial in a real housing — ticks around
 * the rim, an inner well for the readout — with the amount picker on one
 * side and the split reading down the other.
 */

import { useEffect, useRef, useState } from 'react';

const AMOUNTS = [1, 10, 100];

const PARTS = [
  {
    pct: 80,
    label: 'Runs the world',
    sub: 'Runs the map and the marketplace, and funds a treasury that buys land back when prices dip.',
    color: '#f2f5fa',
  },
  {
    pct: 15,
    label: 'Locked in your hex',
    sub: 'This 15% buys $VAVA on the open market the instant you claim, and seals it inside your hex.',
    color: '#6aa8ff',
  },
  {
    pct: 5,
    label: 'To the president',
    sub: 'Goes to whoever holds that country. No president yet? It waits for the throne.',
    color: '#d9a441',
  },
];

const R = 116;
const C = 2 * Math.PI * R;

export function SplitFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [amount, setAmount] = useState(10);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLive(true);
      return;
    }
    const io = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) {
          setLive(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let offset = 0;
  const shown = hover === null ? null : PARTS[hover];

  return (
    <div ref={ref}>
      <div className="mt-4 flex flex-col items-center gap-14 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
        {/* Spend picker, beside the dial rather than above it. */}
        <div className="spend-col">
          <span className="spend-k">If you spend</span>
          <div className="seg mt-5" style={{ flexDirection: 'column' }}>
            {AMOUNTS.map((a) => (
              <button key={a} type="button" data-on={a === amount} onClick={() => setAmount(a)}>
                ${a}
              </button>
            ))}
          </div>
          <span className="spend-note">Prices start near $0.10 a tile.</span>
        </div>

        {/* The dial */}
        <div className="dial-wrap dial-xl relative flex-none" style={{ width: 360, height: 360 }}>
          <span className="ring-glow" aria-hidden />
          <svg viewBox="0 0 300 300" className="h-full w-full -rotate-90">
            {/* Ticks around the rim, so it reads as an instrument. */}
            {Array.from({ length: 60 }).map((_, n) => {
              const a = (n / 60) * Math.PI * 2;
              const r2 = n % 5 === 0 ? 133 : 137;
              return (
                <line
                  key={n}
                  x1={150 + 141 * Math.cos(a)}
                  y1={150 + 141 * Math.sin(a)}
                  x2={150 + r2 * Math.cos(a)}
                  y2={150 + r2 * Math.sin(a)}
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth={n % 5 === 0 ? 1.2 : 0.6}
                />
              );
            })}

            <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="30" />

            {PARTS.map((p, i) => {
              const len = (p.pct / 100) * C;
              const dash = live ? `${len} ${C - len}` : `0 ${C}`;
              const node = (
                <circle
                  key={p.label}
                  cx="150"
                  cy="150"
                  r={R}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={hover === i ? 40 : 30}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  opacity={hover === null || hover === i ? 1 : 0.15}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    cursor: 'pointer',
                    transition: `stroke-dasharray 1300ms cubic-bezier(0.16,1,0.3,1) ${i * 170}ms, opacity 340ms ease, stroke-width 340ms ease`,
                  }}
                />
              );
              if (live) offset += len;
              return node;
            })}
          </svg>

          <div className="dial-well">
            <div>
              <div className="dial-v" style={{ color: shown ? shown.color : '#fff' }}>
                ${shown ? ((amount * shown.pct) / 100).toFixed(2) : amount.toFixed(2)}
              </div>
              <div className="dial-k">{shown ? shown.label : 'You spend'}</div>
            </div>
          </div>
        </div>

        {/* The split */}
        <div className="w-full max-w-[430px]">
          {PARTS.map((p, i) => (
            <div
              key={p.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="slice-row"
              style={{
                ['--sc' as string]: p.color,
                opacity: hover === null || hover === i ? 1 : 0.3,
              }}
            >
              <span className="slice-pct" style={{ color: p.color }}>
                {p.pct}%
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[15.5px] font-semibold text-white">{p.label}</h3>
                  <span className="text-[17px] font-semibold tabular-nums text-white">
                    ${((amount * p.pct) / 100).toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {p.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
