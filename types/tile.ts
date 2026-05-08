import type { Tier } from '@/lib/tier';

export type SelectedTile = {
  h3: string;
  lat: number;
  lng: number;
  tier: Tier;
};
