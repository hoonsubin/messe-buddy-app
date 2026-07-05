import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProgressEvent } from "../../types/index.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { computeProgress } from "../../use-cases/computeProgress.ts";
import type {
  UseProgressGamemakerOptions,
  UseProgressGamemakerResult,
} from "./types.ts";

export const useProgressGamemaker = (
  options: Omit<UseProgressGamemakerOptions, "mode">,
): UseProgressGamemakerResult => {
  const { sid, milestones, missions, validatorUid } = options;
  const adapter = useAdapter();
  const [players, setPlayers] = useState<UseProgressGamemakerResult["players"]>(
    [],
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [allProgressEvents, setAllProgressEvents] = useState<
    ReadonlyArray<ProgressEvent>
  >([]);
  const [loading, setLoading] = useState(!!sid);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const isInitialPlayerLoad = useRef(true);
  const validatorUidRef = useRef(validatorUid);

  useEffect(() => {
    validatorUidRef.current = validatorUid;
  });

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!sid) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const listed = await adapter.listPlayers(sid);
        if (!cancelled) setPlayers(listed);
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
  }, [adapter, sid, refreshKey]);

  const handlePlayerSelect = useCallback((playerId: string) => {
    setSelectedPlayerId(playerId);
  }, []);

  useEffect(() => {
    if (!players.length) return;
    let cancelled = false;

    if (isInitialPlayerLoad.current) {
      handlePlayerSelect(players[0]!.id);
      isInitialPlayerLoad.current = false;
    }

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          players.map((p) => adapter.listProgressEvents(p.id)),
        );
        if (!cancelled) setAllProgressEvents(results.flat());
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      }
    };
    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [adapter, handlePlayerSelect, players, refreshKey]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? null;

  const selectedPlayerProgress = useMemo(() => {
    if (!selectedPlayer) return null;
    const playerEvents = allProgressEvents.filter(
      (e) => e.playerId === selectedPlayer.id,
    );
    return computeProgress(
      selectedPlayer.id,
      missions,
      milestones,
      playerEvents,
    );
  }, [selectedPlayer, allProgressEvents, missions, milestones]);

  const selectedPlayerEvents = selectedPlayer
    ? allProgressEvents.filter((e) => e.playerId === selectedPlayer.id)
    : [];

  const pendingEvents = allProgressEvents.filter(
    (e) => e.status === "pendingApproval",
  );

  const completeMission = useCallback(
    async (playerId: string, missionId: string) => {
      await adapter.upsertProgressEvent(playerId, missionId, {
        status: "completed",
        validatedBy: validatorUidRef.current ?? "gm",
        validatedAt: new Date().toISOString(),
      });
      const updated = await adapter.listProgressEvents(playerId);
      setAllProgressEvents((prev) => {
        const others = prev.filter((e) => e.playerId !== playerId);
        return [...others, ...updated];
      });
    },
    [adapter],
  );

  const handleApprove = completeMission;

  const handleReject = useCallback(
    async (playerId: string, missionId: string) => {
      await adapter.upsertProgressEvent(playerId, missionId, {
        status: "pending",
      });
      const updated = await adapter.listProgressEvents(playerId);
      setAllProgressEvents((prev) => {
        const others = prev.filter((e) => e.playerId !== playerId);
        return [...others, ...updated];
      });
    },
    [adapter],
  );

  return {
    mode: "gamemaker",
    players,
    selectedPlayerId,
    selectedPlayer,
    selectedPlayerProgress,
    selectedPlayerEvents,
    pendingEvents,
    loading,
    error,
    refresh,
    handlePlayerSelect,
    handleApprove,
    handleReject,
  };
};
