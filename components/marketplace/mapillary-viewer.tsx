'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import 'mapillary-js/dist/mapillary.css';

/**
 * Interactive Mapillary street-level viewer (WebGL). Unlike the flat `?style=photo`
 * iframe embed, this is the real navigable experience — drag to look around 360°,
 * click the on-image arrows to walk forward/back along the captured sequence with
 * smooth spatial transitions.
 *
 * `mapillary-js` is heavy and browser-only, so we dynamic-import it inside the
 * effect (keeps it out of the route bundle, dodges SSR). The viewer is torn down
 * on unmount so reopening the dialog starts clean.
 */
export function MapillaryViewer({
  imageId,
  accessToken,
}: {
  imageId: string;
  accessToken: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let viewer: { remove: () => void } | null = null;
    let cancelled = false;

    import('mapillary-js')
      .then(({ Viewer }) => {
        if (cancelled || !ref.current) return;
        viewer = new Viewer({
          accessToken,
          container: ref.current,
          imageId,
          component: { cover: false },
        });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      viewer?.remove();
    };
  }, [imageId, accessToken]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" />
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/70">
          <Loader2 size={22} className="animate-spin" />
        </div>
      )}
    </div>
  );
}
