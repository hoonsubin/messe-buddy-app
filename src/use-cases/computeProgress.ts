import type { Milestone, Mission, ProgressEvent } from "../types/index.ts";
import type { MilestoneProgress, PlayerProgress } from "../types/index.ts";
import { MILESTONE_STATUS, PROGRESS_STATUS } from "../types/index.ts";

// Derives PlayerProgress from ProgressEvents and Missions at read time.
// Pure function - no side effects, no adapter calls. (C-11)
//
// Player XP is read from mission.xpValue at validation time (C-11, OD-02).
//
// xpThreshold is now read from each Milestone record (not a global constant),
// allowing milestones to have different XP totals (e.g. 50, 15, 125, 85…).

const COMPLETED_STATUSES = new Set<string>([
  PROGRESS_STATUS.COMPLETED,
  PROGRESS_STATUS.AUTO_APPROVED,
]);

export const computeProgress = (
  playerId: string,
  missions: ReadonlyArray<Mission>,
  milestones: ReadonlyArray<Milestone>,
  progressEvents: ReadonlyArray<ProgressEvent>,
): PlayerProgress => {
  const eventByMission = new Map<string, ProgressEvent>();
  for (const e of progressEvents) {
    if (e.playerId === playerId) {
      eventByMission.set(e.missionId, e);
    }
  }

  const completedMissionIds: string[] = [];

  const milestoneProgress: MilestoneProgress[] = milestones.map((ms) => {
    const threshold = ms.xpThreshold > 0 ? ms.xpThreshold : 1;
    const msMissions = missions.filter((m) => m.milestoneId === ms.id);
    const completedIds: string[] = [];
    let earnedXP = 0;

    for (const mission of msMissions) {
      const event = eventByMission.get(mission.id);
      if (event && COMPLETED_STATUSES.has(event.status)) {
        earnedXP += mission.xpValue;
        completedIds.push(mission.id);
        completedMissionIds.push(mission.id);
      }
    }

    const percentComplete = earnedXP / threshold;
    const isComplete = earnedXP >= threshold;
    const hasStarted = completedIds.length > 0;

    const status = isComplete
      ? MILESTONE_STATUS.COMPLETED
      : hasStarted
      ? MILESTONE_STATUS.IN_PROGRESS
      : MILESTONE_STATUS.UPCOMING;

    return {
      milestoneId: ms.id,
      earnedXP,
      xpThreshold: threshold,
      percentComplete: Math.min(percentComplete, 1),
      status,
      completedMissionIds: completedIds,
    };
  });

  const totalXP = milestoneProgress.reduce((sum, mp) => sum + mp.earnedXP, 0);

  return {
    playerId,
    totalXP,
    milestoneProgress,
    completedMissionIds,
  };
};
