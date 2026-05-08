'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { MapRef } from 'react-map-gl/mapbox';
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
  const { connected } = useWallet();
  const [tab, setTab] = useState<Tab>('selection');

  return (
    <aside
      className="absolute right-0 top-0 h-full w-80 border-l border-[var(--border)] bg-[var(--panel)] z-10 overflow-y-auto"
      style={{ paddingTop: '5rem' }}
    >
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setTab('selection')}
          className={
            'flex-1 py-3 text-xs uppercase tracking-widest ' +
            (tab === 'selection' ? 'text-[var(--fg)] border-b border-[var(--fg)]' : 'text-[var(--muted)]')
          }
        >
          Selection
        </button>
        <button
          onClick={() => setTab('mytiles')}
          disabled={!connected}
          className={
            'flex-1 py-3 text-xs uppercase tracking-widest disabled:opacity-40 ' +
            (tab === 'mytiles' ? 'text-[var(--fg)] border-b border-[var(--fg)]' : 'text-[var(--muted)]')
          }
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
