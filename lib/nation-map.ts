import type { Nation } from './mock-nations';

/** Row shape returned by GET /api/nations. */
export type ApiNation = {
  iso: string;
  name: string;
  claims: number;
  holders: number;
  volumeUsd: number;
  floorUsd: number;
  topOwner: string | null;
  topOwnerUsername: string | null;
  topOwnerHexes: number;
};

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/**
 * Map a real indexer row into the Nation shape the nations UI renders.
 * Token-era fields (bonded, salaries, activity) are 0/empty until those
 * systems ship; the "president" slot shows the country's real top
 * holder - the throne candidate once presidents go live.
 */
export function apiToNation(r: ApiNation): Nation {
  const presidentName = r.topOwnerUsername ?? (r.topOwner ? shortAddr(r.topOwner) : '—');
  return {
    iso: r.iso.toUpperCase(),
    name: r.name,
    rankDelta: 0,
    floor: r.floorUsd,
    claims: r.claims,
    bondedVava: 0,
    bonders: r.holders,
    president: {
      username: presidentName,
      wallet: r.topOwner ?? '',
      bondedVava: 0,
      monthlyUsd: 0,
      earnedThisMonthUsd: 0,
      termDays: 0,
    },
    cabinet: [],
    userPosition: { rank: 0, of: r.holders, bondedVava: 0, monthlyUsd: 0, hexesHere: 0 },
    activity: [],
  };
}
