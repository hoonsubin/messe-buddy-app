import { useEffect } from "react";
import type { ProgressEvent } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { devBackendTrace } from "../store/devBackendTrace.ts";
import { mergeProgressEvent } from "../store/progressEvents.ts";
import { queryKeys } from "../store/queryKeys.ts";
import { useQueryClient } from "../store/useQueryClient.ts";

/** SSE subscription that patches the progress query cache (C-20). */
export const useWatchProgressMission = (
  playerId: string,
  missionId: string,
  onUpdate: (event: ProgressEvent) => void,
  enabled = true,
): void => {
  const adapter = useAdapter();
  const client = useQueryClient();

  useEffect(() => {
    if (!enabled || !playerId || !missionId) return;

    devBackendTrace.sseSubscribe(playerId, missionId);

    return adapter.subscribeProgressEvent(
      playerId,
      missionId,
      (event) => {
        const key = queryKeys.progress(playerId);
        client.patchQuery<ReadonlyArray<ProgressEvent>>(key, (prev) =>
          mergeProgressEvent(prev, event)
        );
        devBackendTrace.sseEvent(playerId, missionId);
        onUpdate(event);
      },
    );
  }, [adapter, client, enabled, missionId, onUpdate, playerId]);
};
