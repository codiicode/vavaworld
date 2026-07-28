import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';

const sans = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], display: 'swap' });

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260228_065522_522e2295-ba22-457e-8fdb-fbcd68109c73.mp4';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'Three small, deliberate acts - from any place on the earth to a cell that is permanently yours.',
};

const STEPS = [
  {
    n: 'i.',
    title: 'Find a place on the earth.',
    body: 'Real coordinates, true scale. Any place not yet taken - a house, a corner, a clearing in a forest.',
  },
  {
    n: 'ii.',
    title: 'Take it, in one transaction.',
    body: 'A small sum, settled in a moment. No subscription, no lease, no committee - first asked, first received.',
  },
  {
    n: 'iii.',
    title: 'It is yours, permanently.',
    body: 'Transferable, inheritable, non-revocable. Pass it to a child or a friend, or back into the market, in your own time.',
  },
];

export default function HowItWorksPage() {
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
            'linear-gradient(180deg, rgba(6,10,18,0.62) 0%, rgba(6,10,18,0.4) 38%, rgba(6,10,18,0.78) 100%)',
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

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-8 py-16">
          <h1
            className="max-w-3xl text-5xl font-normal sm:text-6xl"
            style={{ lineHeight: 1.02, letterSpacing: '-0.02em' }}
          >
            How it{' '}
            <span className={serif.className} style={{ fontStyle: 'italic' }}>
              works.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/65 sm:text-lg">
            Three small, deliberate acts. From any place on the earth to a cell that is permanently yours.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/15 bg-white/[0.06] p-7 backdrop-blur-md"
              >
                <span className={`${serif.className} text-2xl italic text-[#5eead4]`}>{s.n}</span>
                <h3 className="mt-3 text-xl font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <Link
              href="/map"
              className="inline-block rounded-full bg-white px-10 py-4 text-base font-semibold transition-transform hover:scale-[1.03]"
              style={{ color: '#0a0a0a' }}
            >
              Enter VavaWorld
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
