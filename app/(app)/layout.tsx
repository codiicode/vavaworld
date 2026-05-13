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

  return (
    <div className="relative h-screen overflow-hidden">
      <AppSidebar />
      <main
        className={cn(
          'relative h-full',
          // Non-map routes: clear the sidebar but leave the dark body bg
          // showing through so glass panels read against it consistently.
          isMap ? '' : 'ml-[268px] overflow-auto text-white',
        )}
      >
        {children}
      </main>
    </div>
  );
}
