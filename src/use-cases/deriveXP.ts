import type { Mission } from "../types/index.ts";

// XP derivation algorithm from SPECS.md §XP Derivation.
// Pure function — no side effects, no adapter calls.
//
// Constraints:
//  - xpThreshold is always 100 per Milestone (C-04)
//  - xpValue per mission is derived at save time and stored in missions.xpValue
//  - Rounding remainder distributed to highest-difficulty missions first,
//    then mission.order as tiebreaker

const XP_THRESHOLD = 100;

const WEIGHT_MAP: Readonly<Record<number, number>> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};

export const deriveXP = (missions: ReadonlyArray<Mission>): ReadonlyArray<number> => {
  if (missions.length === 0) return [];

  const weights = missions.map((m) => WEIGHT_MAP[m.difficulty] ?? 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) return missions.map(() => 0);

  const xpValues = weights.map((w) => Math.floor((XP_THRESHOLD * w) / totalWeight));

  const remainder = XP_THRESHOLD - xpValues.reduce((sum, v) => sum + v, 0);

  // Sort indices by weight DESC, then mission.order ASC for tiebreaker
  const sortedIdx = missions
    .map((_, i) => i)
    .sort((a, b) => {
      const wa = weights[a] ?? 0;
      const wb = weights[b] ?? 0;
      if (wb !== wa) return wb - wa;
      const ma = missions[a];
      const mb = missions[b];
      return (ma?.order ?? 0) - (mb?.order ?? 0);
    });

  const result = [...xpValues];
  for (let i = 0; i < remainder; i++) {
    const idx = sortedIdx[i];
    if (idx !== undefined) {
      result[idx] = (result[idx] ?? 0) + 1;
    }
  }

  return result;
}
