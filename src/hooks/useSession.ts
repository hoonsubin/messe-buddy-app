import { useCallback, useEffect, useState } from "react";
import type { Milestone, Mission, Session } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";

export interface UseSessionResult {
  readonly session: Session | null;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly loading: boolean;
  readonly error: Error | null;
  /** Force a re-fetch of session data (e.g. after transient network failure). */
  readonly refresh: () => void;
}

// Fetches Session + Milestones + Missions for a session ID.
export const useSession = (sessionId: string): UseSessionResult => {
  const adapter = useAdapter();
  const [session, setSession] = useState<Session | null>(null);
  const [milestones, setMilestones] = useState<ReadonlyArray<Milestone>>([]);
  const [missions, setMissions] = useState<ReadonlyArray<Mission>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, ms, mi] = await Promise.all([
          adapter.getSession(sessionId),
          adapter.listMilestones(sessionId),
          adapter.listMissions(sessionId),
        ]);
        if (!cancelled) {
          setSession(s);
          setMilestones(ms);
          setMissions(mi);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (sessionId) {
      void fetch();
    }

    return () => {
      cancelled = true;
    };
  }, [adapter, sessionId, refreshKey]);

  return { session, milestones, missions, loading, error, refresh };
};
