'use client';

import { useEffect, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useActiveWallet } from '@/lib/active-wallet';
import { SidebarWallet } from './sidebar-wallet';
import { SidebarRegion } from './sidebar-region';
import { SelectionList } from './selection-list';
import { MyTilesList } from './my-tiles-list';
import { ActivityFeed } from './activity-feed';
import { HotNearby } from './hot-nearby';

/**
 * Right rail on /map.
 *
 * 380px, full-height, off-white background, hairline left border. Linear-style:
 * flat sections separated only by single-pixel `border-b border-border` lines.
 *
 *   1. Wallet header (avatar + addr + balance, or "Connect" button)
 *   2. Region context (place name + 3 mini stats, when zoom > 11)
 *   3. Tabs: Selection / My Tiles / Activity
 *   4. Hot Nearby - always at the bottom
 *
 * Viewport state (zoom, centre) is subscribed from the underlying mapbox-gl `move`
 * event via `mapRef.current.getMap()`, so the Region card re-geocodes as the user pans.
 */
export function MapSidebar({
  selectedHexes,
  onRemoveHex,
  onClaim,
  mapRef,
}: {
  selectedHexes: Set<string>;
  onRemoveHex: (h3: string) => void;
  onClaim: () => void;
  mapRef: React.RefObject<MapRef | null>;
}) {
  const { connected } = useActiveWallet();
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const attach = () => {
      if (cancelled) return;
      const map = mapRef.current?.getMap();
      if (!map) {
        window.setTimeout(attach, 200);
        return;
      }
      const sync = () => {
        const c = map.getCenter();
        setCenter({ lat: c.lat, lng: c.lng });
        setZoom(map.getZoom());
      };
      sync();
      map.on('move', sync);
      return () => {
        map.off('move', sync);
      };
    };
    const detach = attach();
    return () => {
      cancelled = true;
      if (typeof detach === 'function') detach();
    };
  }, [mapRef]);

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="absolute right-0 top-0 z-10 flex h-full w-[380px] flex-col border-l border-border bg-background">
        <SidebarWallet />

        <SidebarRegion
          centerLat={center?.lat ?? null}
          centerLng={center?.lng ?? null}
          zoom={zoom}
        />

        <Tabs defaultValue="selection" className="flex min-h-0 flex-1 flex-col">
          <div className="px-5 pt-4">
            <TabsList className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger
                value="selection"
                className="mr-6 rounded-none border-b-2 border-transparent px-0 pb-3 text-[13px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground"
              >
                Selection
              </TabsTrigger>
              <TabsTrigger
                value="my-tiles"
                disabled={!connected}
                className="mr-6 rounded-none border-b-2 border-transparent px-0 pb-3 text-[13px] font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground"
              >
                My Hexes
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-none border-b-2 border-transparent px-0 pb-3 text-[13px] font-medium uppercase tracking-normal text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
              >
                Activity
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="selection" className="mt-0 flex min-h-0 flex-1 flex-col px-5 pt-5">
            <SelectionList
              selectedHexes={selectedHexes}
              onRemove={onRemoveHex}
              onClaim={onClaim}
              walletConnected={connected}
            />
          </TabsContent>
          <TabsContent value="my-tiles" className="mt-0 flex min-h-0 flex-1 flex-col px-5 pt-5">
            <MyTilesList mapRef={mapRef} />
          </TabsContent>
          <TabsContent value="activity" className="mt-0 flex min-h-0 flex-1 flex-col px-5 pt-5">
            <ActivityFeed />
          </TabsContent>
        </Tabs>

        <HotNearby />
      </aside>
    </TooltipProvider>
  );
}
