'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { cn } from '@/lib/utils';

/**
 * Shell for every routed page under (app)/. The sidebar is a fixed-positioned
 * glass overlay so /map can bleed the map all the way under the gutters; other
 * pages get auto-padding to clear the rail.
 *
 * Mobile (<md): the sidebar is hidden and MobileNav adds a top bar + bottom
 * tab bar. Non-map routes pad to clear those; /map bleeds edge-to-edge with
 * its own mobile-aware floating chrome.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMap = pathname?.startsWith('/map') ?? false;
  // /portfolio (Variant A) is a full-bleed standalone page with its OWN
  // sidebar — skip the shared AppSidebar + padding entirely there.
  const isStandalone = pathname?.startsWith('/portfolio') ?? false;

  if (isStandalone) {
    // /portfolio renders its own full-bleed .pf-stage (own sidebar + own sky).
    // Mobile still gets the shared top bar + bottom tab bar so navigation is
    // consistent everywhere; portfolio's CSS reserves the matching gutters.
    return (
      <div className="relative h-screen overflow-hidden">
        <MobileNav />
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full bg-cover bg-center bg-fixed"
      style={{
        // Shared sky photo behind every (app) page (sky-bg.jpg is the exact
        // 360_F_98262429… stock image the brief referenced).
        backgroundImage: "url('/sky-bg.jpg')",
      }}
    >
      <div className="relative z-10 h-[100dvh] overflow-hidden">
        <AppSidebar />
        <MobileNav />
        <main
          className={cn(
            'relative h-full',
            // Non-map routes clear the fixed sidebar; /map bleeds full-width.
            // Mobile non-map routes pad top for the floating header and bottom
            // for the tab bar (var(--safe-*) accounts for iOS notch / home).
            isMap
              ? ''
              : 'overflow-auto pb-[calc(60px+var(--safe-bottom))] pt-[calc(56px+var(--safe-top))] text-foreground md:ml-[268px] md:pb-0 md:pt-0',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
