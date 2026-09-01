'use client';

import { Copy, ExternalLink } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { hexCenter } from '@/lib/h3-utils';
import { Flag } from '@/components/flag';
import type { ClaimedTile } from '@/types/tile';
import type { HexLocation } from '@/lib/use-hex-locations';

import { useUsdFmt } from '@/lib/usd';
/**
 * Read-only tile info card. Triggered from the row "..." menu → Details.
 * Shows the on-chain fields plus the geocoded place name so collectors can
 * verify which hex they're looking at.
 */
export function TileDetailsDialog({
  tile,
  location,
  open,
  onOpenChange,
}: {
  tile: ClaimedTile | null;
  location: HexLocation | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const usd = useUsdFmt();
  if (!tile) return null;
  const c = hexCenter(tile.h3);
  const price = (Number(tile.pricePaid) / LAMPORTS_PER_SOL).toFixed(3);
  const claimedAt = new Date(tile.claimedAt * 1000);
  const place =
    location?.neighborhood ??
    location?.place ??
    location?.countryName ??
    'Unmapped';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <div className="space-y-1.5">
          <DialogPrimitive.Title className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Flag code={location?.countryCode} size={16} />
            <span>{place}</span>
            <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
              T{tile.tier}
            </span>
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            {location?.countryName ?? '-'}
          </DialogPrimitive.Description>
        </div>

        <dl className="space-y-2 text-sm">
          <Row label="Coordinates">
            <span className="tabular-nums">
              {Math.abs(c.lat).toFixed(4)}°{c.lat >= 0 ? 'N' : 'S'},{' '}
              {Math.abs(c.lng).toFixed(4)}°{c.lng >= 0 ? 'E' : 'W'}
            </span>
          </Row>
          <Row label="Hex ID">
            <Copyable value={tile.h3} mono />
          </Row>
          <Row label="Owner">
            <Copyable value={tile.owner} mono short />
          </Row>
          <Row label="Claimed">
            <span className="tabular-nums">
              {claimedAt.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </Row>
          <Row label="Price paid" bold>
            <span className="tabular-nums">{usd(Number(price))}</span>
          </Row>
        </dl>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <a
            href={`https://solscan.io/account/${tile.owner}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            View owner on Solscan <ExternalLink size={11} />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  bold,
  children,
}: {
  label: string;
  bold?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd className={bold ? 'text-base font-semibold' : 'text-sm'}>{children}</dd>
    </div>
  );
}

function Copyable({
  value,
  mono,
  short,
}: {
  value: string;
  mono?: boolean;
  short?: boolean;
}) {
  const display = short && value.length > 12 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value;
  return (
    <button
      type="button"
      onClick={() => {
        try {
          void navigator.clipboard.writeText(value);
        } catch {
          /* user denied or insecure context */
        }
      }}
      className={`inline-flex items-center gap-1.5 transition-colors hover:text-primary ${
        mono ? 'font-mono text-xs' : 'text-sm'
      }`}
      title="Copy"
    >
      <span>{display}</span>
      <Copy size={10} className="opacity-60" />
    </button>
  );
}
