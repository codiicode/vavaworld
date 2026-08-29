'use client';

/**
 * The landing page: a single full-screen video hero, nothing below it.
 * The nav carries the real login / wallet actions.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Inter, Instrument_Serif } from 'next/font/google';
import { useActiveWallet } from '@/lib/active-wallet';

const GLASS_PILL =
  'rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md transition-all hover:scale-[1.03] hover:bg-white/20';
const GLASS_INSET = { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' };

const sans = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], display: 'swap' });
const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], display: 'swap' });

// Self-hosted: the original 13MB 4K file lived on the AI provider's
// CloudFront bucket (out of our control - link-rot risk) and every
// visitor downloaded all of it. Re-encoded to 1080p CRF28 = 0.9MB,
// visually identical for a dark background loop.
const VIDEO_URL = '/videos/hero.mp4';

const NAV_LINKS = [
  { label: 'Buy land', href: '/map' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Tokenomics', href: '/tokenomics' },
];

function Nav() {
  const wallet = useActiveWallet();
  // Mobile-only dropdown: desktop shows the inline link row instead.
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="absolute inset-x-0 top-0 z-50 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-5 md:px-8 md:py-6">
      <Link href="/" className="flex items-center">
        <span
          className="text-[15px] tracking-[0.02em] text-white md:text-xl"
          style={{ fontFamily: '"StretchPro", "Abril Fatface", Georgia, serif' }}
        >
          VAVAWORLD
        </span>
      </Link>

      <div className="hidden items-center gap-8 md:flex">
        {NAV_LINKS.map((item, i) => (
          <a
            key={item.label}
            href={item.href}
            className={`text-sm transition-colors hover:text-white ${i === 0 ? 'text-white' : 'text-white/70'}`}
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {!wallet.ready && <span style={{ width: 96 }} />}
        {wallet.ready && wallet.connected && (
          <Link href="/profile" className={`${GLASS_PILL} whitespace-nowrap px-4 py-2.5 text-sm md:px-6`} style={GLASS_INSET}>
            Profile
          </Link>
        )}
        {wallet.ready && !wallet.connected && (
          <button
            type="button"
            onClick={wallet.login}
            className={`${GLASS_PILL} whitespace-nowrap px-4 py-2.5 text-sm md:px-6`}
            style={GLASS_INSET}
          >
            Log in
          </button>
        )}
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
          className={`${GLASS_PILL} grid h-[42px] w-[42px] place-items-center md:hidden`}
          style={GLASS_INSET}
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
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-white/[0.07] px-6 py-4 text-[15px] text-white/85 transition-colors last:border-b-0 hover:bg-white/[0.06] hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}

export function VideoHero() {
  return (
    <div className={`${sans.className} bg-[#0a0608]`}>
      <section className="relative h-screen w-full overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/hero-poster.jpg"
        />
        <div className="absolute inset-0 bg-black/20" />

        <Nav />

        <div className="absolute inset-0 -mt-[170px] flex flex-col items-center justify-center px-6">
          <h1
            className={`${serif.className} ht-text-glow text-center text-[36px] font-normal leading-[0.9] tracking-tight text-white md:text-7xl lg:text-[110px]`}
          >
            The oldest currency in <span style={{ fontStyle: 'italic' }}>human history.</span>
            <br />
            Now digital.
          </h1>
          <Link
            href="/map"
            className={`${GLASS_PILL} mt-8 px-8 py-3.5 text-sm font-medium tracking-wide md:mt-10`}
            style={GLASS_INSET}
          >
            ENTER VAVAWORLD
          </Link>
        </div>
      </section>
    </div>
  );
}
