'use client';

import { Info } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Flag } from '@/components/flag';
import type { ClaimedTile } from '@/types/tile';
import type { HexLocation } from '@/lib/use-hex-locations';

/**
 * Free wallet-to-wallet transfers are deliberately CLOSED
 * (docs/tokenomics.md: "no fee-free transfer path" - at a 5% market
 * fee, free transfers would become the OTC loophole that drains the
 * marketplace). Ownership changes settle through the fee-bearing
 * market: list the hex, have the recipient buy it.
 */
export function TileTransferDialog({
  tile,
  location,
  open,
  onOpenChange,
}: {
  tile: ClaimedTile | null;
  location?: HexLocation | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  if (!tile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <div className="space-y-1.5">
          <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
            Transfers settle through the market
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            Every ownership change carries the marketplace fee - that rule is
            what makes each hex&apos;s embedded $VAVA floor real.
          </DialogPrimitive.Description>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
            {location?.countryCode && <Flag code={location.countryCode} size={22} />}
            <div className="flex-1">
              <div className="text-sm font-medium">
                {location?.place ?? location?.countryName ?? 'Your hex'}
              </div>
              <div className="font-mono text-xs text-muted-foreground">{tile.h3}</div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">
              To hand this hex to someone: <b>list it for sale</b> at your
              chosen price and let them buy it. The seller fee is 5% (3% for
              barons); the hex&apos;s embedded $VAVA travels with it.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
