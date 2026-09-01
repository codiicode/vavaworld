'use client';

import { useMemo, useState } from 'react';
import { Coins, Crown, Hourglass, Lock, ShieldCheck, User } from 'lucide-react';
import { useStake } from '@/lib/use-stake';
import { TIERS, tierFor, type TierKey } from '@/lib/tokenomics-constants';
import { StatTile } from '@/components/ui/stat-tile';
import { cn } from '@/lib/utils';

const CARD = 'rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md';

const TIER_META: Record<TierKey, { icon: React.ReactNode; perks: string[] }> = {
  tourist: {
    icon: <User size={16} />,
    perks: ['Claim and trade land', 'Secondary market fee 5%'],
  },
  citizen: {
    icon: <ShieldCheck size={16} />,
    perks: ['5% off primary claims'],
  },
  baron: {
    icon: <Coins size={16} />,
    perks: ['10% off primary claims', 'Secondary market fee 3% instead of 5%'],
  },
  president: {
    icon: <Crown size={16} />,
    perks: ['Eligible to claim a national throne', 'Earn 5% of claims + 1% of trades in your country'],
  },
};

export default function StakingPage() {
  const { wallet, state, busy, error, stakeTokens, beginUnstake, withdraw } = useStake();
  const [stakeAmt, setStakeAmt] = useState('');
  const [unstakeAmt, setUnstakeAmt] = useState('');

  const tier = tierFor(state?.staked ?? 0);
  const nextTier = useMemo(() => {
    const idx = TIERS.findIndex((t) => t.key === tier);
    return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
  }, [tier]);

  const cooldownLeft = state && state.availableAt > 0
    ? Math.max(0, state.availableAt - Math.floor(Date.now() / 1000))
    : 0;
  const withdrawReady = state ? state.pending > 0 && cooldownLeft === 0 : false;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Citizens &amp; Tourists
        </h1>
      </div>

      {/* Your position */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Stat label="Your tier" value={TIERS.find((t) => t.key === tier)?.name ?? 'Tourist'} />
        <Stat label="Staked" value={fmt(state?.staked)} suffix="$VAVA" />
        <Stat
          label="Unstaking"
          value={fmt(state?.pending)}
          suffix={cooldownLeft > 0 ? `ready in ${fmtDur(cooldownLeft)}` : state?.pending ? 'ready' : ''}
        />
        <Stat label="In wallet" value={fmt(state?.walletBalance)} suffix="$VAVA" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Tier ladder */}
        <section className={`${CARD} p-6 md:p-7`}>
          <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            The ladder
          </h2>
          <div className="flex flex-col gap-3">
            {TIERS.map((t) => {
              const active = t.key === tier;
              const meta = TIER_META[t.key];
              return (
                <div
                  key={t.key}
                  className={cn(
                    'rounded-xl border p-4 transition-colors',
                    active
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-white/40 bg-white/20',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      {meta.icon}
                      {t.name}
                      {active && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-sm tabular-nums text-foreground/70">
                      {t.threshold === 0 ? 'No stake' : `${t.threshold.toLocaleString('en-US')} $VAVA`}
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-sm text-foreground/70">
                    {meta.perks.map((p) => (
                      <li key={p}>· {p}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] text-foreground/55">
            Citizenship is mathematically scarce: the supply only allows a few
            thousand citizenships to ever exist. Claim discounts apply
            automatically at checkout; the baron trading fee applies at sale.
          </p>
        </section>

        {/* Actions */}
        <section className={`${CARD} flex flex-col gap-5 p-6 md:p-7`}>
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
              <Lock size={13} />
              Stake
            </h2>
            {!wallet.connected ? (
              <p className="text-sm text-foreground/60">
                Connect a wallet to stake. $VAVA launches on pump.fun — staking
                goes live with the token.
              </p>
            ) : (
              <>
                <AmountForm
                  placeholder="Amount to stake"
                  value={stakeAmt}
                  onChange={setStakeAmt}
                  max={state?.walletBalance ?? 0}
                  cta="Stake"
                  disabled={busy || !state?.mintConfigured}
                  onSubmit={(n) => {
                    void stakeTokens(n);
                    setStakeAmt('');
                  }}
                />
                {nextTier && (
                  <p className="mt-2 text-[11px] text-foreground/55">
                    {Math.max(0, nextTier.threshold - (state?.staked ?? 0)).toLocaleString('en-US')}{' '}
                    $VAVA to {nextTier.name}.
                  </p>
                )}
              </>
            )}
          </div>

          {wallet.connected && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
                <Hourglass size={13} />
                Unstake
              </h2>
              <AmountForm
                placeholder="Amount to unstake"
                value={unstakeAmt}
                onChange={setUnstakeAmt}
                max={state?.staked ?? 0}
                cta="Start 24h unstake"
                disabled={busy}
                onSubmit={(n) => {
                  void beginUnstake(n);
                  setUnstakeAmt('');
                }}
              />
              <p className="mt-2 text-[11px] text-foreground/55">
                Starting a new unstake resets the 24h clock for everything
                already pending. Dropping below a tier removes its benefits
                immediately.
              </p>
              <button
                type="button"
                disabled={!withdrawReady || busy}
                onClick={() => void withdraw()}
                className={cn(
                  'mt-3 w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                  withdrawReady
                    ? 'border-primary/60 bg-primary/15 text-foreground hover:bg-primary/25'
                    : 'cursor-not-allowed border-white/40 bg-white/20 text-foreground/40',
                )}
              >
                {state?.pending
                  ? withdrawReady
                    ? `Withdraw ${fmt(state.pending)} $VAVA`
                    : `Locked ${fmtDur(cooldownLeft)} more`
                  : 'Nothing to withdraw'}
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return <StatTile label={label} value={value} note={suffix} />;
}

function AmountForm({
  placeholder,
  value,
  onChange,
  max,
  cta,
  disabled,
  onSubmit,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  cta: string;
  disabled: boolean;
  onSubmit: (n: number) => void;
}) {
  const n = Number(value);
  const valid = Number.isFinite(n) && n > 0 && n <= max;
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/40 bg-white/40 px-3 py-2.5 text-sm text-foreground outline-none backdrop-blur-md placeholder:text-foreground/40 focus:border-primary/60"
        />
        <button
          type="button"
          onClick={() => onChange(String(max))}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary hover:bg-primary/10"
        >
          Max
        </button>
      </div>
      <button
        type="button"
        disabled={disabled || !valid}
        onClick={() => valid && onSubmit(n)}
        className={cn(
          'rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
          disabled || !valid
            ? 'cursor-not-allowed bg-white/20 text-foreground/40 border border-white/40'
            : 'bg-foreground text-background hover:opacity-90',
        )}
      >
        {cta}
      </button>
    </div>
  );
}

function fmt(n: number | undefined): string {
  if (n === undefined) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtDur(secs: number): string {
  if (secs <= 0) return 'now';
  const h = Math.floor(secs / 3600);
  if (h >= 48) return `${Math.ceil(h / 24)}d`;
  if (h >= 1) return `${h}h`;
  return `${Math.max(1, Math.floor(secs / 60))}m`;
}
