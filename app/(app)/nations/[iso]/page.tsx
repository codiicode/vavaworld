import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getNation } from '@/lib/mock-nations';
import { CountryHeaderCard } from '@/components/nations/country-header-card';
import { PresidentHeroCard } from '@/components/nations/president-hero-card';
import { CabinetGrid } from '@/components/nations/cabinet-grid';
import { YourPositionCard } from '@/components/nations/your-position-card';
import { ActivityFeedCard } from '@/components/nations/activity-feed-card';

export default function CountryPage({ params }: { params: { iso: string } }) {
  const nation = getNation(params.iso);
  if (!nation) notFound();

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <Link
        href="/nations"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
      >
        <ChevronLeft size={15} />
        All nations
      </Link>

      <div className="flex flex-col gap-6">
        <CountryHeaderCard nation={nation} />
        <PresidentHeroCard nation={nation} />
        <CabinetGrid nation={nation} />
        <YourPositionCard nation={nation} />
        <ActivityFeedCard nation={nation} />
      </div>
    </div>
  );
}
