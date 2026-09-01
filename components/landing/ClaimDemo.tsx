'use client';

/**
 * The claim, played out full-screen. The section is five viewports tall
 * with a sticky stage inside it, so scrolling scrubs the sequence:
 * orbit → descend → select → confirm → own. Three brochure cards
 * described the flow; this performs it.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Frame = {
  n: string;
  title: string;
  body: string;
  img: string;
  /** Plate zoom at this stage - the descent. */
  zoom: number;
  /** How many of the seven cells are lit. */
  lit: number;
  hud: { k: string; v: string }[];
  fill: number;
};

const FRAMES: Frame[] = [
  {
    n: 'Step 01',
    title: 'Pick anywhere on Earth.',
    body: 'The whole planet is already carved into hexes. 1.66 trillion of them, each about the size of a house.',
    img: '/assets/grid-plate.jpg',
    zoom: 1.0,
    lit: 0,
    hud: [
      { k: 'Location', v: 'Searching…' },
      { k: 'Hex size', v: '~9 m' },
      { k: 'Status', v: 'Idle' },
    ],
    fill: 8,
  },
  {
    n: 'Step 02',
    title: 'Drop down to street level.',
    body: 'Zoom until the grid resolves. Every hex you can see is either owned by somebody or waiting for you.',
    img: '/assets/city-2.jpg',
    zoom: 1.04,
    lit: 0,
    hud: [
      { k: 'Location', v: 'Midtown, NY' },
      { k: 'Tier', v: 'T1 · metro' },
      { k: 'Status', v: 'Scanning' },
    ],
    fill: 28,
  },
  {
    n: 'Step 03',
    title: 'Tap the ground you want.',
    body: 'Go on - tap the hexes. Select one or the whole block. The price climbs with every claim already made in that country.',
    img: '/assets/city-2.jpg',
    zoom: 1.08,
    lit: 3,
    hud: [
      { k: 'Selected', v: '3 hexes' },
      { k: 'Quote', v: '0.0021 SOL' },
      { k: 'Status', v: 'Selected' },
    ],
    fill: 56,
  },
  {
    n: 'Step 04',
    title: 'Confirm in your wallet.',
    body: 'One signature. 15% of what you pay buys $VAVA and locks it inside the land you just took.',
    img: '/assets/city-2.jpg',
    zoom: 1.11,
    lit: 5,
    hud: [
      { k: 'Signing', v: 'Phantom' },
      { k: 'Locked', v: '15% → $VAVA' },
      { k: 'Status', v: 'Confirming' },
    ],
    fill: 82,
  },
  {
    n: 'Step 05',
    title: 'It is yours. On-chain.',
    body: 'Registered to your wallet, permanently. Hold it, or list it on the marketplace and keep 95%.',
    img: '/assets/city-2.jpg',
    zoom: 1.14,
    lit: 7,
    hud: [
      { k: 'Owner', v: 'You' },
      { k: 'Deed', v: '8a2f…c41' },
      { k: 'Status', v: 'Owned' },
    ],
    fill: 100,
  },
];

/** Hex cell radius in viewBox units. */
const HEX_R = 13;

/**
 * A field of hexes covering the whole stage, so any part of the city is
 * tappable. Pointy-top axial layout: columns step by 1.5r horizontally
 * and rows offset by half a height on odd columns.
 */
const FIELD = (() => {
  const w = Math.sqrt(3) * HEX_R;
  const h = 1.5 * HEX_R;
  const cells: { x: number; y: number; k: number }[] = [];
  let k = 0;
  for (let row = -8; row <= 8; row++) {
    for (let col = -10; col <= 10; col++) {
      const x = col * w + (row % 2 === 0 ? 0 : w / 2);
      const y = row * h;
      if (Math.abs(x) > 168 || Math.abs(y) > 120) continue;
      cells.push({ x, y, k: k++ });
    }
  }
  return cells;
})();

/** The cluster the scripted frames light up, near the building marker. */
const SCRIPTED = (() => {
  const near = FIELD.map((c) => ({
    k: c.k,
    d: Math.hypot(c.x - -46, c.y - -30),
  }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 7)
    .map((c) => c.k);
  return near;
})();

function hexPoints(cx: number, cy: number, r: number) {
  // Pointy-top, so the cells hex cleanly in the offset-row layout.
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

const QUERY = 'Manhattan, New York';

export function ClaimDemo() {
  const shell = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  // Phones need the grid pushed further out, or each cell covers a
  // large share of the screen and stops reading as a fine mesh.
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const set = () => setIsPhone(mq.matches);
    set();
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);

  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    let ticking = false;

    const measure = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Travel available while the stage is pinned. Progress runs from
      // the moment top hits 0 to the moment the shell's bottom reaches
      // the fold - measuring from section-entry instead would leave the
      // first frame stuck while the section is still scrolling in.
      const total = r.height - vh;
      if (total <= 0) return;
      const travelled = Math.min(Math.max(-r.top, 0), total);
      const p = travelled / total;
      // Advance across the travel, holding the payoff at the end.
      const next = Math.min(FRAMES.length - 1, Math.floor(p * FRAMES.length * 1.001));
      setI((v) => (v === next ? v : next));
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(measure);
      }
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // The search types itself out on the opening frame.
  useEffect(() => {
    if (i !== 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(QUERY.length);
      return;
    }
    setTyped(0);
    const t = setInterval(() => {
      setTyped((v) => {
        if (v >= QUERY.length) {
          clearInterval(t);
          return v;
        }
        return v + 1;
      });
    }, 62);
    return () => clearInterval(t);
  }, [i]);

  const f = FRAMES[i];
  // On the select frame the visitor drives: their taps decide what is
  // lit, and the sequence only moves on once they have picked.
  const interactive = i === 2;
  // Their selection persists through confirm and ownership: showing a
  // different cluster after they tapped broke the whole illusion.
  const chosen = picked.size > 0;
  const on =
    i >= 2 && chosen ? picked : new Set(SCRIPTED.slice(0, f.lit));

  // Park the marker over the centre of whatever is actually selected.
  // The svg viewBox is -150..150 on x and y, mapped onto the stage.
  const pinPos = (() => {
    const cells = FIELD.filter((c) => on.has(c.k));
    if (!cells.length) return { left: 50, top: 42 };
    const cx = cells.reduce((a, c) => a + c.x, 0) / cells.length;
    const cy = cells.reduce((a, c) => a + c.y, 0) / cells.length;
    return { left: 50 + (cx / 300) * 100, top: 50 + (cy / 300) * 100 };
  })();
  // Hexes only make sense once we are down at street level.
  const showGrid = i >= 1;

  return (
    <div ref={shell} className="demo-shell" style={{ height: `${FRAMES.length * 78}vh` }}>
      <div className="demo-stage">
        {/* Plates - all mounted, only the current one visible, so the
            browser never decodes an image mid-sequence. */}
        {FRAMES.map((fr, k) => (
          <div
            key={`${fr.img}-${k}`}
            aria-hidden
            className="demo-plate"
            style={{
              backgroundImage: `url(${fr.img})`,
              ['--zoom' as string]: String(i === k ? fr.zoom : fr.zoom * 0.96),
              ['--plate-op' as string]: i === k ? '1' : '0',
            }}
          />
        ))}
        <div aria-hidden className="demo-veil" />

        {/* The grid, over a building rather than dead centre - the middle
            belongs to the statement. */}
        {showGrid && (
          <svg
            viewBox="-150 -150 300 300"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 z-[2] h-full w-full"
            aria-hidden
            style={{
              transform: `scale(${(isPhone ? 0.58 : 0.5) + (i - 1) * (isPhone ? 0.03 : 0.035)})`,
              transition: 'transform 900ms cubic-bezier(0.22,1,0.36,1)',
              // The svg spans the stage; only the cells should catch taps.
              pointerEvents: 'none',
            }}
          >
            <defs>
              <filter id="cd-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="1.1" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {FIELD.map((c) => {
              const k = c.k;
              const lit = on.has(k);
              return (
                <polygon
                  key={k}
                  points={hexPoints(c.x, c.y, HEX_R)}
                  role={interactive ? 'button' : undefined}
                  style={{
                    pointerEvents: interactive ? 'auto' : 'none',
                    cursor: interactive ? 'pointer' : 'default',
                    transition: 'fill 400ms ease, stroke 400ms ease, stroke-width 400ms ease',
                  }}
                  onClick={
                    interactive
                      ? () =>
                          setPicked((prev) => {
                            const next = new Set(prev);
                            if (next.has(k)) next.delete(k);
                            else next.add(k);
                            return next;
                          })
                      : undefined
                  }
                  fill={lit ? 'rgba(214,232,255,0.13)' : 'transparent'}
                  stroke={lit ? 'rgba(240,248,255,0.95)' : isPhone ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.10)'}
                  strokeWidth={lit ? 0.85 : isPhone ? 0.45 : 0.3}
                  filter={lit ? 'url(#cd-glow)' : undefined}
                />
              );
            })}
          </svg>
        )}

        {/* Search - how you actually find a place. */}
        <div className={`demo-search ${i === 0 ? 'on' : ''}`} aria-hidden>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
            <path d="M11 11l3.2 3.2" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="q">
            {QUERY.slice(0, typed)}
            <i className="caret" />
          </span>
        </div>

        {/* The selected building. */}
        <div
          className="demo-pin"
          style={{
            left: `${pinPos.left}%`,
            top: `${pinPos.top}%`,
            // Suppress it when it would land under the centred statement.
            opacity:
              i >= 2 &&
              !(pinPos.left > 28 && pinPos.left < 72 && pinPos.top > 30 && pinPos.top < 70)
                ? 1
                : 0,
          }}
          aria-hidden
        >
          <span className="label">
            {i >= 4
              ? 'Owned · 8a2f…c41'
              : i === 3
                ? 'Confirming…'
                : `${on.size} ${on.size === 1 ? 'hex' : 'hexes'} · ${(on.size * 0.0007).toFixed(4)} SOL`}
          </span>
        </div>

        {/* Copy */}
        {FRAMES.map((fr, k) => (
          <div
            key={fr.n}
            className={`demo-frame ${i === k ? 'on' : ''}`}
            style={{ pointerEvents: i === k && k === FRAMES.length - 1 ? 'auto' : 'none' }}
          >
            <div className="demo-copy">
              <span className="step-n">{fr.n}</span>
              <h3>{fr.title}</h3>
              <p>{fr.body}</p>
              {k === FRAMES.length - 1 && (
                <Link href="/map" className="cta-enter mt-7 px-8 py-3.5 text-[12.5px] font-medium uppercase tracking-[0.18em]">
                  Claim your first hex
                  <svg width="15" height="10" viewBox="0 0 15 10" fill="none" aria-hidden>
                    <path d="M1 5h12M9.5 1.2 13.4 5l-3.9 3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        ))}

        {/* Progress rail */}
        <div className="demo-rail" aria-hidden>
          {FRAMES.map((fr, k) => (
            <i key={fr.n} className={i === k ? 'on' : ''} />
          ))}
        </div>

        {/* Claim ticket */}
        <div className={`demo-hud ${i >= 1 ? 'on' : ''}`}>
          <div className="hud-rows">
            {(interactive
              ? [
                  { k: 'Selected', v: `${picked.size} ${picked.size === 1 ? 'hex' : 'hexes'}` },
                  { k: 'Quote', v: `${(picked.size * 0.0007).toFixed(4)} SOL` },
                  { k: 'Status', v: picked.size ? 'Selected' : 'Tap a hex' },
                ]
              : i >= 3 && chosen
                ? [
                    { k: i >= 4 ? 'Owned' : 'Claiming', v: `${picked.size} ${picked.size === 1 ? 'hex' : 'hexes'}` },
                    { k: i >= 4 ? 'Deed' : 'Paying', v: i >= 4 ? '8a2f…c41' : `${(picked.size * 0.0007).toFixed(4)} SOL` },
                    { k: 'Status', v: i >= 4 ? 'Owned' : 'Confirming' },
                  ]
                : f.hud
            ).map((h) => (
              <div key={h.k} className="hud-cell">
                <span className="hud-k">{h.k}</span>
                <span className="hud-v">{h.v}</span>
              </div>
            ))}
          </div>
          <div className="hud-bar">
            <i
              style={{
                ['--fill' as string]: interactive
                  ? `${28 + Math.min(picked.size / 7, 1) * 34}%`
                  : `${f.fill}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
