'use client';

import { useEffect, useRef } from 'react';

/**
 * Drives the hero's depth: the stage recedes as you scroll past it, and
 * the layers drift against the pointer. Both write CSS custom properties
 * rather than React state — this runs on every frame, and re-rendering
 * the tree at 60fps would be far more expensive than a style write.
 *
 * Honours prefers-reduced-motion by simply never attaching the listeners.
 */
export function useHeroMotion() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    // Pointer target vs. current, so movement eases instead of snapping.
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let scrollY = window.scrollY;
    let ticking = false;

    const onPointer = (e: PointerEvent) => {
      // -1..1 from centre.
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      start();
    };

    const onScroll = () => {
      scrollY = window.scrollY;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(applyScroll);
      }
    };

    const applyScroll = () => {
      ticking = false;
      const h = window.innerHeight || 1;
      // 0 at the top, 1 once the hero has fully left.
      const p = Math.min(Math.max(scrollY / h, 0), 1);
      el.style.setProperty('--hero-scale', String(1 - p * 0.06));
      el.style.setProperty('--hero-y', `${p * 60}px`);
      el.style.setProperty('--hero-fade', String(1 - p * 0.55));
    };

    const tick = () => {
      // Ease toward the pointer; stop the loop once it has settled.
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.setProperty('--px', cx.toFixed(4));
      el.style.setProperty('--py', cy.toFixed(4));
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    applyScroll();
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
