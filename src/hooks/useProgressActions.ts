import { useCallback } from "react";
import type { ProgressEvent } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { mergeProgressEvent } from "../store/progressEvents.ts";
import { queryKeys } from "../store/queryKeys.ts";
import { useQueryClient } from "../store/useQueryClient.ts";

export const useProgressActions = (playerId: string) => {
  const adapter = useAdapter();
  const client = useQueryClient();
  const progressKey = playerId ? queryKeys.progress(playerId) : "";

  const patchEvent = useCallback(
    (event: ProgressEvent) => {
      if (!progressKey) return;
      client.patchQuery<ReadonlyArray<ProgressEvent>>(progressKey, (prev) =>
        mergeProgressEvent(prev, event)
      );
    },
    [client, progressKey],
  );

  const markPending = useCallback(
    async (missionId: string) => {
      const event = await adapter.upsertProgressEvent(playerId, missionId, {
        status: "pendingApproval",
      });
      patchEvent(event);
    },
    [adapter, patchEvent, playerId],
  );

  const markSelfComplete = useCallback(
    async (missionId: string) => {
      const event = await adapter.upsertProgressEvent(playerId, missionId, {
        status: "autoApproved",
      });
      patchEvent(event);
    },
    [adapter, patchEvent, playerId],
  );

  const markAutoApproved = useCallback(
    async (
      missionId: string,
      patch?: Partial<
        Pick<ProgressEvent, "formResponse" | "validatedBy" | "validatedAt">
      >,
    ) => {
      const event = await adapter.upsertProgressEvent(playerId, missionId, {
        status: "autoApproved",
        ...patch,
      });
      patchEvent(event);
      return event;
    },
    [adapter, patchEvent, playerId],
  );

  const refresh = useCallback(() => {
    if (progressKey) client.invalidateQuery(progressKey);
  }, [client, progressKey]);

  return {
    markPending,
    markSelfComplete,
    markAutoApproved,
    refresh,
    patchEvent,
  };
};
