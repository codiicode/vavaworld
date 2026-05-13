'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { MapView } from '@/components/MapView';
import { GlassRightPanel } from '@/components/map/glass-right-panel';
import { GlassSearchBar } from '@/components/map/glass-search-bar';
import { ClaimModal } from '@/components/ClaimModal';
import { hexCenter } from '@/lib/h3-utils';

/**
 * Full-bleed map page. The map fills the viewport behind everything; the AppSidebar
 * (rendered by (app)/layout.tsx as a fixed overlay) sits at left:18, the glass
 * right panel at right:18, and the search pill floats between them at top:18.
 *
 * The zoom-in pill is rendered inside MapView itself (it depends on the map's zoom).
 */
export default function Page() {
  const [selectedHexes, setSelectedHexes] = useState<Set<string>>(new Set());
  const [showClaim, setShowClaim] = useState(false);
  const mapRef = useRef<MapRef | null>(null);
  const refreshTilesRef = useRef<((h3s: string[]) => void) | null>(null);

  const removeHex = (h3: string) => {
    const next = new Set(selectedHexes);
    next.delete(h3);
    setSelectedHexes(next);
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
      {/* Map fills the viewport — `fixed` so it's independent of any parent
          layout height. AppSidebar and GlassRightPanel are also fixed and sit
          on top via higher z-index. */}
      <div className="fixed inset-0 z-0">
        <MapView
          selectedHexes={selectedHexes}
          setSelectedHexes={setSelectedHexes}
          mapRef={mapRef}
          refreshTilesRef={refreshTilesRef}
        />
      </div>

      {/* Dim layer — the design assumes a dark Mapbox style. Since we're keeping
          the current (light) style, this overlay gives glass panels something
          dark to be translucent over so the white text stays legible. */}
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

      {/* Search pill — slots between the left rail (ends at 250px) and the right
          panel (starts at right:18 with 320px width = 356px total). */}
      <div className="pointer-events-none fixed left-[250px] right-[356px] top-[18px] z-20 px-[18px]">
        <GlassSearchBar mapRef={mapRef} />
      </div>

      <GlassRightPanel
        selectedHexes={selectedHexes}
        onRemoveHex={removeHex}
        onClaim={() => setShowClaim(true)}
      />

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
