'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Browser-only WebGL viewer — never server-render it.
const MapillaryViewer = dynamic(
  () => import('./mapillary-viewer').then((m) => m.MapillaryViewer),
  { ssr: false },
);

type Coverage =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'no-token' }
  | { status: 'none' }
  | { status: 'ready'; imageKey: string };

/**
 * Mapillary street-view trigger. Queries the Graph API for the closest image
 * within 50m of the hex's center; if one exists, the button activates and the
 * dialog mounts the interactive MapillaryViewer at that image.
 *
 * Free, no billing required — but coverage is patchy: great in cities,
 * thin/empty outside urban centers or popular routes.
 */
export function StreetViewButton({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  /** Shown in the dialog header (e.g. "Stockholm · Östermalm"). */
  label: string;
}) {
  const [coverage, setCoverage] = useState<Coverage>({ status: 'idle' });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN;
    if (!token) {
      setCoverage({ status: 'no-token' });
      return;
    }

    let cancelled = false;
    setCoverage({ status: 'loading' });

    const url = new URL('https://graph.mapillary.com/images');
    url.searchParams.set('fields', 'id');
    // Graph API: radius requires separate lat/lng (not `closeto`) and caps at 50 m.
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lng', String(lng));
    url.searchParams.set('radius', '50');
    url.searchParams.set('limit', '1');
    url.searchParams.set('access_token', token);

    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body: { data?: Array<{ id: string }> }) => {
        if (cancelled) return;
        const first = body.data?.[0];
        setCoverage(first ? { status: 'ready', imageKey: first.id } : { status: 'none' });
      })
      .catch(() => {
        if (!cancelled) setCoverage({ status: 'none' });
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  // No token configured at all → render nothing (keeps the UI clean for
  // local dev / preview deploys where the env var is missing).
  if (coverage.status === 'no-token') return null;

  const isReady = coverage.status === 'ready';
  const isLoading = coverage.status === 'loading';

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={!isReady}
        onClick={() => setOpen(true)}
        className="gap-1.5"
        title={
          isReady
            ? 'Open Mapillary street view at this hex'
            : isLoading
              ? 'Checking street-view coverage…'
              : 'No street view available within ~50 m of this hex'
        }
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Camera size={14} strokeWidth={1.8} />
        )}
        Street view
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight">
              Street view · {label}
            </h2>
          </div>
          <div className="aspect-video w-full bg-black">
            {open && isReady && (
              <MapillaryViewer
                imageId={coverage.imageKey}
                accessToken={process.env.NEXT_PUBLIC_MAPILLARY_TOKEN as string}
              />
            )}
          </div>
          <div className="border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
            Drag to look around · click the arrows to move along the street.
            Imagery © Mapillary contributors — coverage is crowd-sourced and
            may be older than the satellite tile above.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
