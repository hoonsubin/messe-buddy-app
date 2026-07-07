import { useEffect } from "react";
import { useAdapter } from "../adapters/useAdapter.ts";
import { devBackendTrace } from "../store/devBackendTrace.ts";
import {
  patchGmRosterFromPlayer,
  patchGmRosterFromProgressEvent,
} from "../store/gmRosterPatch.ts";
import { useQueryClient } from "../store/useQueryClient.ts";

/** PB realtime → `gmRoster` cache (Phase 6: claim + progress cross-tab sync). */
export const useGmRosterRealtime = (
  sessionId: string,
  enabled = true,
): void => {
  const adapter = useAdapter();
  const client = useQueryClient();

  useEffect(() => {
    if (!enabled || !sessionId) return;

    devBackendTrace.sseSubscribe(sessionId, "gmRoster:players");

    const unsubPlayers = adapter.subscribeSessionPlayers(
      sessionId,
      (player) => {
        devBackendTrace.sseEvent(sessionId, "players");
        patchGmRosterFromPlayer(client, sessionId, player);
      },
    );

    const unsubProgress = adapter.subscribeSessionProgressEvents(
      sessionId,
      (event) => {
        devBackendTrace.sseEvent(sessionId, event.missionId);
        void patchGmRosterFromProgressEvent(client, adapter, sessionId, event);
      },
    );

    return () => {
      unsubPlayers();
      unsubProgress();
    };
  }, [adapter, client, enabled, sessionId]);
};
