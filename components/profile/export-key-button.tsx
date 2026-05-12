'use client';

import { useState } from 'react';
import { Key } from 'lucide-react';
import { useExportWallet } from '@privy-io/react-auth/solana';
import { Button } from '@/components/ui/button';
import { useActiveWallet } from '@/lib/active-wallet';

/**
 * Opens Privy's secure private-key export modal for the signed-in user's
 * embedded Solana wallet.
 *
 * Only rendered when the active wallet came from Privy (`source === 'privy'`).
 * For external wallets (Phantom etc.) the user already controls their key —
 * showing a button there would be misleading.
 *
 * Per Privy docs: the key is rendered in an iframe on a separate domain. Our
 * app never sees it. Users can copy/paste into Phantom or any other wallet.
 */
export function ExportKeyButton() {
  const wallet = useActiveWallet();
  const { exportWallet } = useExportWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!wallet.ready || !wallet.connected || wallet.source !== 'privy' || !wallet.address) {
    return null;
  }

  const handleExport = async () => {
    if (!wallet.address) return;
    setBusy(true);
    setError(null);
    try {
      await exportWallet({ address: wallet.address });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={handleExport}
        disabled={busy}
      >
        <Key size={12} />
        {busy ? 'Opening…' : 'Export key'}
      </Button>
      {error && (
        <span className="text-[10.5px] text-destructive">{error}</span>
      )}
    </div>
  );
}
