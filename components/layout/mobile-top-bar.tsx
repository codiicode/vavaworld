'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

/**
 * Mobile-only top bar — hidden at md+. Uses the *exact* same glass recipe as
 * the desktop AppSidebar (gradient + blur + border + inset highlight) so the
 * shell reads as one continuous surface.
 *
 * Contains a brand wordmark and a hamburger that toggles the AppSidebar drawer
 * managed by `(app)/layout.tsx`.
 */
export function MobileTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header
      className="fixed left-3 right-3 top-3 z-20 flex h-[54px] items-center justify-between rounded-[18px] px-4 md:hidden"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 100%)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.45)',
        boxShadow:
          '0 18px 50px rgba(40,80,150,0.22), 0 2px 8px rgba(40,80,150,0.12), inset 0 1px 0 rgba(255,255,255,0.65)',
      }}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <BrandLogo size={30} />
        <span className="text-[13px] font-bold tracking-[0.14em] text-foreground">
          VAVAWORLD
        </span>
      </Link>

      <button
        type="button"
        aria-label="Open menu"
        onClick={onMenuClick}
        className="grid h-9 w-9 place-items-center rounded-[10px] text-foreground/75 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <Menu size={20} strokeWidth={1.8} />
      </button>
    </header>
  );
}
