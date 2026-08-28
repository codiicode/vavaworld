'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapRef } from 'react-map-gl/mapbox';
import { MapView } from '@/components/MapView';
import { GlassRightPanel } from '@/components/map/glass-right-panel';
import { GlassSearchBar } from '@/components/map/glass-search-bar';
import { MapStyleToggle } from '@/components/map/map-style-toggle';
import { MapPerspectiveToggle } from '@/components/map/map-perspective-toggle';
import { MapZoomControls } from '@/components/map/map-zoom-controls';
import { LiveClaimsFeed } from '@/components/map/live-claims-feed';
import { hexCenter } from '@/lib/h3-utils';
import { expandFromSeed } from '@/lib/hex-expand';

// The claim flow pulls in Anchor + web3.js + pricing - none of which the map
// needs until the user actually opens it. Load that chunk on demand so it
// doesn't compete with map startup.
const ClaimModal = dynamic(
  () => import('@/components/ClaimModal').then((m) => m.ClaimModal),
  { ssr: false },
);

/**
 * Full-bleed map page. The map fills the viewport behind everything; the AppSidebar
 * (rendered by (app)/layout.tsx as a fixed overlay) sits at left:18, the glass
 * right panel at right:18, and the search pill floats between them at top:18.
 *
 * The zoom-in pill is rendered inside MapView itself (it depends on the map's zoom).
 */
export default function Page() {
  const [selectedHexes, setSelectedHexesRaw] = useState<Set<string>>(new Set());
  // The "anchor" hex the quick-pick chips expand around. Sticky across
  // expansions so {10 → 100 → 500} all stay centred on the user's original
  // tap. Resets when the anchor is removed or the selection is cleared.
  const [seed, setSeed] = useState<string | null>(null);
  const [showClaim, setShowClaim] = useState(false);
  // Satellite is a raster overlay toggled on a single persistent base style -
  // see MapView. Default on (matches the previous satellite-first view).
  const [satellite, setSatellite] = useState(true);
  const mapRef = useRef<MapRef | null>(null);
  const refreshTilesRef = useRef<((h3s: string[]) => void) | null>(null);

  const isSatellite = satellite;

  // Wrapper that keeps the seed in sync with the selection. Any code that
  // changes selectedHexes goes through here so the seed transitions stay
  // consistent (claim ux relies on seed being null when the basket is empty).
  const setSelectedHexes = (next: Set<string>) => {
    setSelectedHexesRaw(next);
    setSeed((prev) => {
      if (next.size === 0) return null;
      if (prev !== null && next.has(prev)) return prev;
      return next.values().next().value ?? null;
    });
  };

  const removeHex = (h3: string) => {
    const next = new Set(selectedHexes);
    next.delete(h3);
    setSelectedHexes(next);
  };

  const clearAll = () => setSelectedHexes(new Set());

  // Quick-pick "mark N closest" - expands the saved seed hex into a cluster
  // of N cells and REPLACES the selection so the count is exactly N. The
  // seed stays unchanged so the user can toggle between {10, 100, 500, 1000,
  // custom} freely from the same anchor.
  const selectClosest = (total: number) => {
    if (!seed) return;
    setSelectedHexesRaw(new Set(expandFromSeed(seed, total)));
  };

  const onClaimConfirmed = (h3s: string[]) => {
    setSelectedHexes(new Set());
    refreshTilesRef.current?.(h3s);
    setShowClaim(false);
  };

  // Deep-link support: /map#<h3> (used by "View on map" from the profile tile
  // dropdown). When the underlying mapbox-gl map is ready we flyTo the hex
  // centre and preselect it. Re-runs on hashchange so consecutive navigations
  // (e.g. clicking different tiles on /profile and pressing browser back/forward)
  // also work.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const flyToHash = () => {
      const hash = window.location.hash.replace(/^#/, '').trim();
      if (!/^[0-9a-f]+$/i.test(hash)) return;

      let center: { lat: number; lng: number };
      try {
        center = hexCenter(hash);
      } catch {
        return;
      }

      const tryFly = () => {
        const map = mapRef.current?.getMap();
        if (!map) {
          window.setTimeout(tryFly, 150);
          return;
        }
        const run = () => {
          map.flyTo({ center: [center.lng, center.lat], zoom: 16, duration: 1200 });
          setSelectedHexes(new Set([hash]));
        };
        if (map.loaded()) run();
        else map.once('load', run);
      };
      tryFly();
    };

    flyToHash();
    window.addEventListener('hashchange', flyToHash);
    return () => window.removeEventListener('hashchange', flyToHash);
  }, []);

  return (
    <>
      {/* Map fills the viewport - `fixed` so it's independent of any parent
          layout height. AppSidebar and GlassRightPanel are also fixed and sit
          on top via higher z-index. */}
      <div className="fixed inset-0 z-0">
        <MapView
          selectedHexes={selectedHexes}
          setSelectedHexes={setSelectedHexes}
          mapRef={mapRef}
          refreshTilesRef={refreshTilesRef}
          satellite={satellite}
        />
      </div>

      {/* Dim layer - only on satellite (which is image-heavy and varied).
          Mapbox Standard is already pale and reads fine without dimming. */}
      {isSatellite && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[5]"
          style={{
            background: `
              radial-gradient(120% 80% at 20% 0%, rgba(43,70,130,0.45), transparent 60%),
              radial-gradient(100% 80% at 100% 100%, rgba(20,35,70,0.55), transparent 60%),
              linear-gradient(180deg, rgba(8,14,28,0.42), rgba(8,14,28,0.58))
            `,
          }}
        />
      )}

      {/* Search pill + style toggle - search shrinks to make room for the
          52px toggle. Desktop: clears the left rail (250) and right panel
          (356). Mobile: spans the width below the floating top bar. */}
      <div className="pointer-events-none fixed inset-x-3 top-[66px] z-20 flex items-center gap-3 md:inset-x-auto md:left-[250px] md:right-[356px] md:top-[18px] md:pl-[18px] md:pr-0">
        <div className="min-w-0 flex-1">
          <GlassSearchBar mapRef={mapRef} />
        </div>
        <MapPerspectiveToggle mapRef={mapRef} />
        <MapStyleToggle satellite={satellite} onChange={setSatellite} />
      </div>

      <GlassRightPanel
        selectedHexes={selectedHexes}
        seedHex={seed}
        onRemoveHex={removeHex}
        onClearAll={clearAll}
        onClaim={() => setShowClaim(true)}
        onSelectClosest={selectClosest}
      />

      <MapZoomControls mapRef={mapRef} />

      <LiveClaimsFeed />

      {showClaim && (
        <ClaimModal
          selectedHexes={selectedHexes}
          onClose={() => setShowClaim(false)}
          onConfirmed={onClaimConfirmed}
        />
      )}
    </>
  );
}
