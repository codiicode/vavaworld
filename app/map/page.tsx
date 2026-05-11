'use client';

import { useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { BrandLink } from '@/components/BrandLink';
import { MapView } from '@/components/MapView';
import { MapSidebar } from '@/components/map/sidebar';
import { SearchBar } from '@/components/SearchBar';
import { ClaimModal } from '@/components/ClaimModal';

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
    <main className="fixed inset-0">
      <MapView
        selectedHexes={selectedHexes}
        setSelectedHexes={setSelectedHexes}
        mapRef={mapRef}
        refreshTilesRef={refreshTilesRef}
      />
      <MapSidebar
        selectedHexes={selectedHexes}
        onRemoveHex={removeHex}
        onClaim={() => setShowClaim(true)}
        mapRef={mapRef}
      />
      <BrandLink onDark />
      <SearchBar mapRef={mapRef} />
      {showClaim && (
        <ClaimModal
          selectedHexes={selectedHexes}
          onClose={() => setShowClaim(false)}
          onConfirmed={onClaimConfirmed}
        />
      )}
    </main>
  );
}
