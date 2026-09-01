import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getServerSupabase } from '@/lib/supabase-server';
import { calculateFloor } from '@/lib/pricing';
import { apiToNation } from '@/lib/nation-map';
import { CountryHeaderCard } from '@/components/nations/country-header-card';
import { ThronePanel } from '@/components/nations/throne-panel';
import { YourPositionCard } from '@/components/nations/your-position-card';
import { ActivityFeedCard } from '@/components/nations/activity-feed-card';

export const revalidate = 30;

type CountryRow = {
  iso_code: string;
  name: string;
  claim_count: number;
  holder_count: number;
  total_spent_usd: number;
  top_owner: string | null;
  top_owner_username: string | null;
  top_owner_hexes: number | null;
};

export default async function CountryPage({ params }: { params: { iso: string } }) {
  const iso = params.iso.toUpperCase();
  const sb = getServerSupabase();
  const { data } = await sb.rpc('country_stats');
  const row = ((data ?? []) as CountryRow[]).find((r) => r.iso_code === iso);
  if (!row) notFound();

  const nation = apiToNation({
    iso: row.iso_code.toLowerCase(),
    name: row.name,
    claims: Number(row.claim_count),
    holders: Number(row.holder_count),
    volumeUsd: Number(row.total_spent_usd),
    floorUsd: calculateFloor(Number(row.claim_count)),
    topOwner: row.top_owner,
    topOwnerUsername: row.top_owner_username,
    topOwnerHexes: Number(row.top_owner_hexes ?? 0),
  });

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8">
      <Link
        href="/nations"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
      >
        <ChevronLeft size={15} />
        All nations
      </Link>

      <div className="flex flex-col gap-6">
        <CountryHeaderCard nation={nation} />
        <ThronePanel iso={iso} />
        <YourPositionCard nation={nation} />
        <ActivityFeedCard nation={nation} />
      </div>
    </div>
  );
}
