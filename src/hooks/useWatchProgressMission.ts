import { useEffect, useRef } from "react";
import type { ProgressEvent } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { devBackendTrace } from "../store/devBackendTrace.ts";
import {
  isProgressValidated,
  mergeProgressEvent,
} from "../store/progressEvents.ts";
import { pbEqFilter } from "../store/realtimeFilters.ts";
import { queryKeys } from "../store/queryKeys.ts";
import { useQueryClient } from "../store/useQueryClient.ts";

/** Re-export for components that gate on terminal progress statuses. */
export { isProgressValidated } from "../store/progressEvents.ts";

const POLL_MS = 1500;

/**
 * SSE subscription that patches the progress query cache (C-20).
 *
 * Polls progress while active as a fallback when cross-tab realtime is slow
 * or missed (Phase 6.5).
 */
export const useWatchProgressMission = (
  playerId: string,
  missionId: string,
  onUpdate: (event: ProgressEvent) => void,
  enabled = true,
  _sessionId?: string,
): void => {
  const adapter = useAdapter();
  const client = useQueryClient();
  const onUpdateRef = useRef(onUpdate);
  const validatedRef = useRef(false);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    if (!enabled || !playerId || !missionId) return;

    validatedRef.current = false;
    devBackendTrace.sseSubscribe(playerId, missionId);

    const progressKey = queryKeys.progress(playerId);

    const dispatchValidated = (event: ProgressEvent | undefined): void => {
      if (
        !event || validatedRef.current || !isProgressValidated(event.status)
      ) {
        return;
      }
      validatedRef.current = true;
      client.patchQuery<ReadonlyArray<ProgressEvent>>(
        progressKey,
        (prev) => mergeProgressEvent(prev, event),
      );
      devBackendTrace.sseEvent(playerId, missionId);
      onUpdateRef.current(event);
    };

    const handleEvent = (event: ProgressEvent): void => {
      if (event.playerId !== playerId || event.missionId !== missionId) return;
      dispatchValidated(event);
    };

    const unsub = adapter.subscribeCollection(
      "progress_events",
      pbEqFilter("playerId", playerId),
      (_action, record) => handleEvent(record as ProgressEvent),
    );

    const poll = setInterval(() => {
      void client
        .fetchQuery(progressKey, () => adapter.listProgressEvents(playerId))
        .then((events) => {
          dispatchValidated(events.find((e) => e.missionId === missionId));
        })
        .catch(() => {
          /* transient network — next poll retries */
        });
    }, POLL_MS);

    return () => {
      clearInterval(poll);
      unsub();
    };
  }, [adapter, client, enabled, missionId, playerId]);
};
