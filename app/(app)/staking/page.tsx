import { Coins, Lock, TrendingUp, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Staking - $VAVA',
};

/**
 * /staking - placeholder for the upcoming $VAVA staking system. Matches the
 * standard (app) shell so it slots into the sidebar without visual nuance.
 * The detailed mechanics (epochs, APR, country boost multipliers, unbonding
 * period) land here once the on-chain pool program is finalised.
 */
export default function StakingPage() {
  return (
    <div className="mx-auto max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] px-4 py-6 md:px-8 md:py-8 2xl:px-10">
      <div className="mb-6">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
          Staking
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Lock $VAVA. Earn yield from the land.
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-foreground/70">
          Bond $VAVA against the country your hexes sit in and earn a share of
          every claim, every sale, every transfer that happens there. The pool
          contract goes live shortly - this page is the staking dashboard.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatPreview icon={<Coins size={16} />} label="Pool TVL" />
        <StatPreview icon={<TrendingUp size={16} />} label="Current APR" />
        <StatPreview icon={<Lock size={16} />} label="Your bonded $VAVA" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-white/40 bg-white/30 p-6 backdrop-blur-md md:p-7">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            <Sparkles size={13} />
            Coming soon
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            What you&apos;ll be able to do here
          </h2>
          <ul className="mt-3 flex flex-col gap-2.5 text-sm leading-relaxed text-foreground/75">
            <Bullet>
              Bond $VAVA to a country pool and start earning the moment your
              stake confirms.
            </Bullet>
            <Bullet>
              Watch your APR move in real time as new claims, secondary sales
              and transfers route fees into the pool.
            </Bullet>
            <Bullet>
              Unbond on a fixed cooldown - your principal is yours, the only
              thing you give up is future yield.
            </Bullet>
            <Bullet>
              See historic yield by country, by epoch, by pool size - so you
              can decide where the next claim of $VAVA earns most.
            </Bullet>
            <Bullet>
              Boost: hex-owners in a country get a multiplier on their own
              bonded yield. The more land you hold, the harder your stake
              works.
            </Bullet>
          </ul>
        </section>

        <section className="rounded-2xl border border-white/40 bg-white/30 p-6 backdrop-blur-md md:p-7">
          <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            Why we&apos;re building this
          </div>
          <p className="text-sm leading-relaxed text-foreground/75">
            Staking turns the land economy into something everyone in
            VAVAWORLD shares. Even people who don&apos;t own hexes can earn
            from the growth of a country by bonding $VAVA against it - and
            people who do own land get rewarded for backing the place
            they&apos;ve already invested in.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/75">
            We&apos;ll publish the full mechanism design and audit reports
            before pools open. Watch this page or follow updates from the
            sidebar.
          </p>
        </section>
      </div>
    </div>
  );
}

function StatPreview({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/30 px-5 py-4 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
        <span className="text-foreground/60">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-[22px] font-semibold leading-tight tabular-nums text-foreground/40">
        -
      </div>
      <div className="mt-0.5 text-[11px] text-foreground/50">
        Available at launch
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-1.5 inline-block h-1.5 w-1.5 flex-none rounded-full"
        style={{
          background: 'linear-gradient(135deg, #5eead4, #38bdf8)',
        }}
      />
      <span>{children}</span>
    </li>
  );
}
