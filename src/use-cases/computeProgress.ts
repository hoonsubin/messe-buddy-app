import type { Mission, ProgressEvent, Milestone } from "../types/index.ts";
import type { PlayerProgress, MilestoneProgress } from "../types/index.ts";
import { MILESTONE_STATUS, PROGRESS_STATUS } from "../types/index.ts";

// Derives PlayerProgress from ProgressEvents and Missions at read time.
// Pure function — no side effects, no adapter calls. (C-11)
//
// Retroactive difficulty changes affect earned XP because we re-derive here
// rather than snapshotting xpValue at validation time (OD-02 resolution).

const XP_THRESHOLD = 100; // C-04: always 100 per Milestone

const COMPLETED_STATUSES = new Set<string>([
  PROGRESS_STATUS.COMPLETED,
  PROGRESS_STATUS.AUTO_APPROVED,
]);

export const computeProgress = (
  playerId: string,
  missions: ReadonlyArray<Mission>,
  milestones: ReadonlyArray<Milestone>,
  progressEvents: ReadonlyArray<ProgressEvent>
): PlayerProgress => {
  const eventByMission = new Map<string, ProgressEvent>();
  for (const e of progressEvents) {
    if (e.playerId === playerId) {
      eventByMission.set(e.missionId, e);
    }
  }

  const completedMissionIds: string[] = [];

  const milestoneProgress: MilestoneProgress[] = milestones.map((ms) => {
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

    const percentComplete = XP_THRESHOLD > 0 ? earnedXP / XP_THRESHOLD : 0;
    const isComplete = earnedXP >= XP_THRESHOLD;
    const hasStarted = completedIds.length > 0;

    const status = isComplete
      ? MILESTONE_STATUS.COMPLETED
      : hasStarted
        ? MILESTONE_STATUS.IN_PROGRESS
        : MILESTONE_STATUS.UPCOMING;

    return {
      milestoneId: ms.id,
      earnedXP,
      xpThreshold: XP_THRESHOLD,
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
}
