'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { cn } from '@/lib/utils';

/**
 * Shell for every routed page under (app)/. The sidebar is a fixed-positioned
 * glass overlay so /map can bleed the map all the way under the gutters; other
 * pages get auto-padding to clear the rail.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMap = pathname?.startsWith('/map') ?? false;
  // /portfolio (Variant A) is a full-bleed standalone page with its OWN
  // sidebar — skip the shared AppSidebar + padding entirely there.
  const isStandalone = pathname?.startsWith('/portfolio') ?? false;

  if (isStandalone) {
    // /portfolio renders its own full-bleed .pf-stage (own sidebar + own sky).
    return <div className="relative h-screen overflow-hidden">{children}</div>;
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
      <div className="relative z-10 h-screen overflow-hidden">
        <AppSidebar />
        <main
          className={cn(
            'relative h-full',
            // Non-map routes clear the fixed sidebar; /map bleeds full-width.
            isMap ? '' : 'ml-[268px] overflow-auto text-foreground',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
