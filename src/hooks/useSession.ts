import { useCallback, useEffect, useState } from "react";
import type { Milestone, Mission, PBRecord, Session } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";

export interface UseSessionBaseResult {
  readonly session: Session | null;
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
}

export interface UseSessionGamemakerResult extends UseSessionBaseResult {
  readonly updateSession: (
    patch: Partial<Omit<Session, keyof PBRecord>>,
  ) => Promise<Session>;
  readonly uploadBackground: (file: File) => Promise<{ displayUrl: string }>;
  readonly updateMapNodeScale: (scale: number) => Promise<void>;
}

type UseSessionOptions = {
  readonly role?: "player" | "gamemaker";
};

export function useSession(
  sessionId: string,
  options: { role: "gamemaker" },
): UseSessionGamemakerResult;
export function useSession(
  sessionId: string,
  options?: UseSessionOptions,
): UseSessionBaseResult;
export function useSession(
  sessionId: string,
  options?: UseSessionOptions,
): UseSessionBaseResult | UseSessionGamemakerResult {
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

  const updateSession = useCallback(
    async (patch: Partial<Omit<Session, keyof PBRecord>>) => {
      const updated = await adapter.updateSession(sessionId, patch);
      setSession(updated);
      return updated;
    },
    [adapter, sessionId],
  );

  const uploadBackground = useCallback(
    async (file: File) => {
      const displayUrl = URL.createObjectURL(file);
      await updateSession({ bgImageUrl: displayUrl });
      return { displayUrl };
    },
    [updateSession],
  );

  const updateMapNodeScale = useCallback(
    async (scale: number) => {
      await updateSession({ mapNodeScale: scale });
    },
    [updateSession],
  );

  const base: UseSessionBaseResult = {
    session,
    milestones,
    missions,
    loading,
    error,
    refresh,
  };

  if (options?.role === "gamemaker") {
    return { ...base, updateSession, uploadBackground, updateMapNodeScale };
  }

  return base;
}
