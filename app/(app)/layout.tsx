'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { cn } from '@/lib/utils';

/**
 * Shell for every routed page under (app)/. The sidebar is a fixed-positioned
 * glass overlay so /map can bleed the map all the way under the gutters; other
 * pages get auto-padding to clear the rail.
 *
 * Mobile (<md): the same `AppSidebar` lives off-screen by default and slides
 * in from the left as a drawer when the hamburger on `MobileTopBar` is tapped.
 * No new chrome introduced — same glass surface, just repositioned.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMap = pathname?.startsWith('/map') ?? false;
  // /portfolio (Variant A) is a full-bleed standalone page with its OWN
  // sidebar — skip the shared AppSidebar + padding entirely there.
  const isStandalone = pathname?.startsWith('/portfolio') ?? false;
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-close the drawer whenever the route changes (covers Link clicks
  // inside the sidebar that nav away).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll behind the drawer so the page underneath doesn't move.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = drawerOpen ? 'hidden' : prev || '';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  if (isStandalone) {
    // /portfolio renders its own full-bleed .pf-stage (own sidebar + own sky).
    // It still gets the shared mobile chrome so navigation stays consistent.
    return (
      <div className="relative h-[100dvh] overflow-hidden">
        <MobileTopBar onMenuClick={() => setDrawerOpen(true)} />
        {drawerOpen && (
          <div
            aria-hidden
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-[28] bg-black/30 backdrop-blur-sm md:hidden"
          />
        )}
        <AppSidebar mobileOpen={drawerOpen} onMobileClose={() => setDrawerOpen(false)} />
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative min-h-[100dvh] w-full bg-cover bg-center bg-fixed"
      style={{
        // Shared sky photo behind every (app) page (sky-bg.jpg is the exact
        // 360_F_98262429… stock image the brief referenced).
        backgroundImage: "url('/sky-bg.jpg')",
      }}
    >
      <div className="relative z-10 h-[100dvh] overflow-hidden">
        <MobileTopBar onMenuClick={() => setDrawerOpen(true)} />
        {drawerOpen && (
          <div
            aria-hidden
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-[28] bg-black/30 backdrop-blur-sm md:hidden"
          />
        )}
        <AppSidebar mobileOpen={drawerOpen} onMobileClose={() => setDrawerOpen(false)} />
        <main
          className={cn(
            'relative h-full',
            // Non-map routes clear the fixed sidebar on desktop and the
            // top bar on mobile. /map bleeds full-width on both.
            isMap ? '' : 'overflow-auto pt-[78px] text-foreground md:ml-[268px] md:pt-0',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
