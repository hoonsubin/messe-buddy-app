import { useMemo } from "react";
import type { CachedIdentity, UserRole } from "../types/index.ts";
import { useIdentity } from "./useIdentity.ts";

/** Resolves the stored profile for a route session (and optional role). */
export const useActiveProfile = (
  sessionId: string | undefined,
  role?: UserRole,
): CachedIdentity | null => {
  const { profiles } = useIdentity();

  return useMemo(() => {
    if (!sessionId) return null;
    if (role !== undefined) {
      return profiles.find(
        (p) => p.sessionId === sessionId && p.role === role,
      ) ?? null;
    }
    return profiles.find((p) => p.sessionId === sessionId) ?? null;
  }, [profiles, sessionId, role]);
};
