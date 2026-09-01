'use client';

/**
 * The world, live. Four boxed cards in a row is the default dashboard
 * and reads as one — this counts each figure up as it arrives, ticks
 * the live one upward while you watch, and runs a claim pulse along
 * the strip so the section feels like a running world.
 */

import { useEffect, useRef, useState } from 'react';
import { useLandingStats } from '@/lib/use-landing-stats';

type Stat = {
  /** Final value. */
  to: number;
  /** Rendering for the counted value. */
  fmt: (n: number) => string;
  k: string;
  note: string;
  blue?: boolean;
  /** The live figure keeps climbing after it lands. */
  live?: boolean;
};

const STATS: Stat[] = [
  {
    to: 12847,
    fmt: (n) => Math.round(n).toLocaleString('en-US'),
    k: 'Claimed today',
    note: 'Tiles taken in the last 24 hours.',
    blue: true,
    live: true,
  },
  {
    to: 249,
    fmt: (n) => String(Math.round(n)),
    k: 'Countries live',
    note: 'Every one has a throne, standing empty or held.',
  },
  {
    to: 1.66,
    fmt: (n) => `${n.toFixed(2)}T`,
    k: 'Tiles remaining',
    note: 'The pool only ever gets smaller.',
  },
  {
    to: 95,
    fmt: (n) => `${Math.round(n)}%`,
    k: 'Sellers keep',
    note: 'List whenever you like. Barons keep 97%.',
  },
];

export function WorldStats() {
  const live = useLandingStats();
  const ref = useRef<HTMLDivElement>(null);
  const [vals, setVals] = useState<number[]>(STATS.map(() => 0));
  const [, setTicked] = useState(false);
  const started = useRef(false);
  const [running, setRunning] = useState(false);

  // Count up once, when the strip is actually on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVals(STATS.map((s) => s.to));
      return;
    }

    // Do not start until the real figures are in, or the count-up locks
    // onto the placeholder targets.
    if (!live) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || started.current) return;
        started.current = true;
        io.disconnect();

        const targets = live
          ? [live.claimedToday, live.activeCountries, live.tilesRemaining / 1e12, 95]
          : STATS.map((s) => s.to);
        const t0 = performance.now();
        const dur = 1500;
        const step = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          // Ease out, so the numbers settle rather than stop dead.
          const e = 1 - Math.pow(1 - p, 3);
          setVals(targets.map((t) => t * e));
          if (p < 1) requestAnimationFrame(step);
          else setRunning(true);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [live]);

  // The live figure keeps climbing while you watch it.
  useEffect(() => {
    if (!running) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      setVals((v) => {
        const i = STATS.findIndex((s) => s.live);
        if (i < 0) return v;
        // Nothing to tick when the world is quiet.
        if (live && live.claimedToday === 0) return v;
        // Pin every other figure to its exact value — an earlier version
        // let them drift, so 249 became 247 and 1.66T became 1.64T.
        const next = STATS.map((s, k) => (k === i ? v[k] : s.to));
        next[i] = Math.max(v[i], STATS[i].to) + Math.ceil(Math.random() * 3);
        return next;
      });
      setTicked(true);
      setTimeout(() => setTicked(false), 1400);
    }, 4200);
    return () => clearInterval(t);
  }, [running]);

  return (
    <div ref={ref} className="wstrip">
      {STATS.map((s, i) => (
        <div key={s.k} className="wcell">
          <span className={`wv ${s.blue ? 'blue' : ''}`}>
            {s.fmt(vals[i] ?? 0)}
          </span>
          <span className="wk">{s.k}</span>
          <span className="wn">{s.note}</span>
        </div>
      ))}
    </div>
  );
}
