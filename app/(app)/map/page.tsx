'use client';

import { useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { MapView } from '@/components/MapView';
import { GlassRightPanel } from '@/components/map/glass-right-panel';
import { GlassSearchBar } from '@/components/map/glass-search-bar';
import { ClaimModal } from '@/components/ClaimModal';

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

  return (
    <>
      {/* Map fills the entire main column; sits behind every glass overlay */}
      <div className="absolute inset-0 z-0">
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
        className="pointer-events-none absolute inset-0 z-[5]"
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
      <div className="pointer-events-none absolute left-[250px] right-[356px] top-[18px] z-20 px-[18px]">
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
