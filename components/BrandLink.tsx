'use client';

import Link from 'next/link';
import { BrandMark } from './landing/BrandMark';

/**
 * Logo + wordmark in the top-left of /map and /profile. Links back to /.
 * Uses the same hex-grid mark as the landing nav.
 *
 * Color: brand-blue everywhere except over the satellite map, where we render
 * the mark in white via the `onDark` prop.
 */
export function BrandLink({ onDark = false }: { onDark?: boolean }) {
  const color = onDark ? '#ffffff' : 'var(--signal)';
  return (
    <Link
      href="/"
      className="absolute top-5 left-5 z-20 flex items-center gap-2.5 transition-opacity hover:opacity-80"
    >
      <BrandMark color={onDark ? '#ffffff' : '#1d5e95'} size={26} />
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
          color,
        }}
      >
        VavaWorld
      </span>
    </Link>
  );
}
