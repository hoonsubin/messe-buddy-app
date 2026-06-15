import type { Mission } from "../types/index.ts";
import type { PlayerProgress } from "../types/index.ts";
import { MILESTONE_STATUS } from "../types/index.ts";

// Derives the player's "missions for today": all missions belonging to
// milestones that are currently `inProgress`, excluding already-completed ones.
// Pure function — no side effects, no adapter calls. (Phase 0c)
//
// The result is sorted by mission.order so it can be rendered directly in
// DailyPlanView as the primary orientation surface for new hires.

export const getDailyMissions = (
  playerProgress: PlayerProgress,
  missions: ReadonlyArray<Mission>,
): ReadonlyArray<Mission> => {
  // Build a lookup of completed mission IDs for O(1) checks.
  const completedSet = new Set(playerProgress.completedMissionIds);

  // Collect milestone IDs that are currently in progress.
  const inProgressMilestoneIds = new Set<string>(
    playerProgress.milestoneProgress
      .filter((mp) => mp.status === MILESTONE_STATUS.IN_PROGRESS)
      .map((mp) => mp.milestoneId),
  );

  // Filter missions: belong to an in-progress milestone AND not yet completed.
  const result = missions.filter(
    (m) =>
      inProgressMilestoneIds.has(m.milestoneId) &&
      !completedSet.has(m.id),
  );

  // Sort by mission.order ascending.
  return [...result].sort((a, b) => a.order - b.order);
};
