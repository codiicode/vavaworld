'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts a number up from 0 to `value` on mount with an ease-out curve.
 * Render-format is delegated to `format` so callers control SOL/$VAVA/compact
 * suffixes. Respects prefers-reduced-motion (jumps straight to the value).
 */
export function CountUp({
  value,
  format,
  durationMs = 1100,
  className,
}: {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const raf = useRef<number>();

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
}
