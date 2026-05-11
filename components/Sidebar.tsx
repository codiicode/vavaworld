'use client';

import { useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { useActiveWallet } from '@/lib/active-wallet';
import { SelectionPanel } from './SelectionPanel';
import { MyTilesPanel } from './MyTilesPanel';

type Tab = 'selection' | 'mytiles';

export function Sidebar({
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
  const [tab, setTab] = useState<Tab>('selection');

  return (
    <aside
      className="absolute right-0 top-0 h-full w-[340px] z-10 overflow-y-auto"
      style={{
        paddingTop: '5rem',
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        borderLeft: '1px solid var(--hairline)',
      }}
    >
      <div className="flex" style={{ borderBottom: '1px solid var(--hairline)' }}>
        <button
          onClick={() => setTab('selection')}
          className="flex-1 py-4 transition-colors"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: tab === 'selection' ? 'var(--signal)' : 'var(--dim)',
            borderBottom: tab === 'selection' ? '1.5px solid var(--signal)' : '1.5px solid transparent',
            background: 'transparent',
            fontWeight: 500,
          }}
        >
          Selection
        </button>
        <button
          onClick={() => setTab('mytiles')}
          disabled={!connected}
          className="flex-1 py-4 transition-colors disabled:opacity-40"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: tab === 'mytiles' ? 'var(--signal)' : 'var(--dim)',
            borderBottom: tab === 'mytiles' ? '1.5px solid var(--signal)' : '1.5px solid transparent',
            background: 'transparent',
            fontWeight: 500,
          }}
        >
          My Tiles
        </button>
      </div>

      <div className="p-5">
        {tab === 'selection' && (
          <SelectionPanel
            selectedHexes={selectedHexes}
            onRemove={onRemoveHex}
            onClaim={onClaim}
            walletConnected={connected}
          />
        )}
        {tab === 'mytiles' && <MyTilesPanel mapRef={mapRef} />}
      </div>
    </aside>
  );
}
