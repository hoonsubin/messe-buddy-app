import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Milestone,
  Mission,
  Player,
  PlayerProgress,
  ProgressEvent,
} from "../types/index.ts";
import type { AppAdapter } from "../adapters/interface.ts";
import { computeProgress } from "../use-cases/computeProgress.ts";

interface UseAdminPlayersOptions {
  readonly sid: string;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly validatorUid: string | undefined;
  readonly adapter: AppAdapter;
}

interface UseAdminPlayersResult {
  readonly players: ReadonlyArray<Player>;
  readonly selectedPlayerId: string;
  readonly selectedPlayer: Player | null;
  readonly selectedPlayerProgress: PlayerProgress | null;
  readonly pendingEvents: ReadonlyArray<ProgressEvent>;
  readonly handlePlayerSelect: (playerId: string) => void;
  readonly handleApprove: (
    playerId: string,
    missionId: string,
  ) => Promise<void>;
  readonly handleReject: (playerId: string, missionId: string) => Promise<void>;
}

/**
 * Manages all player-related state for the admin cockpit:
 * - Player list, selection, progress
 * - Pending approvals (gmApprove path)
 * - Approve / reject handlers
 */
export const useAdminPlayers = ({
  sid,
  milestones,
  missions,
  validatorUid,
  adapter,
}: UseAdminPlayersOptions): UseAdminPlayersResult => {
  const [players, setPlayers] = useState<ReadonlyArray<Player>>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [allProgressEvents, setAllProgressEvents] = useState<
    ReadonlyArray<ProgressEvent>
  >([]);
  const isInitialPlayerLoad = useRef(true);
  const validatorUidRef = useRef(validatorUid);

  useEffect(() => {
    validatorUidRef.current = validatorUid;
  });

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

  useEffect(() => {
    if (!sid) return;
    void adapter.listPlayers(sid).then(setPlayers);
  }, [adapter, sid]);

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
      const results = await Promise.all(
        players.map((p) => adapter.listProgressEvents(p.id)),
      );
      if (!cancelled) setAllProgressEvents(results.flat());
    };
    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [adapter, handlePlayerSelect, players]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? null;

  const selectedPlayerProgress: PlayerProgress | null = useMemo(() => {
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

  const pendingEvents = allProgressEvents.filter(
    (e) => e.status === "pendingApproval",
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
    players,
    selectedPlayerId,
    selectedPlayer,
    selectedPlayerProgress,
    pendingEvents,
    handlePlayerSelect,
    handleApprove,
    handleReject,
  };
};
