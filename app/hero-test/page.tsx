'use client';

/**
 * Hero concept test bed - NOT wired into the real landing (same pattern as
 * /landing-alt). Two full-screen sections: video hero + parallax quote.
 * The nav mirrors the production Hero.tsx nav 1:1 (same links, same wallet
 * actions) recolored white for the dark video.
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Inter, Instrument_Serif } from 'next/font/google';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useActiveWallet } from '@/lib/active-wallet';
import { BrandLogo } from '@/components/brand-logo';
import './hero-test.css';

const sans = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], display: 'swap' });
const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], display: 'swap' });

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4';
const RAINBOW_URL =
  'https://soft-zoom-63098134.figma.site/_assets/v11/8d520a7515d06cbfc403d0125e3d05b1a7ccd29c.png';
const CLOUD_URL =
  'https://soft-zoom-63098134.figma.site/_assets/v11/0d6dfd3f90b930f21726f2ed56a3320d79b7a797.png';

const NAV_LINKS = [
  { label: 'Buy land', href: '/map' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Tokenomics', href: '/tokenomics' },
];

const lerp = (current: number, target: number, factor: number) =>
  current + (target - current) * factor;

function Nav() {
  const wallet = useActiveWallet();
  const { setVisible: openWalletModal } = useWalletModal();

  return (
    <nav className="absolute inset-x-0 top-0 z-50 mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-6">
      <Link href="/" className="flex items-center gap-2.5">
        <BrandLogo size={34} />
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
        {!wallet.ready && <span style={{ width: 160 }} />}
        {wallet.ready && wallet.connected && (
          <Link
            href="/profile"
            className="rounded-full bg-white px-6 py-2.5 text-sm text-black transition-transform hover:scale-[1.03]"
          >
            Profile
          </Link>
        )}
        {wallet.ready && !wallet.connected && (
          <>
            <button
              type="button"
              onClick={wallet.login}
              className="text-sm text-white/70 transition-colors hover:text-white"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => openWalletModal(true)}
              className="rounded-full bg-white px-6 py-2.5 text-sm text-black transition-transform hover:scale-[1.03]"
            >
              Connect wallet
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function Hero() {
  return (
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
          className="ht-button-glow mt-8 rounded-full bg-white px-8 py-3.5 text-sm font-medium tracking-wide text-black transition-all duration-300 hover:bg-white/90 md:mt-10"
        >
          ENTER VAVAWORLD
        </Link>
      </div>

      {/* Sound indicator */}
      <div className="absolute bottom-8 left-8 hidden items-center gap-3 md:flex">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20">
          <span className="block h-[2px] w-3 bg-white/60" />
        </div>
        <div className="text-xs leading-relaxed text-white/60">
          Experience
          <br />
          with sound
        </div>
      </div>
    </section>
  );
}

function QuoteSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const rainbowRef = useRef<HTMLImageElement>(null);
  const leftCloudRef = useRef<HTMLImageElement>(null);
  const rightCloudRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let raf = 0;
    // Current lerped values: rainbow Y, cloud X offset, cloud Y, cloud opacity.
    const cur = { ry: 120, cx: 200, cy: 0, co: 0 };

    const tick = () => {
      const el = sectionRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const wh = window.innerHeight;
        const progress = Math.min(1, Math.max(0, (wh - rect.top) / (wh + rect.height)));

        const ryTarget = 120 + (-160 - 120) * progress;
        const inView = progress > 0.12 && progress < 0.92;
        const cxTarget = inView ? 0 : 200;
        const cyTarget = progress * -50;

        cur.ry = lerp(cur.ry, ryTarget, 0.06);
        cur.cx = lerp(cur.cx, cxTarget, 0.04);
        cur.cy = lerp(cur.cy, cyTarget, 0.04);
        cur.co = 1 - Math.min(1, Math.abs(cur.cx) / 200);

        if (rainbowRef.current) {
          rainbowRef.current.style.transform = `translate3d(0, ${cur.ry}px, 0)`;
        }
        if (leftCloudRef.current) {
          leftCloudRef.current.style.transform = `translate3d(${-cur.cx}px, ${cur.cy}px, 0)`;
          leftCloudRef.current.style.opacity = String(cur.co);
        }
        if (rightCloudRef.current) {
          rightCloudRef.current.style.transform = `translate3d(${cur.cx}px, ${cur.cy}px, 0) scaleX(-1)`;
          rightCloudRef.current.style.opacity = String(cur.co);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex h-screen w-full items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #010A17 0%, #0A4267 30%, #20658E 60%, #6BADC4 100%)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={rainbowRef}
        src={RAINBOW_URL}
        alt=""
        aria-hidden
        className="absolute inset-x-0 top-0 z-30 w-full will-change-transform"
        style={{ transform: 'translate3d(0, 120px, 0)' }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={leftCloudRef}
        src={CLOUD_URL}
        alt=""
        aria-hidden
        className="absolute bottom-[10%] left-0 z-10 hidden w-[500px] will-change-transform sm:block md:w-[650px]"
        style={{ marginLeft: '-50%', opacity: 0, transform: 'translate3d(-200px, 0, 0)' }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={rightCloudRef}
        src={CLOUD_URL}
        alt=""
        aria-hidden
        className="absolute bottom-[15%] right-0 z-10 hidden w-[500px] will-change-transform sm:block md:w-[650px]"
        style={{ marginRight: '-75%', opacity: 0, transform: 'translate3d(200px, 0, 0) scaleX(-1)' }}
      />

      <div className="z-20 mx-auto max-w-4xl px-6 text-center">
        <p
          className={`${serif.className} text-xl leading-[1.45] text-white sm:text-2xl md:text-4xl md:leading-[1.5] lg:text-[42px]`}
        >
          &ldquo;VavaWorld was founded on a simple belief - that owning a piece of the earth should
          be open to anyone, anywhere. One hundred million cells, each held by exactly one person.
          No lease, no committee, no expiry. A register of the world that fills only once, and
          holds forever.&rdquo;
        </p>
        <p className="mt-6 text-sm tracking-wide text-white/80 md:mt-8 md:text-base">
          The VavaWorld founding letter
        </p>
      </div>
    </section>
  );
}

export default function HeroTestPage() {
  return (
    <div className={`${sans.className} bg-[#0a0608]`}>
      <Hero />
      <QuoteSection />
    </div>
  );
}
