'use client';

import { useMemo } from 'react';

/**
 * The VAVAWORLD hex-grid mark. Five rings, only the centre filled - the rest are outline.
 * Pure SVG, no JS animation. Pass `color` to control stroke + centre fill.
 */
export function BrandMark({ color = '#ffffff', size = 26 }: { color?: string; size?: number }) {
  const polygons = useMemo(() => buildCells(4.6), []);
  const strokeWidth = (polygons[0]?.r ?? 1) * 0.10;

  return (
    <svg
      viewBox="-5 -5 10 10"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {polygons.map((c, i) => (
        <polygon
          key={i}
          points={hexPts(c.x, c.y, c.r)}
          fill={c.ring === 0 ? color : 'transparent'}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
        />
      ))}
    </svg>
  );
}

function hexPts(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i + 30);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(4)},${(cy + r * Math.sin(a)).toFixed(4)}`);
  }
  return pts.join(' ');
}

function buildCells(fitW: number) {
  const SQ3 = Math.sqrt(3);
  const cells: { q: number; r: number; ring: number }[] = [];
  for (let r = -2; r <= 2; r++) {
    for (let q = -2; q <= 2; q++) {
      if (Math.abs(q + r) > 2) continue;
      cells.push({ q, r, ring: Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) });
    }
  }
  const S = fitW / (2.5 * SQ3);
  return cells.map((c) => ({
    ring: c.ring,
    x: SQ3 * (c.q + c.r / 2) * S,
    y: 1.5 * c.r * S,
    r: S,
  }));
}
