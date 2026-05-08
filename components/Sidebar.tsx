'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import type { SelectedTile } from '@/types/tile';

export function Sidebar({ tile }: { tile: SelectedTile | null }) {
  const { publicKey, connected } = useWallet();
  return (
    <aside
      className="absolute right-0 top-0 h-full w-80 border-l border-[var(--border)] bg-[var(--panel)] p-5 z-10 overflow-y-auto"
      style={{ paddingTop: '5rem' }}
    >
      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Wallet</h2>
        <p className="font-mono text-sm break-all">
          {connected && publicKey ? publicKey.toBase58() : 'Not connected'}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
          Selected tile
        </h2>
        {tile ? (
          <dl className="text-sm space-y-1">
            <div>
              <dt className="text-[var(--muted)] inline">h3 </dt>
              <dd className="font-mono inline">{tile.h3}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)] inline">lat </dt>
              <dd className="font-mono inline">{tile.lat.toFixed(5)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)] inline">lng </dt>
              <dd className="font-mono inline">{tile.lng.toFixed(5)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)] inline">tier </dt>
              <dd className="inline">{tile.tier}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-[var(--muted)] text-sm">Click a hex to select.</p>
        )}
      </section>

      <button
        type="button"
        disabled={!tile || !connected}
        className="w-full py-3 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] disabled:opacity-40 hover:border-[var(--fg)] transition-colors"
        onClick={() => console.log('Claim clicked', tile)}
      >
        Claim
      </button>
    </aside>
  );
}
