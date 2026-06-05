'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Hex-tiled cousin of Aceternity's background-boxes: a tilted honeycomb grid
 * that lights up cell-by-cell on hover (teal, matching the H3 land hexes), with
 * a sparse scatter of pre-lit "claimed" hexes. Pure CSS :hover (no per-cell
 * motion lib) so it stays light - the original spawned 15k framer-motion nodes.
 */
const ROWS = 46;
const COLS = 48;
const W = 30; // hex width (px)
const H = 34; // hex height (px)
const GAP = 4; // gap = the visible "grid line"
const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

export const HexesCore = ({ className, ...rest }: { className?: string }) => {
  return (
    <div
      className={cn('absolute inset-0 z-0 flex items-center justify-center overflow-hidden', className)}
      {...rest}
    >
      <div
        style={{ transform: 'skewX(-12deg) skewY(6deg) scale(1.15)', transformOrigin: 'center' }}
        className="flex flex-col"
      >
        {new Array(ROWS).fill(0).map((_, i) => (
          <div
            key={`row-${i}`}
            className="flex"
            style={{
              gap: GAP,
              marginTop: i === 0 ? 0 : -H * 0.25,
              marginLeft: i % 2 === 1 ? (W + GAP) / 2 : 0,
            }}
          >
            {new Array(COLS).fill(0).map((_, j) => {
              // Sparse deterministic scatter of "claimed" hexes for life.
              const claimed = (i * COLS + j) % 23 === 0 || (i * 3 + j * 7) % 37 === 0;
              return (
                <div
                  key={`hex-${i}-${j}`}
                  className={cn(
                    'flex-none transition-colors duration-150 ease-out hover:bg-[#5eead4]',
                    claimed ? 'bg-[#5eead4]/55' : 'bg-white/[0.08]',
                  )}
                  style={{ width: W, height: H, clipPath: HEX_CLIP }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Hexes = React.memo(HexesCore);
