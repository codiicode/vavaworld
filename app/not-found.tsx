import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/30 p-8 text-center backdrop-blur-md">
        <BrandLogo size={44} variant="white" className="mx-auto" />
        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
          Unclaimed territory
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          This page doesn&apos;t exist.
        </h1>
        <p className="mt-3 text-sm text-foreground/70">
          Nothing has been claimed at this address. The world map, on the other
          hand, is very real.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/map"
            className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          >
            Open the map
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-white/50 bg-white/40 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/60"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
