import { useCallback } from "react";
import type { ProgressEvent } from "../../types/index.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";

/** Subscribe to progress updates for a single mission (C-20). */
export const useWatchMission = (playerId: string) => {
  const adapter = useAdapter();

  const watchMission = useCallback(
    (missionId: string, onUpdate: (event: ProgressEvent) => void) => {
      return adapter.subscribeProgressEvent(
        playerId,
        missionId,
        onUpdate,
      );
    },
    [adapter, playerId],
  );

  return { watchMission };
};
