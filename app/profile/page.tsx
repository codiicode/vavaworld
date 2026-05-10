'use client';

import { AuthButton } from '@/components/AuthButton';
import { BrandLink } from '@/components/BrandLink';
import { ProfileView } from '@/components/ProfileView';

export default function Page() {
  return (
    <main className="min-h-screen">
      <BrandLink />
      <AuthButton />
      <ProfileView />
    </main>
  );
}
