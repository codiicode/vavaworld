'use client';

import { useCallback, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IdentityCard } from '@/components/profile/identity-card';
import { TilesTab } from '@/components/profile/tiles-tab';
import { ActivityTab } from '@/components/profile/activity-tab';
import { ProfileVersionProvider } from '@/lib/use-user-profile';
import { SignInGate } from '@/components/auth/sign-in-gate';

/**
 * /profile — light glass surface matching the Claude Design output.
 *
 *   1. IdentityCard (avatar + name + meta + Export key / Edit profile + 3 stats)
 *   2. Tabs: Tiles | Activity
 *   3. Tab content
 *
 * ProfileVersionProvider lets a save in the edit dialog force every
 * `useUserProfile` consumer (this page, AppSidebar) to re-fetch.
 */
export default function ProfilePage() {
  const [tab, setTab] = useState<'hexes' | 'activity'>('hexes');
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <ProfileVersionProvider value={version}>
      <TooltipProvider delayDuration={200}>
        <SignInGate label="profile">
        <div className="mx-auto max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] px-4 py-6 md:px-8 md:py-8 2xl:px-10">
          <IdentityCard onSavedBumpVersion={bump} />

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="mb-6 h-auto rounded-none border-b border-foreground/10 bg-transparent p-0">
              {(['hexes', 'activity'] as const).map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="mr-6 rounded-none border-b-2 border-transparent px-0 pb-3 text-[13px] font-medium capitalize text-foreground/55 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="hexes" className="mt-0">
              <TilesTab />
            </TabsContent>
            <TabsContent value="activity" className="mt-0">
              <ActivityTab />
            </TabsContent>
          </Tabs>
        </div>
        </SignInGate>
      </TooltipProvider>
    </ProfileVersionProvider>
  );
}
