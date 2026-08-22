'use client';

/**
 * The landing page: a single full-screen video hero, nothing below it.
 * The nav carries the real login / wallet actions.
 */

import Link from 'next/link';
import { Inter, Instrument_Serif } from 'next/font/google';
import { useActiveWallet } from '@/lib/active-wallet';

const GLASS_PILL =
  'rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md transition-all hover:scale-[1.03] hover:bg-white/20';
const GLASS_INSET = { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' };

const sans = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], display: 'swap' });
const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], display: 'swap' });

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4';

const NAV_LINKS = [
  { label: 'Buy land', href: '/map' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Tokenomics', href: '/tokenomics' },
];

function Nav() {
  const wallet = useActiveWallet();

  return (
    <nav className="absolute inset-x-0 top-0 z-50 mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-6">
      <Link href="/" className="flex items-center">
        <span
          className="text-xl tracking-[0.02em] text-white"
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
          <Link href="/profile" className={`${GLASS_PILL} px-6 py-2.5 text-sm`} style={GLASS_INSET}>
            Profile
          </Link>
        )}
        {wallet.ready && !wallet.connected && (
          <button
            type="button"
            onClick={wallet.login}
            className={`${GLASS_PILL} px-6 py-2.5 text-sm`}
            style={GLASS_INSET}
          >
            Log in
          </button>
        )}
      </div>
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
