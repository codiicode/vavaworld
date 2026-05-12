'use client';

import { useCallback, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IdentityCard } from '@/components/profile/identity-card';
import { TilesTab } from '@/components/profile/tiles-tab';
import { ActivityTab } from '@/components/profile/activity-tab';
import { ProfileVersionProvider } from '@/lib/use-user-profile';

/**
 * /profile — identity surface + tile holdings.
 *
 *   1. IdentityCard (avatar, display name, summary stats, edit button)
 *   2. Tabs:
 *      - Tiles    — full holdings table/grid with search + filter
 *      - Activity — placeholder until indexer exists
 *
 * Overview tab is gone — IdentityCard's three stats are the summary; a
 * separate Overview duplicated them with mock data, which wasn't useful.
 *
 * ProfileVersionProvider lets a save in the edit dialog force every
 * `useUserProfile` consumer (this page, AppSidebar) to re-fetch.
 */
export default function ProfilePage() {
  const [tab, setTab] = useState<'tiles' | 'activity'>('tiles');
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <ProfileVersionProvider value={version}>
      <TooltipProvider delayDuration={200}>
        <div className="mx-auto max-w-[1400px] px-8 py-8">
          <IdentityCard onSavedBumpVersion={bump} />

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="mb-6 h-auto rounded-none border-b border-border bg-transparent p-0">
              {(['tiles', 'activity'] as const).map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="mr-6 rounded-none border-b-2 border-transparent px-0 pb-3 text-[13px] font-medium capitalize text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="tiles" className="mt-0">
              <TilesTab />
            </TabsContent>
            <TabsContent value="activity" className="mt-0">
              <ActivityTab />
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
    </ProfileVersionProvider>
  );
}
