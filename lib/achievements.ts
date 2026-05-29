import type { MockUser } from './mock-users';

/**
 * Achievement system. Pure derivation from a user's stats so it works on mock
 * data today and on indexed on-chain data later. `icon` is a string key the
 * <Achievements> component maps to a lucide icon (keeps this file JSX-free).
 */
export type AchievementIcon =
  | 'crown' | 'flag' | 'globe' | 'hexagon' | 'coins' | 'sparkles' | 'medal';

export type Achievement = {
  id: string;
  label: string;
  description: string;
  icon: AchievementIcon;
  /** gold achievements get a warm accent (president, founder, top tiers). */
  gold?: boolean;
};

const FOUNDER_CUTOFF = '2025-10-01';

/** Highest earned tier in a family, plus standalone badges. Earned only. */
export function achievementsFor(u: MockUser): Achievement[] {
  const out: Achievement[] = [];

  if ((u.presidentOf?.length ?? 0) > 0) {
    const n = u.presidentOf!.length;
    out.push({
      id: 'president',
      label: n > 1 ? `President ×${n}` : 'Head of State',
      description: `Sitting president of ${u.presidentOf!.map((c) => c.toUpperCase()).join(', ')}`,
      icon: 'crown',
      gold: true,
    });
  }

  if (u.joined && u.joined < FOUNDER_CUTOFF) {
    out.push({
      id: 'founder',
      label: 'Founding Citizen',
      description: 'Claimed land in the earliest days of vavaworld',
      icon: 'sparkles',
      gold: true,
    });
  }

  // Territory (countries) - highest tier only
  if (u.countries >= 25) {
    out.push({ id: 'globetrotter', label: 'Globetrotter', description: 'Owns land in 25+ countries', icon: 'globe', gold: true });
  } else if (u.countries >= 10) {
    out.push({ id: 'explorer', label: 'Explorer', description: 'Owns land in 10+ countries', icon: 'globe' });
  } else if (u.countries >= 3) {
    out.push({ id: 'pioneer', label: 'Pioneer', description: 'Owns land in 3+ countries', icon: 'flag' });
  }

  // Holdings (hexes) - highest tier only
  if (u.hexes >= 2000) {
    out.push({ id: 'baron', label: 'Land Baron', description: 'Holds 2,000+ hexes', icon: 'hexagon', gold: true });
  } else if (u.hexes >= 1000) {
    out.push({ id: 'landlord', label: 'Landlord', description: 'Holds 1,000+ hexes', icon: 'hexagon' });
  } else if (u.hexes >= 100) {
    out.push({ id: 'settler', label: 'Settler', description: 'Holds 100+ hexes', icon: 'hexagon' });
  }

  // Bonding ($VAVA) - highest tier only
  if (u.bondedVava >= 2_000_000) {
    out.push({ id: 'whale', label: 'Whale', description: 'Bonded 2M+ $VAVA', icon: 'coins', gold: true });
  } else if (u.bondedVava >= 500_000) {
    out.push({ id: 'backer', label: 'Backer', description: 'Bonded 500K+ $VAVA', icon: 'coins' });
  }

  return out;
}
