'use client';

import { SOLANA_PAY_ENABLED, type ForeignCurrency } from '@/lib/solana-pay-config';
import type { SolanaPayPhase } from '@/lib/use-solana-pay';

export type PayChoice = 'eth' | ForeignCurrency;

/**
 * Light-theme "Pay with" pills for the marketplace dialogs. The price is
 * always dollars; this only picks the rail. Solana options appear only
 * when the rail is switched on.
 */
export function PayWithPicker({
  value,
  onChange,
  disabled,
}: {
  value: PayChoice;
  onChange: (c: PayChoice) => void;
  disabled?: boolean;
}) {
  if (!SOLANA_PAY_ENABLED) return null;
  const options: Array<{ key: PayChoice; label: string }> = [
    { key: 'eth', label: 'ETH' },
    { key: 'sol', label: 'SOL' },
    { key: 'usdc', label: 'USDC' },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Pay with
      </span>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.key)}
          className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors disabled:opacity-50 ${
            value === o.key
              ? 'border-foreground bg-foreground text-background'
              : 'border-border bg-muted/40 text-foreground/70 hover:bg-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
      {value !== 'eth' && (
        <span className="ml-1 text-[11px] text-muted-foreground">paid on Solana · settles on Robinhood Chain</span>
      )}
    </div>
  );
}

export function solanaPhaseLabel(phase: SolanaPayPhase | null): string {
  switch (phase) {
    case 'signing':
      return 'Confirm in your Solana wallet…';
    case 'verifying':
      return 'Verifying your payment on Solana…';
    case 'funding':
      return 'Converting to ETH on Robinhood Chain…';
    default:
      return 'Sign in wallet…';
  }
}
