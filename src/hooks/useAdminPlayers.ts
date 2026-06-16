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

interface QRScannerContext {
  readonly playerId: string;
  readonly missionId: string;
  readonly playerName: string;
  readonly missionTitle: string;
}

interface UseAdminPlayersResult {
  readonly players: ReadonlyArray<Player>;
  readonly selectedPlayerId: string;
  readonly selectedPlayer: Player | null;
  readonly selectedPlayerProgress: PlayerProgress | null;
  readonly pendingEvents: ReadonlyArray<ProgressEvent>;
  readonly qrScannerContext: QRScannerContext | null;
  readonly handlePlayerSelect: (playerId: string) => void;
  readonly handleApprove: (
    playerId: string,
    missionId: string,
  ) => Promise<void>;
  readonly handleReject: (playerId: string, missionId: string) => Promise<void>;
  readonly handleScanQR: (playerId: string, missionId: string) => void;
  readonly handleQRValidate: (
    playerId: string,
    missionId: string,
  ) => Promise<void>;
  readonly closeQRScanner: () => void;
}

/**
 * Manages all player-related state for the admin cockpit:
 * - Player list, selection, progress
 * - Pending approvals
 * - Approve / reject / QR-validate  (approve and QR-validate share the same
 *   implementation - both complete a mission with a GM validator stamp)
 * - QR scanner modal context
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
  const [qrScannerContext, setQrScannerContext] = useState<
    QRScannerContext | null
  >(null);
  const isInitialPlayerLoad = useRef(true);

  // ── Shared complete-mission implementation ─────────────────────────────────
  const completeMission = useCallback(
    async (playerId: string, missionId: string) => {
      await adapter.upsertProgressEvent(playerId, missionId, {
        status: "completed",
        validatedBy: validatorUid ?? "gm",
        validatedAt: new Date().toISOString(),
      });
      const updated = await adapter.listProgressEvents(playerId);
      setAllProgressEvents((prev) => {
        const others = prev.filter((e) => e.playerId !== playerId);
        return [...others, ...updated];
      });
    },
    [adapter, validatorUid],
  );

  // ── Load players ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sid) return;
    void adapter.listPlayers(sid).then(setPlayers);
  }, [adapter, sid]);

  // ── Player select (exposed so BuddyAssignmentForm can trigger it too) ───────
  const handlePlayerSelect = useCallback((playerId: string) => {
    setSelectedPlayerId(playerId);
  }, []);

  // ── Fetch progress for all players; auto-select first on initial load ───────
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

  // ── Derived values ──────────────────────────────────────────────────────────
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

  // ── Action handlers ─────────────────────────────────────────────────────────
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

  const handleScanQR = useCallback(
    (playerId: string, missionId: string) => {
      const player = players.find((p) => p.id === playerId);
      const mission = missions.find((m) => m.id === missionId);
      setQrScannerContext({
        playerId,
        missionId,
        playerName: player?.name ?? player?.uid ?? playerId,
        missionTitle: mission?.title ?? missionId,
      });
    },
    [players, missions],
  );

  const handleQRValidate = completeMission;

  const closeQRScanner = useCallback(() => setQrScannerContext(null), []);

  return {
    players,
    selectedPlayerId,
    selectedPlayer,
    selectedPlayerProgress,
    pendingEvents,
    qrScannerContext,
    handlePlayerSelect,
    handleApprove,
    handleReject,
    handleScanQR,
    handleQRValidate,
    closeQRScanner,
  };
};
