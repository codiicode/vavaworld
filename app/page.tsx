'use client';

import { useState } from 'react';
import { WalletProviders } from '@/components/WalletProviders';
import { WalletButton } from '@/components/WalletButton';
import { MapView } from '@/components/MapView';
import { Sidebar } from '@/components/Sidebar';
import type { SelectedTile } from '@/types/tile';

export default function Page() {
  const [tile, setTile] = useState<SelectedTile | null>(null);
  return (
    <WalletProviders>
      <main className="fixed inset-0">
        <MapView onSelect={setTile} selected={tile} />
        <Sidebar tile={tile} />
        <WalletButton />
      </main>
    </WalletProviders>
  );
}
