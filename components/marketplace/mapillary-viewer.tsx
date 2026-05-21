'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Loader2,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import type { Viewer as ViewerType } from 'mapillary-js';
import 'mapillary-js/dist/mapillary.css';

type MoveKey = 'forward' | 'back' | 'left' | 'right';

/**
 * Interactive Mapillary street-level viewer (WebGL). Drag to look around 360°;
 * the always-visible control cluster at the bottom walks you forward/back along
 * the captured sequence and turns the view left/right.
 *
 * The native `sequence` UI bar auto-hides and needs hovering to reveal, which
 * made steering feel hidden — so we turn it off and drive navigation through
 * our own persistent buttons via `viewer.moveDir(...)`.
 *
 * `mapillary-js` is heavy and browser-only, so we dynamic-import it inside the
 * effect (keeps it out of the route bundle, dodges SSR) and tear the viewer
 * down on unmount.
 */
export function MapillaryViewer({
  imageId,
  accessToken,
}: {
  imageId: string;
  accessToken: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const moveRef = useRef<((key: MoveKey) => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let viewer: ViewerType | null = null;
    let cancelled = false;

    import('mapillary-js')
      .then(({ Viewer, NavigationDirection }) => {
        if (cancelled || !ref.current) return;
        viewer = new Viewer({
          accessToken,
          container: ref.current,
          imageId,
          // No cover (load immediately) and no auto-hiding sequence bar —
          // we provide always-visible controls instead.
          component: { cover: false, sequence: false },
        });

        const dirMap: Record<MoveKey, number> = {
          forward: NavigationDirection.Next,
          back: NavigationDirection.Prev,
          left: NavigationDirection.TurnLeft,
          right: NavigationDirection.TurnRight,
        };
        moveRef.current = (key) => {
          // moveDir rejects when there's no image that way — ignore silently.
          viewer?.moveDir(dirMap[key]).catch(() => {});
        };

        setLoading(false);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      moveRef.current = null;
      viewer?.remove();
    };
  }, [imageId, accessToken]);

  const move = useCallback((key: MoveKey) => moveRef.current?.(key), []);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/70">
          <Loader2 size={22} className="animate-spin" />
        </div>
      )}

      {ready && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/20 bg-black/55 p-1.5 backdrop-blur-md">
          <NavBtn label="Turn left" onClick={() => move('left')}>
            <RotateCcw size={18} strokeWidth={2} />
          </NavBtn>
          <NavBtn label="Back" onClick={() => move('back')}>
            <ArrowDown size={18} strokeWidth={2} />
          </NavBtn>
          <NavBtn label="Forward" primary onClick={() => move('forward')}>
            <ArrowUp size={20} strokeWidth={2.2} />
          </NavBtn>
          <NavBtn label="Turn right" onClick={() => move('right')}>
            <RotateCw size={18} strokeWidth={2} />
          </NavBtn>
        </div>
      )}
    </div>
  );
}

function NavBtn({
  label,
  onClick,
  primary,
  children,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        primary
          ? 'flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95'
          : 'flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15'
      }
    >
      {children}
    </button>
  );
}
