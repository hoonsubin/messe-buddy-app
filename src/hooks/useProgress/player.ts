import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProgressEvent } from "../../types/index.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { computeProgress } from "../../use-cases/computeProgress.ts";
import type {
  UseProgressPlayerOptions,
  UseProgressPlayerResult,
} from "./types.ts";

export const useProgressPlayer = (
  options: Omit<UseProgressPlayerOptions, "mode">,
): UseProgressPlayerResult => {
  const { playerId, milestones, missions } = options;
  const adapter = useAdapter();
  const [progressEvents, setProgressEvents] = useState<
    ReadonlyArray<ProgressEvent>
  >([]);
  const [loading, setLoading] = useState(!!playerId);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!playerId) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const events = await adapter.listProgressEvents(playerId);
        if (!cancelled) setProgressEvents(events);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [adapter, playerId, refreshKey]);

  const playerProgress = useMemo(() => {
    if (!playerId || milestones.length === 0 || missions.length === 0) {
      return null;
    }
    return computeProgress(playerId, missions, milestones, progressEvents);
  }, [playerId, milestones, missions, progressEvents]);

  const applyEvent = useCallback((event: ProgressEvent) => {
    setProgressEvents((prev) => {
      const next = prev.filter(
        (e) =>
          !(e.playerId === event.playerId && e.missionId === event.missionId),
      );
      return [...next, event];
    });
  }, []);

  const markPending = useCallback(
    async (missionId: string) => {
      const event = await adapter.upsertProgressEvent(playerId, missionId, {
        status: "pendingApproval",
      });
      applyEvent(event);
    },
    [adapter, applyEvent, playerId],
  );

  const markSelfComplete = useCallback(
    async (missionId: string) => {
      const event = await adapter.upsertProgressEvent(playerId, missionId, {
        status: "autoApproved",
      });
      applyEvent(event);
    },
    [adapter, applyEvent, playerId],
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
      applyEvent(event);
    },
    [adapter, applyEvent, playerId],
  );

  const watchMission = useCallback(
    (missionId: string, onUpdate: (event: ProgressEvent) => void) => {
      return adapter.subscribeProgressEvent(
        playerId,
        missionId,
        (event) => {
          applyEvent(event);
          onUpdate(event);
        },
      );
    },
    [adapter, applyEvent, playerId],
  );

  return {
    mode: "player",
    playerProgress,
    progressEvents,
    loading,
    error,
    refresh,
    markPending,
    markSelfComplete,
    markAutoApproved,
    watchMission,
  };
};
