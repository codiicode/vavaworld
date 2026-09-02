'use client';

import { BrandLogo } from '@/components/brand-logo';
import Link from 'next/link';

import { Reveal } from './Reveal';
import { ClaimDemo } from './ClaimDemo';
import { SplitFlow } from './SplitFlow';
import { Parallax } from './Parallax';
import { RulesStage } from './RulesStage';
import { WorldStats } from './WorldStats';
import { GameBoard } from './GameBoard';


/** Footer link columns. Kept beside the sections they point at. */
const FOOTER_COLUMNS = [
  {
    title: 'Play',
    links: [
      { label: 'Buy land', href: '/map' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Leaderboard', href: '/leaderboard' },
      { label: 'Portfolio', href: '/portfolio' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'How it works', href: '/#how' },
      { label: 'Tokenomics', href: '/#token' },
      { label: 'Docs', href: '/docs' },
      { label: 'Press kit', href: '/press' },
    ],
  },
  {
    title: 'More',
    links: [
      { label: 'Profile', href: '/profile' },
      { label: 'Activity', href: '/activity' },
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
    ],
  },
];

/** The supply ledger beside the split. */
/** The four rules. Each leads with its number - the figure is the
    point, the paragraph is the footnote. */




const SUPPLY = [
  { k: 'Total supply', v: '1B' },
  { k: 'Locked in land', v: '48.2M' },
  { k: 'Treasury', v: '210M' },
  { k: 'Sellers keep', v: '95%' },
];

const STATS = [
  { value: '249', label: 'Nations', sub: 'Every one has a throne' },
  { value: '~9 m', label: 'Per hex', sub: 'About the size of a house' },
  { value: '$0.10', label: 'To start', sub: 'Rises with every claim' },
  { value: '1', label: 'Owner per hex', sub: 'First come, first served' },
];



const COUNTRIES = [
  'Sweden', 'Japan', 'France', 'Brazil', 'Morocco', 'Kenya', 'Iceland', 'Peru',
  'Vietnam', 'Portugal', 'Norway', 'Chile', 'Nepal', 'Ghana', 'Croatia', 'Mexico',
];


export function LandingSections() {
  return (
    <div>
      {/* ── Country marquee: the scale, stated once ────────────── */}
      <section className="section-after-hero overflow-hidden py-10" style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="marquee-mask">
          <div className="marquee">
            {[...COUNTRIES, ...COUNTRIES].map((c, i) => (
              <span
                key={i}
                className={`display shrink-0 px-8 text-[26px] md:text-[34px]`}
                style={{ color: i % 3 === 0 ? 'var(--ink)' : 'var(--ink-3)' }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats band ─────────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid var(--rule)' }}>
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal
              key={s.label}
              delay={i * 80}
              className="px-6 py-10 text-center md:py-14"
              style={{ borderLeft: i === 0 ? 'none' : '1px solid var(--rule)' }}
            >
              <div
                className="stat-band-v"
                style={{ color: 'var(--ink)' }}
              >
                {s.value}
              </div>
              <div className="stat-band-k">{s.label}</div>
              <div className="stat-band-s">{s.sub}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Full-bleed: the stage needs the whole screen. */}
      <div id="how">
        <ClaimDemo />
      </div>

      {/* ── Tokenomics ─────────────────────────────────────────── */}
      <section id="token" className="seam-glow tokenomics-dark px-5 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <div className="rules-head">
              <span className="rules-kicker">Tokenomics</span>
              <h2 className="rules-title">
                Every hex you buy,
                <br />
                buys <span className="num">$VAVA</span>.
              </h2>
              <Link href="/#token" className="rules-link">
                Full tokenomics
                <svg width="13" height="9" viewBox="0 0 15 10" fill="none" aria-hidden>
                  <path
                    d="M1 5h12M9.5 1.2 13.4 5l-3.9 3.8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <SplitFlow />
          </Reveal>

          {/* Supply, as a line of figures across the page. */}
          <Reveal delay={200}>
            <div className="mt-24 grid grid-cols-2 gap-x-8 gap-y-12 text-center md:grid-cols-4">
              {SUPPLY.map((r) => (
                <div key={r.k}>
                  <div className="text-[32px] font-semibold tabular-nums text-white md:text-[42px]">
                    {r.v}
                  </div>
                  <div
                    className="mt-2 text-[10.5px] uppercase tracking-[0.16em]"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    {r.k}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The rules ──────────────────────────────────────────── */}
      {/* Four full-width bands, alternating side to side. Each carries a
          drawing that IS the rule rather than an icon beside it. */}
      <section id="rules" className="ground-black seam-glow relative">
        <div aria-hidden className="closer-stars" style={{ opacity: 0.28 }} />

        <div className="relative mx-auto max-w-[1280px] px-5 pt-24 md:px-10 md:pt-32">
          <Reveal>
            <div className="rules-head">
              <span className="rules-kicker">Enforced by the contract</span>
              <h2 className="rules-title">
                <span className="num">Four</span> rules that make it
                <br />
                a real game.
              </h2>
            </div>
          </Reveal>
        </div>

        <RulesStage />
      </section>

      {/* ── Scoreboard ─────────────────────────────────────────── */}
      <section
        id="board"
        className="ground-black seam-glow relative px-5 py-24 md:px-10 md:py-32"
      >
        <div aria-hidden className="closer-stars" style={{ opacity: 0.26 }} />
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <div className="view-head">
              <div>
                <h2 className="vh-title mt-4">Who owns the world right now.</h2>
              </div>
              <Link href="/leaderboard" className="btn-outline !px-6 !py-3 !text-[13px]">
                Full leaderboard
              </Link>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="mt-10">
              <WorldStats />
            </div>
          </Reveal>

          <Reveal delay={160}>
            <Parallax rate={-20} className="mt-6">
              <GameBoard />
            </Parallax>
          </Reveal>
        </div>
      </section>

      {/* ── Closing ────────────────────────────────────────────── */}
      {/* The page opened on the planet, so it closes on it. */}
      <section className="closer flex min-h-[105vh] flex-col justify-center px-5 pb-[16vh] pt-32 text-center md:px-10 md:pt-44">
        <div aria-hidden className="closer-film">
          <video src="/videos/hero-loop.mp4" autoPlay muted loop playsInline preload="none" />
        </div>
        <div aria-hidden className="closer-stars" style={{ opacity: 0.4 }} />

        <div className="closer-body">
          <Reveal>
            <p className="eyebrow">The map is filling up.</p>
          </Reveal>
          <Reveal delay={90}>
            <h2
              className="closer-title display mx-auto mt-8 max-w-[15ch]"
              style={{ color: 'var(--ink)' }}
            >
              Every hex has one owner.{' '}
              <span style={{ color: 'var(--accent)' }}>Go be it.</span>
            </h2>
          </Reveal>
          <Reveal delay={180}>
            <div className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/map" className="btn-ink">
                Claim your first hex
              </Link>
              <Link href="/leaderboard" className="btn-outline">
                See who is winning
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────
          The last thing on the page, so it gets to be a room of its
          own: the wordmark at poster scale, then the small print. */}
      <footer
        className="footer-slab relative overflow-hidden px-5 pt-20 md:px-10 md:pt-24"

      >
        <div className="relative mx-auto max-w-[1200px]">
          {/* Links */}
          <div className="grid gap-12 pb-20 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-8 md:pb-28">
            <div>
              <div className="flex items-center gap-2.5">
                <BrandLogo size={22} variant="white" />
                <span
                  className="text-[13px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: 'var(--ink)' }}
                >
                  Vavaworld
                </span>
              </div>
              <p
                className="mt-5 max-w-[34ch] text-[14px] leading-relaxed"
                style={{ color: 'var(--ink-2)' }}
              >
                1.66 trillion hexagons. 249 countries. One owner each, on-chain and permanent.
              </p>
              <Link href="/map" className="btn-ink mt-8 !px-6 !py-3 !text-[13px]">
                Claim your first hex
              </Link>
            </div>

            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <p
                  className="text-[10.5px] uppercase tracking-[0.2em]"
                  style={{ color: 'var(--ink-3)' }}
                >
                  {col.title}
                </p>
                <ul className="mt-5 flex flex-col gap-3.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="foot-link text-[14px]">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>


          {/* Small print */}
          <div
            className="flex flex-col items-center justify-between gap-4 py-8 text-[12.5px] md:flex-row"
            style={{ borderTop: '1px solid var(--rule)', color: 'var(--ink-3)' }}
          >
          <span className="flex items-center gap-2.5">
            <BrandLogo size={18} variant="white" />
            <span
              className="text-[13px] text-white"
              style={{ fontFamily: '"StretchPro", "Abril Fatface", Georgia, serif' }}
            >
              VAVAWORLD
            </span>
            <span>© {new Date().getFullYear()} · $VAVA</span>
          </span>
            <Link href="/#how" className="foot-link">
              How it works
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
