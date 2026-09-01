'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TopNav, MobileNav } from '@/components/layout/app-sidebar';
import { MapDock } from '@/components/map/map-dock';
import { GlowBackground } from '@/components/ui/glow-background';
import { cn } from '@/lib/utils';

/**
 * Shell for every routed page under (app)/. The nav is a fixed-positioned
 * glass bar across the top so /map can bleed the map all the way under it;
 * other pages get auto-padding to clear it.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMap = pathname?.startsWith('/map') ?? false;

  // The map is always dark: its chrome floats on satellite imagery, so a light
  // theme there never looked right. A separate class rather than `dark` —
  // ThemeProvider owns `dark` and toggles it off whenever the theme changes,
  // which would strip ours. The user's stored preference is untouched.
  useEffect(() => {
    const root = document.documentElement;
    // Every (app) route is dark, not just the map — the light theme on
    // portfolio/profile/etc. read as a different product.
    root.classList.add('force-dark');
    return () => root.classList.remove('force-dark');
  }, [isMap]);

  return (
    <div className="relative min-h-screen w-full">
      {/* Shared white + soft-glow backdrop for every (app) page. */}
      <GlowBackground />
      <div className={cn('relative z-10 h-screen overflow-hidden', isMap && 'map-shell')}>
        {/* /map gets app-style chrome instead of the top bar: a floating
            dock + brand/account pills that leave the map full-bleed. Every
            other (app) route keeps the shared top nav. */}
        {isMap ? (
          <MapDock />
        ) : (
          <>
            <TopNav />
            <MobileNav />
          </>
        )}
        <main
          className={cn(
            'relative h-full',
            // Desktop: non-map routes clear the fixed top bar; /map bleeds
            // full so the map runs under it. Mobile: top padding clears the
            // mobile bar (except /map, which bleeds under the floating bar).
            isMap ? '' : 'overflow-auto pt-14 text-foreground md:pt-[96px]',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
