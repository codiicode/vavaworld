'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar, MobileNav } from '@/components/layout/app-sidebar';
import { GlowBackground } from '@/components/ui/glow-background';
import { cn } from '@/lib/utils';

/**
 * Shell for every routed page under (app)/. The sidebar is a fixed-positioned
 * glass overlay so /map can bleed the map all the way under the gutters; other
 * pages get auto-padding to clear the rail.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMap = pathname?.startsWith('/map') ?? false;

  return (
    <div className="relative min-h-screen w-full">
      {/* Shared white + soft-glow backdrop for every (app) page. */}
      <GlowBackground />
      <div className="relative z-10 h-screen overflow-hidden">
        <AppSidebar />
        <MobileNav />
        <main
          className={cn(
            'relative h-full',
            // Desktop: non-map routes clear the fixed rail; /map bleeds full.
            // Mobile: full-width, with top padding to clear the mobile bar
            // (except /map, which bleeds under the floating bar).
            isMap ? '' : 'overflow-auto pt-14 text-foreground md:ml-[268px] md:pt-0',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
