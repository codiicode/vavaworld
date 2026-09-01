'use client';

import type { ReactNode } from 'react';
import { useParallax } from './useParallax';

/** Wraps children in a layer that drifts as it crosses the viewport. */
export function Parallax({
  rate = 40,
  className = '',
  children,
}: {
  rate?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useParallax(rate);
  return (
    <div ref={ref} className={`plx ${className}`}>
      {children}
    </div>
  );
}
