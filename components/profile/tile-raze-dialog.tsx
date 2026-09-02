'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Flag } from '@/components/flag';
import { useActiveWallet } from '@/lib/active-wallet';
import { razeOnChain, readEmbeddedVava } from '@/lib/bid-chain';
import { VAVA_UNIT } from '@/lib/tokenomics-constants';
import type { ClaimedTile } from '@/types/tile';
import type { HexLocation } from '@/lib/use-hex-locations';

const HAIRCUT_PCT = 10;

/**
 * "Raze" confirmation: shows exactly what comes out of the hex (embedded
 * $VAVA minus the haircut) before the irreversible on-chain call.
 */
export function TileRazeDialog({
  tile,
  location,
  open,
  onOpenChange,
  onRazed,
}: {
  tile: ClaimedTile | null;
  location: HexLocation | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onRazed: () => void;
}) {
  const wallet = useActiveWallet();
  const [embedded, setEmbedded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !tile) return;
    let alive = true;
    setEmbedded(null);
    setError(null);
    readEmbeddedVava(tile.h3)
      .then((v) => {
        if (alive) setEmbedded(Number(v) / VAVA_UNIT);
      })
      .catch(() => {
        if (alive) setEmbedded(0);
      });
    return () => {
      alive = false;
    };
  }, [open, tile]);

  if (!tile) return null;
  const place = location?.neighborhood ?? location?.place ?? location?.countryName ?? 'Unmapped';
  const payout = embedded === null ? null : embedded * (1 - HAIRCUT_PCT / 100);
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <div className="space-y-1.5">
          <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
            Raze this hex
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Flag code={location?.countryCode} size={14} /> {place} · Tier {tile.tier}
          </DialogPrimitive.Description>
        </div>

        <p className="text-sm text-muted-foreground">
          The hex goes back to the world and the $VAVA sealed inside is paid out to you,
          minus the {HAIRCUT_PCT}% burn. This cannot be undone - anyone can claim the ground
          again afterwards.
        </p>

        <dl className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Sealed inside</dt>
            <dd className="tabular-nums">{embedded === null ? '…' : `${fmt(embedded)} $VAVA`}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Burned ({HAIRCUT_PCT}%)</dt>
            <dd className="tabular-nums">{embedded === null ? '…' : `${fmt(embedded * HAIRCUT_PCT / 100)} $VAVA`}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>You receive</dt>
            <dd className="tabular-nums">{payout === null ? '…' : `${fmt(payout)} $VAVA`}</dd>
          </div>
        </dl>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            disabled={busy || embedded === null || !wallet.address}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await razeOnChain({ wallet, h3: tile.h3 });
                onRazed();
                onOpenChange(false);
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Raze failed');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="mr-2 animate-spin" size={14} />}
            Raze and take the $VAVA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
