'use client';

import Link from 'next/link';

export function BrandLink() {
  return (
    <Link
      href="/"
      className="absolute top-5 left-5 z-20 flex items-center gap-2.5 transition-opacity hover:opacity-80"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/vavaworld-mark.svg" alt="" width={28} height={28} />
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--ink)',
        }}
      >
        VAVAWORLD
      </span>
    </Link>
  );
}
