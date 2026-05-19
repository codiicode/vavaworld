'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fmtInt } from '@/lib/mock-nations';

/**
 * Challenge-presidency explainer. Placeholder only — the real flow (bond
 * enough VAVA to overtake the sitting president) is out of scope.
 */
export function ChallengePresidencyModal({
  open,
  onOpenChange,
  countryName,
  threshold,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  countryName: string;
  threshold: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-white/40 bg-white/80 backdrop-blur-xl">
        <h2 className="text-lg font-semibold tracking-tight">
          Challenge the presidency
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/70">
          You need to bond more than{' '}
          <span className="font-semibold text-foreground">
            {fmtInt(threshold)} $VAVA
          </span>{' '}
          in {countryName} hexes to take the presidency. The current president
          holds the seat until someone out-bonds them.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              // TODO: wire to the real bonding flow when it exists.
              console.log('[nations] challenge presidency →', countryName);
              onOpenChange(false);
            }}
          >
            Start bonding
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Bond-more-VAVA flow. Placeholder scaffold — the real bonding transaction
 * is out of scope.
 */
export function BondMoreModal({
  open,
  onOpenChange,
  countryName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  countryName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-white/40 bg-white/80 backdrop-blur-xl">
        <h2 className="text-lg font-semibold tracking-tight">
          Bond more $VAVA
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/70">
          {/* TODO: real bonding flow — amount input, hex picker, tx signing. */}
          Bonding more $VAVA in {countryName} increases your yield and your
          standing toward the cabinet and presidency. The bonding flow is
          coming soon.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              console.log('[nations] bond more →', countryName);
              onOpenChange(false);
            }}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
