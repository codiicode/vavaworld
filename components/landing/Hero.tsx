'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Instrument_Serif } from 'next/font/google';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useActiveWallet } from '@/lib/active-wallet';

const serif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
});

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4';

const NAV_LINKS = [
  { label: 'Buy land', href: '/map' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'How it works', href: '#how' },
  { label: 'Tokenomics', href: '#' },
];

/**
 * Cinematic hero: looping fade in/out video background under a serif headline.
 * The nav lives in-flow at the top (scrolls away with the hero) and carries the
 * real login / wallet actions so removing the old fixed SiteNav loses nothing.
 */
export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wallet = useActiveWallet();
  const { setVisible: openWalletModal } = useWalletModal();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const FADE = 0.5; // seconds
    let raf = 0;

    const tick = () => {
      const d = v.duration;
      if (d && !Number.isNaN(d)) {
        const t = v.currentTime;
        let o = 1;
        if (t < FADE) o = t / FADE;
        else if (t > d - FADE) o = Math.max(0, (d - t) / FADE);
        v.style.opacity = String(o);
      }
      raf = requestAnimationFrame(tick);
    };

    const onEnded = () => {
      v.style.opacity = '0';
      window.setTimeout(() => {
        v.currentTime = 0;
        void v.play().catch(() => {});
      }, 100);
    };

    v.addEventListener('ended', onEnded);
    void v.play().catch(() => {});
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <div className="alt-hero relative min-h-screen w-full overflow-hidden bg-white text-[#000000]">
      {/* Background video (z-0). Starts 300px down, fills to the bottom. */}
      <div className="absolute bottom-0 left-0 right-0 z-0" style={{ top: '300px' }}>
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          style={{ opacity: 0, transition: 'opacity 0.1s linear' }}
          src={VIDEO_URL}
          muted
          autoPlay
          playsInline
          preload="auto"
        />
      </div>

      {/* Navigation (z-10) - in-flow, carries the real login/wallet actions */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
        <Link href="/" className={`${serif.className} text-3xl tracking-tight text-[#000000]`}>
          VavaWorld
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm transition-colors hover:text-[#000000]"
              style={{ color: i === 0 ? '#000000' : '#6F6F6F' }}
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
              className="rounded-full bg-[#000000] px-6 py-2.5 text-sm text-white transition-transform hover:scale-[1.03]"
            >
              Profile
            </Link>
          )}
          {wallet.ready && !wallet.connected && (
            <>
              <button
                type="button"
                onClick={wallet.login}
                className="text-sm transition-colors hover:text-[#000000]"
                style={{ color: '#6F6F6F' }}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => openWalletModal(true)}
                className="rounded-full bg-[#000000] px-6 py-2.5 text-sm text-white transition-transform hover:scale-[1.03]"
              >
                Connect wallet
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero copy (z-10) */}
      <section
        className="relative z-10 flex flex-col items-center justify-center px-6 pb-40 text-center"
        style={{ paddingTop: 'calc(8rem - 75px)' }}
      >
        <h1
          className={`${serif.className} alt-fade-rise max-w-7xl text-5xl font-normal sm:text-7xl md:text-8xl`}
          style={{ lineHeight: 0.95, letterSpacing: '-2.46px', color: '#000000' }}
        >
          The oldest currency in{' '}
          <span style={{ fontStyle: 'italic', color: '#6F6F6F' }}>human history.</span>
          <br />
          Now digital.
        </h1>

        <p
          className="alt-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed sm:text-lg"
          style={{ color: '#6F6F6F' }}
        >
          VavaWorld divides the surface of the earth into one hundred million hexagonal cells. Each
          cell is held by exactly one person - in their name, without expiry.
        </p>

        <Link
          href="/map"
          className="alt-fade-rise-delay-2 mt-12 rounded-full bg-[#000000] px-14 py-5 text-base text-white transition-transform hover:scale-[1.03]"
        >
          Open the map
        </Link>
      </section>
    </div>
  );
}
