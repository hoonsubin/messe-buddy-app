import { useCallback, useEffect, useState } from "react";
import { useAdapter } from "../../adapters/useAdapter.ts";
import { computeProgress } from "../../use-cases/computeProgress.ts";

/** One new hire = one onboarding session owned by the Game Maker. */
export interface GmHireRow {
  readonly sessionId: string;
  readonly sessionName: string;
  readonly playerId: string | null;
  readonly name: string;
  readonly joined: boolean;
  readonly progressPercent: number;
  readonly daysSinceLastActivity: number | null;
  readonly isStalled: boolean;
}

export interface UseGmHiresResult {
  readonly hires: ReadonlyArray<GmHireRow>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  /** Create a new hire (a session owned by this GM). Returns the new sessionId. */
  readonly createHire: (name: string) => Promise<string>;
}

const STALL_DAYS = 3;

/**
 * Lists the Game Maker's hires — one row per session they own — with the
 * primary player's name and progress. Sessions with no player yet show as
 * "not joined". Refresh after creating a hire.
 */
export const useGmHires = (
  gmUid: string | undefined,
  active: boolean,
): UseGmHiresResult => {
  const adapter = useAdapter();
  const [hires, setHires] = useState<ReadonlyArray<GmHireRow>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const createHire = useCallback(
    async (name: string): Promise<string> => {
      if (!gmUid) throw new Error("No Game Maker identity");
      const session = await adapter.createSession(name, gmUid);
      setRefreshKey((k) => k + 1);
      return session.id;
    },
    [adapter, gmUid],
  );

  useEffect(() => {
    if (!active || !gmUid) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const sessions = await adapter.listSessions();
        const owned = sessions.filter((s) => s.gameMakerId === gmUid);

        const rows = await Promise.all(owned.map(async (s): Promise<GmHireRow> => {
          const [players, milestones, missions] = await Promise.all([
            adapter.listPlayers(s.id),
            adapter.listMilestones(s.id),
            adapter.listMissions(s.id),
          ]);
          const player = players[0] ?? null;

          if (!player) {
            return {
              sessionId: s.id,
              sessionName: s.name,
              playerId: null,
              name: s.name,
              joined: false,
              progressPercent: 0,
              daysSinceLastActivity: null,
              isStalled: false,
            };
          }

          const events = await adapter.listProgressEvents(player.id);
          const progress = computeProgress(
            player.id,
            missions,
            milestones,
            events,
          );
          const { milestoneProgress } = progress;
          const progressPercent = milestoneProgress.length === 0
            ? 0
            : Math.round(
              (milestoneProgress.reduce((sum, mp) => sum + mp.percentComplete, 0)
                / milestoneProgress.length) * 100,
            );
          const lastMs = events.length > 0
            ? Math.max(...events.map((e) => new Date(e.updated).getTime()))
            : null;
          const days = lastMs !== null
            ? Math.floor((Date.now() - lastMs) / (1000 * 60 * 60 * 24))
            : null;

          return {
            sessionId: s.id,
            sessionName: s.name,
            playerId: player.id,
            name: player.name || s.name,
            joined: true,
            progressPercent,
            daysSinceLastActivity: days,
            isStalled: days !== null && days > STALL_DAYS,
          };
        }));

        if (!cancelled) setHires(rows);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [adapter, gmUid, active, refreshKey]);

  return { hires, loading, error, refresh, createHire };
};
