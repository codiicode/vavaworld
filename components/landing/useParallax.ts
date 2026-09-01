'use client';

import { useEffect, useRef } from 'react';

/**
 * Drifts an element as it crosses the viewport. Writes a CSS custom
 * property rather than React state — this runs on scroll, and a
 * re-render per frame would cost far more than a style write.
 *
 * `rate` is how far it moves relative to the scroll, in px per
 * viewport travelled. Negative rises, positive sinks.
 */
export function useParallax(rate = 40) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;

    const measure = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Skip work when it is nowhere near the screen.
      if (r.bottom < -vh || r.top > vh * 2) return;
      // -1 when entering from below, 0 at centre, 1 when leaving above.
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.setProperty('--plx-y', `${(p * rate).toFixed(1)}px`);
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
  }, [rate]);

  return ref;
}
