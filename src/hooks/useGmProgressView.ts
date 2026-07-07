import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Milestone,
  Mission,
  Player,
  ProgressEvent,
} from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { computeProgress } from "../use-cases/computeProgress.ts";
import { fetchGmRoster } from "../store/queryFetchers.ts";
import { mergeProgressEvent } from "../store/progressEvents.ts";
import { queryKeys } from "../store/queryKeys.ts";
import { useQueryClient } from "../store/useQueryClient.ts";
import { useLiveQuery } from "./useLiveQuery.ts";
import type { UseProgressGamemakerResult } from "./progressTypes.ts";

export const useGmProgressView = (
  homeSid: string,
  routePlayerId: string,
  milestones: ReadonlyArray<Milestone>,
  missions: ReadonlyArray<Mission>,
  validatorUid?: string,
): UseProgressGamemakerResult => {
  const adapter = useAdapter();
  const client = useQueryClient();
  const validatorUidRef = useRef(validatorUid);

  useEffect(() => {
    validatorUidRef.current = validatorUid;
  });

  const gmRoster = useLiveQuery(
    homeSid ? queryKeys.gmRoster(homeSid) : null,
    fetchGmRoster(homeSid),
    { enabled: !!homeSid },
  );

  const [selectedPlayerId, setSelectedPlayerId] = useState(routePlayerId);
  const [prevRoutePlayerId, setPrevRoutePlayerId] = useState(routePlayerId);
  if (routePlayerId && routePlayerId !== prevRoutePlayerId) {
    setPrevRoutePlayerId(routePlayerId);
    setSelectedPlayerId(routePlayerId);
  }

  const players = gmRoster.data?.players ?? [];
  const allProgressEvents = useMemo(
    () => gmRoster.data?.allProgressEvents ?? [],
    [gmRoster.data?.allProgressEvents],
  );

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? null;

  const selectedPlayerEvents = useMemo(
    () =>
      selectedPlayer
        ? allProgressEvents.filter((e) => e.playerId === selectedPlayer.id)
        : [],
    [allProgressEvents, selectedPlayer],
  );

  const selectedPlayerProgress = useMemo(() => {
    if (!selectedPlayer) return null;
    return computeProgress(
      selectedPlayer.id,
      missions,
      milestones,
      selectedPlayerEvents,
    );
  }, [selectedPlayer, missions, milestones, selectedPlayerEvents]);

  const pendingEvents = allProgressEvents.filter(
    (e) => e.status === "pendingApproval",
  );

  const refresh = useCallback(() => {
    if (homeSid) client.invalidateQuery(queryKeys.gmRoster(homeSid));
  }, [client, homeSid]);

  const patchPlayerEvents = useCallback(
    (playerId: string, events: ReadonlyArray<ProgressEvent>) => {
      client.patchQuery<typeof gmRoster.data>(
        queryKeys.gmRoster(homeSid),
        (old) => {
          if (!old) return old as never;
          const others = old.allProgressEvents.filter((e) =>
            e.playerId !== playerId
          );
          return {
            ...old,
            allProgressEvents: [...others, ...events],
          };
        },
      );
      client.patchQuery(queryKeys.progress(playerId), () => events);
    },
    [client, gmRoster, homeSid],
  );

  const completeMission = useCallback(
    async (playerId: string, missionId: string) => {
      await adapter.upsertProgressEvent(playerId, missionId, {
        status: "completed",
        validatedBy: validatorUidRef.current ?? "gm",
        validatedAt: new Date().toISOString(),
      });
      const updated = await adapter.listProgressEvents(playerId);
      patchPlayerEvents(playerId, updated);
    },
    [adapter, patchPlayerEvents],
  );

  const handleReject = useCallback(
    async (playerId: string, missionId: string) => {
      const event = await adapter.upsertProgressEvent(playerId, missionId, {
        status: "pending",
      });
      client.patchQuery<ReadonlyArray<ProgressEvent>>(
        queryKeys.progress(playerId),
        (prev) => mergeProgressEvent(prev, event),
      );
      refresh();
    },
    [adapter, client, refresh],
  );

  const handlePlayerSelect = useCallback((id: string) => {
    setSelectedPlayerId(id);
  }, []);

  return {
    mode: "gamemaker",
    players: players as ReadonlyArray<Player>,
    selectedPlayerId,
    selectedPlayer,
    selectedPlayerProgress,
    selectedPlayerEvents,
    pendingEvents,
    loading: gmRoster.isInitialLoading,
    error: gmRoster.error,
    refresh,
    handlePlayerSelect,
    handleApprove: completeMission,
    handleReject,
  };
};
