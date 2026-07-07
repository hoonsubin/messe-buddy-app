import { useMemo } from "react";
import type {
  Milestone,
  Mission,
  PlayerProgress,
  ProgressEvent,
} from "../types/index.ts";
import { computeProgress } from "../use-cases/computeProgress.ts";
import type { UseProgressPlayerResult } from "./progressTypes.ts";
import { useProgressActions } from "./useProgressActions.ts";

export const useDerivedPlayerProgress = (
  playerId: string,
  milestones: ReadonlyArray<Milestone>,
  missions: ReadonlyArray<Mission>,
  progressEvents: ReadonlyArray<ProgressEvent> | undefined,
  progressLoading: boolean,
  progressError: Error | null,
  refreshProgress: () => void,
): UseProgressPlayerResult => {
  const actions = useProgressActions(playerId);

  const playerProgress = useMemo<PlayerProgress | null>(() => {
    if (!playerId || milestones.length === 0 || missions.length === 0) {
      return null;
    }
    return computeProgress(
      playerId,
      missions,
      milestones,
      progressEvents ?? [],
    );
  }, [playerId, milestones, missions, progressEvents]);

  return useMemo(
    () => ({
      mode: "player" as const,
      playerProgress,
      progressEvents: progressEvents ?? [],
      loading: progressLoading,
      error: progressError,
      refresh: refreshProgress,
      markPending: actions.markPending,
      markSelfComplete: actions.markSelfComplete,
      markAutoApproved: async (
        missionId: string,
        patch?: Parameters<typeof actions.markAutoApproved>[1],
      ) => {
        await actions.markAutoApproved(missionId, patch);
      },
      watchMission: () => () => {},
    }),
    [
      actions.markAutoApproved,
      actions.markPending,
      actions.markSelfComplete,
      playerProgress,
      progressError,
      progressEvents,
      progressLoading,
      refreshProgress,
    ],
  );
};
