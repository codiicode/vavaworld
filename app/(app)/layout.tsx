import { AppSidebar } from '@/components/layout/app-sidebar';

/**
 * Shell for every routed page under (app)/ — left rail nav + scrolling main.
 * The root layout already provides <html>, <body>, and <Providers>.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="relative flex-1 overflow-auto">{children}</main>
    </div>
  );
}
