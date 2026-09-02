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
  paidUsd: number;        // dollars - from the claim mirror (registry)
  tx: string | null;      // claim tx hash - the property grouping key
};
