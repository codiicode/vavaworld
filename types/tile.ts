import type { Tier } from '@/lib/tier';

export type SelectedTile = {
  h3: string;
  lat: number;
  lng: number;
  tier: Tier;
};

export type ClaimedTile = {
  h3: string;
  owner: string;          // base58 pubkey
  tier: Tier;
  claimedAt: number;      // unix seconds
  pricePaid: bigint;
  bump: number;
};
