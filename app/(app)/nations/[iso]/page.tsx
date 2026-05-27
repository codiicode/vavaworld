import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getNation } from '@/lib/mock-nations';
import { CountryHeaderCard } from '@/components/nations/country-header-card';
import { PresidentHeroCard } from '@/components/nations/president-hero-card';
import { YourPositionCard } from '@/components/nations/your-position-card';
import { ActivityFeedCard } from '@/components/nations/activity-feed-card';

export default function CountryPage({ params }: { params: { iso: string } }) {
  const nation = getNation(params.iso);
  if (!nation) notFound();

  return (
    <div className="mx-auto max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] px-4 py-6 md:px-8 md:py-8 2xl:px-10">
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
        <YourPositionCard nation={nation} />
        <ActivityFeedCard nation={nation} />
      </div>
    </div>
  );
}
