import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';

const sans = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], display: 'swap' });

const VIDEO_URL = '/videos/meadow.mp4';

export const metadata: Metadata = {
  title: 'Tokenomics',
  description:
    'Every hex you buy, buys $VAVA. Locked in the land itself, redeemable by you, forever tied to the map.',
};

const TEAL = '#5eead4';

const SPLIT = [
  {
    pct: '80%',
    label: 'The world',
    body: 'Runs VAVAWORLD: the map, the marketplace, and a treasury that can buy land back when prices dip.',
  },
  {
    pct: '15%',
    label: 'Locked in your hex',
    body: 'Buys $VAVA on the open market the moment you claim, and locks those tokens inside your new hex. Your land literally contains tokens.',
    accent: true,
  },
  {
    pct: '5%',
    label: 'Your president',
    body: "Goes to the president of the country you claimed in. No president yet? The money waits for whoever takes the throne.",
  },
];

const PILLARS = [
  {
    n: 'i.',
    title: 'Land that buys the token.',
    body: '15% of every land purchase buys $VAVA on the open market and locks it inside the hex. The more land gets claimed, the more tokens get bought and taken out of circulation. That demand is built into the system - it does not depend on anyone keeping a promise.',
  },
  {
    n: 'ii.',
    title: 'A real price floor.',
    body: 'You can raze (demolish) your hex at any time and take out the $VAVA locked inside it. That means a hex can never be worth less than its tokens: if one ever traded below that, anyone could buy it, raze it, and pocket the difference. So it never does.',
  },
  {
    n: 'iii.',
    title: 'Supply that only tightens.',
    body: 'Claimed land never becomes unowned again. When a hex is resold, the $VAVA locked inside moves with it - those tokens stay out of circulation for as long as the hex exists.',
  },
  {
    n: 'iv.',
    title: 'Thrones worth fighting for.',
    body: 'Own enough land in a country and stake 1,000,000 $VAVA, and you can take its throne. Presidents earn 5% of every claim in their country - and keep the seat until someone who owns more land stages a coup. 249 countries, 249 thrones.',
  },
];

const FEES = [
  {
    venue: 'Buying new land',
    fee: '0% extra',
    note: 'The whole price goes into the 80 / 15 / 5 split above. Nothing is added on top.',
  },
  {
    venue: 'Player-to-player trades',
    fee: '5%',
    note: "Paid by the seller: 4% to the protocol, 1% to the country's president. Buyers pay exactly the listed price. Barons (500K+ $VAVA staked) pay 3% instead.",
  },
  {
    venue: '$VAVA swaps',
    fee: '0%',
    note: 'Fair launch on pump.fun: the full supply goes through the public curve and the liquidity is burned. We take nothing on swaps.',
  },
];

export default function TokenomicsPage() {
  return (
    <div
      className={sans.className}
      style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: '#0a0a0a', color: '#fff' }}
    >
      <video
        src={VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
      />
      {/* Scrim for legibility over the video. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background:
            'linear-gradient(180deg, rgba(6,10,18,0.66) 0%, rgba(6,10,18,0.46) 38%, rgba(6,10,18,0.82) 100%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-8 py-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo size={32} />
            <span
              className="text-lg tracking-[0.02em] text-white"
              style={{ fontFamily: '"StretchPro", "Abril Fatface", Georgia, serif' }}
            >
              VAVAWORLD
            </span>
          </Link>
          <Link href="/" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
            ← Back
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-14">
          {/* Hero */}
          <p
            className="text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{ color: TEAL }}
          >
            $VAVA
          </p>
          <h1
            className="mt-3 max-w-3xl text-5xl font-normal sm:text-6xl"
            style={{ lineHeight: 1.02, letterSpacing: '-0.02em' }}
          >
            The land is{' '}
            <span className={serif.className} style={{ fontStyle: 'italic' }}>
              made of it.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-white/65 sm:text-lg">
            When you buy land, part of the price automatically buys $VAVA and locks it inside
            your hex. No staking forms, no second purchase - it all happens inside the one
            payment. You buy land; the land buys the token.
          </p>

          {/* The split */}
          <section className="mt-14">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
              Where every claim goes
            </h2>
            <div className="mt-4 grid gap-5 md:grid-cols-3">
              {SPLIT.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border p-7 backdrop-blur-md"
                  style={{
                    borderColor: s.accent ? 'rgba(94,234,212,0.45)' : 'rgba(255,255,255,0.15)',
                    background: s.accent ? 'rgba(94,234,212,0.08)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <span
                    className={`${serif.className} text-4xl italic`}
                    style={{ color: s.accent ? TEAL : '#fff' }}
                  >
                    {s.pct}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-white">{s.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{s.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/45">
              You pay one price. The split happens behind the scenes - there is never an extra fee on top.
            </p>
          </section>

          {/* Pillars */}
          <section className="mt-14">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
              Four rules
            </h2>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {PILLARS.map((p) => (
                <div
                  key={p.n}
                  className="rounded-2xl border border-white/15 bg-white/[0.06] p-7 backdrop-blur-md"
                >
                  <span className={`${serif.className} text-2xl italic`} style={{ color: TEAL }}>
                    {p.n}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-white">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{p.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Fees */}
          <section className="mt-14">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
              Fees, in full
            </h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-md">
              {FEES.map((f, i) => (
                <div
                  key={f.venue}
                  className="grid gap-1 px-7 py-5 sm:grid-cols-[1fr_auto] sm:items-baseline"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.10)' }}
                >
                  <div>
                    <span className="text-base font-semibold text-white">{f.venue}</span>
                    <p className="mt-1 text-sm text-white/60">{f.note}</p>
                  </div>
                  <span className={`${serif.className} text-2xl italic`} style={{ color: TEAL }}>
                    {f.fee}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Redeemable callout */}
          <section className="mt-14 rounded-2xl border border-white/15 bg-white/[0.06] p-8 text-center backdrop-blur-md sm:p-10">
            <p className={`${serif.className} text-2xl italic text-white sm:text-3xl`}>
              &ldquo;Every hex on earth is redeemable for real&nbsp;
              <span style={{ color: TEAL }}>$VAVA</span>.&rdquo;
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
              That is not a roadmap promise - it is how the protocol works. Raze your hex and
              the tokens inside are yours. Most people never will: the land is usually worth
              more than the tokens inside it.
            </p>
          </section>

          {/* CTA */}
          <div className="mt-12 pb-4 text-center">
            <Link
              href="/map"
              className="inline-block rounded-full border border-white/30 bg-white/10 px-10 py-4 text-base font-semibold tracking-[0.08em] text-white backdrop-blur-md transition-all hover:scale-[1.03] hover:bg-white/20"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' }}
            >
              ENTER VAVAWORLD
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
