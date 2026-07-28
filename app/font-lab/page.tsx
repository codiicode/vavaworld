'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, TrendingUp, Wallet } from 'lucide-react';
import { FONTS, type FontKey } from './fonts';

/**
 * /font-lab - a dev-only playground for typeface decisions.
 *
 * Renders the same building blocks the production pages use (eyebrow + H1,
 * glass KPI cards, holdings row, claim CTA) under whichever font is selected.
 * Selection persists in localStorage so you can hop between pages and come
 * back to the same candidate. The selected font is applied via className on
 * the outer wrapper - children inherit, no global side effects.
 */
export default function FontLabPage() {
  const [selected, setSelected] = useState<FontKey>('geist');

  useEffect(() => {
    const stored = window.localStorage.getItem('font-lab:selected');
    if (stored && stored in FONTS) setSelected(stored as FontKey);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('font-lab:selected', selected);
  }, [selected]);

  const active = FONTS[selected];

  return (
    <div
      className={`${active.font.className} min-h-screen w-full bg-cover bg-center bg-fixed text-foreground`}
      style={{ backgroundImage: "url('/sky-bg.jpg')" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        {/* Header chrome */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/30 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-white/40"
          >
            <ArrowLeft size={14} /> Back to site
          </Link>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            Font Lab · dev only
          </span>
        </div>

        {/* Font picker - chips */}
        <div className="mb-8 rounded-2xl border border-white/40 bg-white/30 p-4 backdrop-blur-md">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            Choose a typeface - applied site-wide on this page only
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FONTS) as FontKey[]).map((key) => {
              const { name, kind, font } = FONTS[key];
              const isActive = key === selected;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`${font.className} rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'border-transparent bg-foreground text-background'
                      : 'border-white/50 bg-white/20 text-foreground hover:bg-white/40'
                  }`}
                >
                  {name}
                  <span
                    className={`ml-2 text-[10px] uppercase tracking-[0.12em] ${
                      isActive ? 'text-background/60' : 'text-foreground/45'
                    }`}
                  >
                    {kind}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-[12px] text-foreground/55">
            Currently rendering <b>{active.name}</b>. Reload-safe (saved in
            localStorage).
          </div>
        </div>

        {/* Section 1 - eyebrow + H1 + lead */}
        <Section label="Hero / page header">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            Portfolio
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Welcome back, Leo
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-foreground/70">
            Your hex holdings and value across VavaWorld. The oldest currency in
            human history - now digital.
          </p>
        </Section>

        {/* Section 2 - display heading */}
        <Section label="Landing display headline">
          <h2 className="text-5xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            One hundred million cells.
            <br />
            <em className="font-normal italic">Held once, in a name.</em>
          </h2>
        </Section>

        {/* Section 3 - KPI grid */}
        <Section label="KPI cards (portfolio)">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Hexes owned" value="247" sub="across 9 countries" />
            <Kpi label="Portfolio value" value="$1,284.40" sub="+12.4% 7d" />
            <Kpi label="Floor avg" value="$0.1473" sub="weighted by holdings" />
            <Kpi label="Bonded $VAVA" value="48,200" sub="2.1 % of supply" />
          </div>
        </Section>

        {/* Section 4 - Holdings table */}
        <Section label="Holdings row (portfolio table)">
          <div className="rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md">
            <div className="grid grid-cols-[40px_1fr_120px_120px_100px] gap-4 border-b border-white/30 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
              <div>#</div>
              <div>Hex</div>
              <div>Maturity</div>
              <div className="text-right">Performance</div>
              <div className="text-right">ROI</div>
            </div>
            {[
              { i: '01', hex: 'Paris', m: 'City', p: '+2%', r: 'Live' },
              { i: '02', hex: 'Dubai', m: 'Remote', p: '+6%', r: 'Live' },
              { i: '03', hex: 'New York', m: 'City', p: '+9%', r: 'Live' },
              { i: '04', hex: 'Reykjavík', m: 'Edge', p: '-1%', r: 'Locked' },
            ].map((row) => (
              <div
                key={row.i}
                className="grid grid-cols-[40px_1fr_120px_120px_100px] items-center gap-4 border-b border-white/20 px-5 py-3 text-[14px] last:border-b-0"
              >
                <div className="font-medium tabular-nums text-foreground/55">
                  {row.i}
                </div>
                <div className="font-medium text-foreground">{row.hex}</div>
                <div className="text-foreground/70">{row.m}</div>
                <div
                  className={`text-right font-semibold tabular-nums ${
                    row.p.startsWith('-') ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {row.p}
                </div>
                <div className="text-right font-medium text-foreground/70">
                  {row.r}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Section 5 - Hex pricing card + CTA */}
        <Section label="Hex pricing card (map sidebar)">
          <div className="grid gap-3 md:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-white/40 bg-white/30 p-5 backdrop-blur-md">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
                    Sweden
                  </div>
                  <div className="mt-2 text-[28px] font-bold leading-tight tabular-nums text-foreground">
                    $0.1473
                  </div>
                  <div className="mt-0.5 text-[12px] tabular-nums text-foreground/55">
                    Next claim $0.1474
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
                    Claims
                  </div>
                  <div className="mt-2 text-[18px] font-semibold tabular-nums text-foreground">
                    47,392
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
                  boxShadow: '0 6px 18px -8px rgba(20,184,166,0.6)',
                }}
              >
                <Wallet size={15} /> Claim for $0.1473
              </button>
            </div>

            <div className="rounded-2xl border border-white/40 bg-white/30 p-5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
                <MapPin size={12} /> Activity
              </div>
              <div className="mt-3 space-y-2.5">
                {[
                  { t: '0.4172 SOL', who: '@nomadhex', when: '2m ago' },
                  { t: '0.1810 SOL', who: '@aurora', when: '14m ago' },
                  { t: '0.2900 SOL', who: '@stonebrook', when: '1h ago' },
                ].map((a, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[13px]"
                  >
                    <div className="font-semibold tabular-nums text-foreground">
                      {a.t}
                    </div>
                    <div className="text-foreground/65">
                      <span className="font-medium text-foreground">{a.who}</span>{' '}
                      <span className="text-foreground/45">· {a.when}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Section 6 - body copy */}
        <Section label="Body / long-form copy">
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-foreground/80">
            <p>
              VavaWorld divides the surface of the earth into one hundred million
              hexagonal cells. Each cell is held by exactly one person - in their
              name, without expiry. The register fills only once.
            </p>
            <p>
              The price of a claim rises linearly with the number of claims
              already made in that country. Sweden&apos;s 47,392nd claim costs
              $0.1473; the next costs $0.1474. There is no auction, no waiting
              list, and no privileged tier - just a curve.
            </p>
          </div>
        </Section>

        {/* Section 7 - tabular numbers stress-test */}
        <Section label="Numbers - tabular alignment">
          <div className="rounded-2xl border border-white/40 bg-white/30 p-5 backdrop-blur-md">
            <div className="grid grid-cols-2 gap-y-1.5 font-mono text-[14px] tabular-nums md:grid-cols-4">
              {[
                ['0.1000', '0.1001', '0.1473', '1.1000'],
                ['10.1000', '999,999', '47,392', '8c2a107'],
                ['$1,284.40', '+12.4%', '−0.8%', '◎ 48.20'],
              ]
                .flat()
                .map((s, i) => (
                  <span key={i} className="text-foreground/80">
                    {s}
                  </span>
                ))}
            </div>
          </div>
        </Section>

        <div className="mt-10 mb-4 text-center text-[11px] text-foreground/45">
          When you&apos;ve chosen - tell Claude and I&apos;ll swap{' '}
          <code className="rounded bg-white/40 px-1.5 py-0.5">app/layout.tsx</code>{' '}
          in 30 seconds.
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/45">
        {label}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/30 p-4 backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/60">
        <TrendingUp size={11} /> {label}
      </div>
      <div className="mt-2 text-[22px] font-bold leading-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-foreground/55">{sub}</div>
    </div>
  );
}
