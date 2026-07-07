import { useCallback, useMemo } from "react";
import type { Mission, Player, Session } from "../types/index.ts";
import {
  fetchGmRoster,
  fetchJourney,
  fetchProgress,
  fetchSessionMeta,
} from "../store/queryFetchers.ts";
import { queryKeys } from "../store/queryKeys.ts";
import { useQueryClient } from "../store/useQueryClient.ts";
import { encodeQRPayload } from "../utils/qrPayload.ts";
import { buildValidationUrl } from "../utils/qrUrl.ts";
import { pickFirstIncompleteQrMission } from "../utils/qrMissionPick.ts";
import { useLiveQuery } from "./useLiveQuery.ts";
import { useQuery } from "./useQuery.ts";

export interface UseQrScanResult {
  readonly session: Session | null;
  readonly players: ReadonlyArray<Player>;
  readonly missions: ReadonlyArray<Mission>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  readonly buildSimulateScanUrl: () => Promise<string | null>;
}

export const useQrScan = (
  sessionId: string,
  playerId?: string,
): UseQrScanResult => {
  const client = useQueryClient();

  const sessionMeta = useQuery(
    sessionId ? queryKeys.sessionMeta(sessionId) : null,
    fetchSessionMeta(sessionId),
    { enabled: !!sessionId },
  );

  const gmRoster = useLiveQuery(
    sessionId ? queryKeys.gmRoster(sessionId) : null,
    fetchGmRoster(sessionId),
    { enabled: !!sessionId },
  );

  const resolvedPlayerId = playerId ?? gmRoster.data?.players[0]?.id ?? "";

  const journey = useLiveQuery(
    sessionId && resolvedPlayerId
      ? queryKeys.journey(sessionId, resolvedPlayerId)
      : null,
    fetchJourney(sessionId, resolvedPlayerId),
    { enabled: !!sessionId && !!resolvedPlayerId },
  );

  const progress = useLiveQuery(
    resolvedPlayerId ? queryKeys.progress(resolvedPlayerId) : null,
    fetchProgress(resolvedPlayerId),
    { enabled: !!resolvedPlayerId },
  );

  const session = sessionMeta.data ?? null;
  const players = useMemo(
    () => gmRoster.data?.players ?? [],
    [gmRoster.data?.players],
  );
  const missions = useMemo(
    () => journey.data?.missions ?? [],
    [journey.data?.missions],
  );

  const loading = sessionMeta.isInitialLoading || gmRoster.isInitialLoading ||
    (!!resolvedPlayerId &&
      (journey.isInitialLoading || progress.isInitialLoading));
  const error = sessionMeta.error ?? gmRoster.error ?? journey.error ??
    progress.error;

  const refresh = useCallback(() => {
    const keys: string[] = [
      queryKeys.sessionMeta(sessionId),
      queryKeys.gmRoster(sessionId),
    ];
    if (resolvedPlayerId) {
      keys.push(
        queryKeys.journey(sessionId, resolvedPlayerId),
        queryKeys.progress(resolvedPlayerId),
      );
    }
    client.invalidateQuery(keys);
  }, [client, resolvedPlayerId, sessionId]);

  const buildSimulateScanUrl = useCallback(async () => {
    const player = playerId
      ? players.find((p) => p.id === playerId) ?? players[0]
      : players[0];
    const mission = pickFirstIncompleteQrMission(
      missions,
      progress.data ?? [],
    );
    if (!player || !mission || !session) return null;

    const secret = session.qrSecret ?? sessionId;
    const encoded = await encodeQRPayload(
      {
        playerId: player.id,
        missionId: mission.id,
        sessionId,
        xpValue: mission.xpValue,
        issuedAt: Date.now(),
      },
      secret,
    );
    return buildValidationUrl(sessionId, encoded);
  }, [missions, playerId, players, progress.data, session, sessionId]);

  return useMemo(
    () => ({
      session,
      players,
      missions,
      loading,
      error,
      refresh,
      buildSimulateScanUrl,
    }),
    [
      buildSimulateScanUrl,
      error,
      loading,
      missions,
      players,
      refresh,
      session,
    ],
  );
};
