import type { Mission } from "../types/index.ts";

/** Sum of mission XP values in a milestone (C-04). */
export const computeMilestoneThreshold = (
  missions: ReadonlyArray<Mission>,
  milestoneId: string,
): number =>
  missions
    .filter((m) => m.milestoneId === milestoneId)
    .reduce((sum, m) => sum + m.xpValue, 0);
