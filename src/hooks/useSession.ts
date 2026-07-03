import { useCallback, useEffect, useState } from "react";
import { ClientResponseError } from "pocketbase";
import type { Milestone, Mission, PBRecord, Session } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";

// A cancelled/aborted request (PocketBase auto-cancellation, or a plain
// fetch AbortError) is not evidence the session failed to load — it means
// some other in-flight request pre-empted this one. Treating it as a real
// error trips the "session not found, bounce to Admin Home" effect in
// useHireDetailPage.ts on a request that was never actually resolved either
// way. See plans/production-integration-audit-2026-07-01.md §1.1.
const isAbortError = (e: unknown): boolean => {
  if (e instanceof ClientResponseError && e.isAbort) return true;
  if (e instanceof DOMException && e.name === "AbortError") return true;
  return false;
};

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
    patch: Partial<Omit<Session, keyof PBRecord | "bgImageUrl">> & {
      readonly bgImageUrl?: string | File;
    },
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
        // A cancelled request isn't a real failure — some other in-flight
        // call pre-empted it. Don't surface it as a session error (that
        // would bounce the user out via useHireDetailPage's error effect)
        // and don't clear already-loaded data; just stop quietly.
        if (!cancelled && !isAbortError(e)) {
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
    async (
      patch: Partial<Omit<Session, keyof PBRecord | "bgImageUrl">> & {
        readonly bgImageUrl?: string | File;
      },
    ) => {
      const updated = await adapter.updateSession(sessionId, patch);
      setSession(updated);
      return updated;
    },
    [adapter, sessionId],
  );

  const uploadBackground = useCallback(
    async (file: File) => {
      const updated = await updateSession({ bgImageUrl: file });
      return { displayUrl: updated.bgImageUrl };
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
