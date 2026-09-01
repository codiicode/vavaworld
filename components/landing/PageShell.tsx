'use client';

/**
 * The shell for standalone marketing pages (docs, legal). Same header,
 * ground and type as the landing page, so these never read as a
 * different site — the previous standalone pages used a meadow video
 * and a serif face and looked unrelated to the product.
 */

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GeistSans } from 'geist/font/sans';
import { BrandLogo } from '@/components/brand-logo';

const NAV = [
  { label: 'Buy land', href: '/map' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'How it works', href: '/#how' },
  { label: '$VAVA', href: '/#token' },
];

export function PageShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`${GeistSans.className} landing-root min-h-screen`}
      style={{ background: '#04060b' }}
    >
      <nav
        className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(6,8,13,0.86)' : 'transparent',
          backdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'none',
          borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.07)' : 'transparent'}`,
        }}
      >
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="flex min-h-[44px] flex-none items-center gap-2.5">
            <BrandLogo size={22} variant="white" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.28em] text-white">
              Vavaworld
            </span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className="text-[13.5px] text-white/55 transition-colors hover:text-white"
              >
                {n.label}
              </Link>
            ))}
          </div>

          <Link href="/map" className="btn-ink !px-5 !py-2.5 !text-[13px]">
            Claim a tile
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[820px] px-5 pb-28 pt-32 md:px-8 md:pt-40">
        {eyebrow && (
          <p className="text-[10.5px] uppercase tracking-[0.24em] text-white/38">{eyebrow}</p>
        )}
        <h1 className="mt-4 text-[clamp(1.9rem,1.2rem+2vw,2.8rem)] font-semibold leading-[1.08] tracking-[-0.032em] text-white">
          {title}
        </h1>
        {lede && <p className="mt-5 max-w-[62ch] text-[15.5px] leading-relaxed text-white/58">{lede}</p>}

        <div className="prose-doc mt-14">{children}</div>
      </main>

      <footer className="border-t border-white/[0.07] bg-black">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col items-center justify-between gap-4 px-5 py-8 text-[12.5px] text-white/38 md:flex-row md:px-8">
          <span>© {new Date().getFullYear()} VAVAWORLD · $VAVA</span>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="inline-flex min-h-[44px] items-center transition-colors hover:text-white/70">
              Docs
            </Link>
            <Link href="/press" className="inline-flex min-h-[44px] items-center transition-colors hover:text-white/70">
              Press
            </Link>
            <Link href="/legal/privacy" className="inline-flex min-h-[44px] items-center transition-colors hover:text-white/70">
              Privacy
            </Link>
            <Link href="/legal/terms" className="inline-flex min-h-[44px] items-center transition-colors hover:text-white/70">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
