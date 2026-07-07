import { useMemo } from "react";
import type { CachedIdentity, UserRole } from "../types/index.ts";
import { readActiveUid, useIdentity } from "./useIdentity.ts";
import { resolveActiveProfile } from "./resolveActiveProfile.ts";

/** Resolves the stored profile for a route session (and optional role). */
export const useActiveProfile = (
  sessionId: string | undefined,
  role?: UserRole,
): CachedIdentity | null => {
  const { profiles } = useIdentity();

  return useMemo(() => {
    if (!sessionId) return null;
    return resolveActiveProfile(profiles, sessionId, role, readActiveUid());
  }, [profiles, sessionId, role]);
};
