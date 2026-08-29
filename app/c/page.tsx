import type { Metadata } from 'next';
import { ClaimReveal, type ClaimShare } from '@/components/share/claim-reveal';

type SP = { [k: string]: string | string[] | undefined };

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function parse(sp: SP): ClaimShare {
  return {
    by: one(sp.by) || 'someone',
    place: one(sp.place) || 'the map',
    country: (one(sp.country) || '').toLowerCase(),
    lat: Number(one(sp.lat) ?? '0'),
    lon: Number(one(sp.lon) ?? '0'),
    n: Math.max(1, Number(one(sp.n) ?? '1')),
    sol: one(sp.sol) || null,
  };
}

export function generateMetadata({ searchParams }: { searchParams: SP }): Metadata {
  const c = parse(searchParams);
  const ogParams = new URLSearchParams({
    by: c.by,
    place: c.place,
    country: c.country,
    n: String(c.n),
  });
  if (c.sol) ogParams.set('sol', c.sol);
  const ogUrl = `/api/og/claim?${ogParams.toString()}`;
  const title = `${c.by.startsWith('@') ? c.by : '@' + c.by} claimed ${c.place} on VAVAWORLD`;
  const description = `${c.n.toLocaleString('en-US')} hex${c.n === 1 ? '' : 'es'} claimed${
    c.sol ? ` for ◎ ${c.sol} SOL` : ''
  }. Claim your own ground on the live world map.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default function ClaimSharePage({ searchParams }: { searchParams: SP }) {
  return <ClaimReveal claim={parse(searchParams)} />;
}
