'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NationPodiumCard } from '@/components/nations/nation-podium-card';
import { NationsTable } from '@/components/nations/nations-table';
import { RankingsSkeleton } from '@/components/rankings-skeleton';
import { useFirstMountLoading } from '@/lib/use-first-mount-loading';
import { NATIONS, sortNations, type NationSort } from '@/lib/mock-nations';

const SORT_LABELS: Record<NationSort, string> = {
  claims: 'Most Claims',
  floor: 'Highest Floor',
  bonded: 'Most Bonded $VAVA',
  bonders: 'Most Bonders',
};

const TRIGGER =
  'bg-white/40 backdrop-blur-md border-white/40 h-11 rounded-xl text-foreground';
const CONTENT = 'bg-white/90 backdrop-blur-xl border-white/40';

export default function NationsPage() {
  const [sort, setSort] = useState<NationSort>('claims');
  const [query, setQuery] = useState('');
  const loading = useFirstMountLoading();

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? NATIONS.filter(
          (n) =>
            n.name.toLowerCase().includes(q) || n.iso.toLowerCase().includes(q),
        )
      : NATIONS;
    return sortNations(filtered, sort);
  }, [sort, query]);

  const podium = list.slice(0, 3);
  const rest = list.slice(3);

  return (
    <div className="mx-auto max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] px-4 py-6 md:px-8 md:py-8 2xl:px-10">
      <div className="mb-8">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
          Governance
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Nations
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          Governance across the vavaworld
        </p>
      </div>

      <div className="mb-6 grid max-w-2xl grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            Sort By
          </label>
          <Select value={sort} onValueChange={(v) => setSort(v as NationSort)}>
            <SelectTrigger className={TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={CONTENT}>
              {(Object.keys(SORT_LABELS) as NationSort[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            Search
          </label>
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country..."
              className="h-11 w-full rounded-xl border border-white/40 bg-white/40 pl-9 pr-3 text-sm text-foreground outline-none backdrop-blur-md placeholder:text-foreground/40"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <RankingsSkeleton />
      ) : (
        <>
          {podium.length > 0 && (
            <div className="mb-4 flex flex-col gap-2.5">
              {podium[0] && (
                <NationPodiumCard nation={podium[0]} rank={1} variant="gold" />
              )}
              {(podium[1] || podium[2]) && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[3fr_2fr]">
                  {podium[1] && (
                    <NationPodiumCard nation={podium[1]} rank={2} variant="silver" />
                  )}
                  {podium[2] && (
                    <NationPodiumCard nation={podium[2]} rank={3} variant="bronze" />
                  )}
                </div>
              )}
            </div>
          )}

          <NationsTable rows={rest} startRank={4} total={list.length} />
        </>
      )}
    </div>
  );
}
