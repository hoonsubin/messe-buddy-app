import { useCallback, useEffect, useState } from "react";
import type { Mission, Player, Session } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { encodeQRPayload } from "../utils/qrPayload.ts";
import { buildValidationUrl } from "../utils/qrUrl.ts";

export interface UseQRScanContextResult {
  readonly session: Session | null;
  readonly players: ReadonlyArray<Player>;
  readonly missions: ReadonlyArray<Mission>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  readonly buildSimulateScanUrl: () => Promise<string | null>;
}

export const useQRScanContext = (
  sessionId: string,
): UseQRScanContextResult => {
  const adapter = useAdapter();
  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<ReadonlyArray<Player>>([]);
  const [missions, setMissions] = useState<ReadonlyArray<Mission>>([]);
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, p, m] = await Promise.all([
          adapter.getSession(sessionId),
          adapter.listPlayers(sessionId),
          adapter.listMissions(sessionId),
        ]);
        if (!cancelled) {
          setSession(s);
          setPlayers(p);
          setMissions(m);
        }
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
  }, [adapter, sessionId, refreshKey]);

  const buildSimulateScanUrl = useCallback(async () => {
    const player = players[0];
    const mission = missions.find((m) => m.validationMethod === "qr");
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
  }, [missions, players, session, sessionId]);

  return {
    session,
    players,
    missions,
    loading,
    error,
    refresh,
    buildSimulateScanUrl,
  };
};
