'use client';

/**
 * The landing page. The first screen is the full-bleed planet video with the
 * nav floating over it in glass - the original VAVAWORLD hero. Everything
 * below it is the dark editorial page.
 */

import { BrandLogo } from '@/components/brand-logo';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GeistSans } from 'geist/font/sans';
import { useActiveWallet } from '@/lib/active-wallet';
import { LandingSections } from './LandingSections';
import { useHeroMotion } from './useHeroMotion';
import { AppDock } from './AppDock';
import { useLandingStats, compact } from '@/lib/use-landing-stats';

const VIDEO_URL = '/videos/hero-loop.mp4';

/** Placeholder shown until the live figures arrive. */
const HERO_FALLBACK = [
  { k: 'Claimed today', v: ' - ' },
  { k: 'Hexes left', v: ' - ' },
  { k: 'Floor', v: '$0.10' },
  { k: 'Owners', v: ' - ' },
];

const NAV_LINKS = [
  { label: 'Buy land', href: '/map' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'How it works', href: '/#how' },
  { label: 'Tokenomics', href: '/#token' },
];

function Nav() {
  const wallet = useActiveWallet();
  // Mobile-only dropdown: desktop shows the inline link row instead.
  const [menuOpen, setMenuOpen] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const onScroll = () => setGone(window.scrollY > window.innerHeight * 0.55);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className="absolute inset-x-0 top-0 z-50 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-5 transition-opacity duration-500 md:px-8 md:py-6"
      style={{ opacity: gone ? 0 : 1, pointerEvents: gone ? 'none' : 'auto' }}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <BrandLogo size={22} variant="white" />
        <span
          className="text-[15px] text-white"
          style={{ fontFamily: '"StretchPro", "Abril Fatface", Georgia, serif' }}
        >
          VAVAWORLD
        </span>
      </Link>

      <div className="hidden items-center gap-8 md:flex">
        {NAV_LINKS.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            className={`text-sm transition-colors hover:text-white ${
              i === 0 ? 'text-white' : 'text-white/70'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {!wallet.ready && <span style={{ width: 96 }} />}
        {wallet.ready && wallet.connected && (
          <Link
            href="/profile"
            className="glass-pill whitespace-nowrap px-4 py-2.5 text-sm md:px-6"
          >
            Profile
          </Link>
        )}
        {wallet.ready && !wallet.connected && (
          <button
            type="button"
            onClick={wallet.login}
            className="glass-pill whitespace-nowrap px-4 py-2.5 text-sm md:px-6"
          >
            Log in
          </button>
        )}
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
          className="glass-pill grid h-[42px] w-[42px] place-items-center md:hidden"
        >
          {menuOpen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
              <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <>
          {/* Tap-outside catcher under the panel */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/40 md:hidden"
          />
          <div
            className="absolute inset-x-4 top-[86px] z-50 flex flex-col overflow-hidden rounded-2xl border border-white/15 md:hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(16,22,38,0.92), rgba(8,12,24,0.94))',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-white/[0.10] px-6 py-4 text-[15px] text-white/85 transition-colors last:border-b-0 hover:bg-white/[0.05] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}

export function VideoHero() {
  const stage = useHeroMotion();
  const stats = useLandingStats();

  // Real figures from the same aggregates the app reads.
  const heroStats = stats
    ? [
        { k: 'Claimed today', v: stats.claimedToday.toLocaleString('en-US') },
        { k: 'Hexes left', v: compact(stats.tilesRemaining) },
        { k: 'Floor', v: '$0.10' },
        { k: 'Owners', v: stats.holders.toLocaleString('en-US') },
      ]
    : HERO_FALLBACK;

  return (
    <div className={`${GeistSans.className} landing-root`}>
      <AppDock />
      {/* Light behind the whole lower page, so it never falls to flat black. */}
      <div aria-hidden className="page-glow" />

      {/* ── Hero: the video is the whole first screen ── */}
      <section ref={stage} className="hero-stage relative h-screen w-full overflow-hidden">
        <video
          className="hero-video par absolute inset-0 h-full w-full object-cover"
          style={{ ['--par-depth' as string]: '14px' }}
          src={VIDEO_URL}
          poster="/videos/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div aria-hidden className="hero-rim" />
        <div aria-hidden className="hero-flare" />
        <div aria-hidden className="starfield par" style={{ ['--par-depth' as string]: '26px' }} />
        <div aria-hidden className="hero-aurora par" style={{ ['--par-depth' as string]: '38px' }} />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(4,6,11,0.55) 0%, rgba(4,6,11,0.34) 38%, rgba(4,6,11,0.78) 100%)',
          }}
        />
        <div aria-hidden className="hero-vignette" />
        <div aria-hidden className="hero-grain" />

        <Nav />

        <div
          className="par absolute inset-0 z-10 mt-[46px] flex flex-col items-center justify-center px-5"
          style={{ ['--par-depth' as string]: '-9px' }}
        >
          <h1 className="hero-display text-center text-white">
            <span className="line-mask">
              <span className="lede" style={{ animationDelay: '140ms' }}>
                The oldest currency
              </span>
            </span>
            <span className="line-mask">
              <span className="payload" style={{ animationDelay: '260ms' }}>
                <span>in human history.</span>
              </span>
            </span>
          </h1>

          <p
            className="rise mt-5 max-w-[42ch] text-center text-[15.5px] leading-relaxed md:text-[17px]"
            style={{ color: 'rgba(255,255,255,0.62)', animationDelay: '420ms' }}
          >
            Earth divided into 1.66 trillion hexagons. Claim one and it is yours on-chain,
            permanently.
          </p>
          <Link
            href="/map"
            className="cta-enter rise mt-8 px-9 py-4 text-[13.5px] font-medium uppercase tracking-[0.14em] md:mt-9"
            style={{ animationDelay: '760ms' }}
          >
            Enter Vavaworld
            <svg width="15" height="10" viewBox="0 0 15 10" fill="none" aria-hidden>
              <path
                d="M1 5h12M9.5 1.2 13.4 5l-3.9 3.8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          {/* A slice of the real product, in its own chrome. */}
          <div className="app-strip rise mt-10" style={{ animationDelay: '900ms' }}>
            {heroStats.map((s) => (
              <div key={s.k} className="cell">
                <span className="k">
                  {s.k}
                </span>
                <span className="v">{s.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden className="hero-scrim" />
        <div aria-hidden className="hero-seam" />
        <div className="scroll-cue rise z-10" style={{ animationDelay: '1100ms' }} aria-hidden>
          <span>Scroll</span>
          <span className="rail" />
        </div>
      </section>

      <LandingSections />
    </div>
  );
}
