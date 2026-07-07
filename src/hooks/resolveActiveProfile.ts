import type { CachedIdentity, UserRole } from "../types/index.ts";

/**
 * Picks the cached profile for a route session (and optional role).
 * When several profiles share the same session + role, prefers `mb_active_uid`
 * (SPECS: last-active profile on boot / after join).
 */
export const resolveActiveProfile = (
  profiles: ReadonlyArray<CachedIdentity>,
  sessionId: string,
  role?: UserRole,
  activeUid?: string | null,
): CachedIdentity | null => {
  const matches = profiles.filter((p) => {
    if (p.sessionId !== sessionId) return false;
    if (role !== undefined && p.role !== role) return false;
    return true;
  });
  if (matches.length === 0) return null;
  if (activeUid) {
    const active = matches.find((p) => p.uid === activeUid);
    if (active) return active;
  }
  return matches[0] ?? null;
};
