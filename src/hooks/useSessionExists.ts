import { useEffect, useState } from "react";
import { useAdapter } from "../adapters/useAdapter.ts";

export interface UseSessionExistsResult {
  /** True until the existence check has resolved once. */
  readonly checking: boolean;
  /** True once resolved, if the session 404s against the backend. */
  readonly missing: boolean;
}

/**
 * Confirms a sessionId still resolves against the backend via a direct
 * getSession() call. This is deliberately separate from list-and-filter
 * hooks like useGmPlayers: a filtered list query returns zero rows for both
 * "session was deleted/reset" and "legitimately no data yet", which are
 * indistinguishable to the caller. A direct get 404s only in the first case,
 * so this is the only way to tell a stale/orphaned identity apart from a
 * genuinely new, empty account.
 */
export const useSessionExists = (
  sessionId: string,
): UseSessionExistsResult => {
  const adapter = useAdapter();
  const [checking, setChecking] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    adapter.getSession(sessionId)
      .then(() => {
        if (!cancelled) {
          setChecking(false);
          setMissing(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChecking(false);
          setMissing(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [adapter, sessionId]);

  return { checking, missing };
};
