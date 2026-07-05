import { Navigate } from "react-router-dom";
import { readActiveUid } from "../hooks/useIdentity.ts";
import { USER_ROLE } from "../types/index.ts";
import type { CachedIdentity } from "../types/index.ts";
import LandingPage from "./LandingPage.tsx";

/**
 * "/" element — if the user has a last-active profile, redirect straight to
 * their dashboard instead of showing the profile picker (P-18).
 *
 * The read is synchronous (localStorage only) so there is never a picker
 * flash. If the pointer is stale (deleted session), the destination page's
 * own guard (useSessionExists / RequireRole) bounces back to "/" and clears
 * mb_active_uid so the picker appears on the second try with a P-17 badge.
 */
const RootRedirect = () => {
  const uid = readActiveUid();
  if (uid) {
    const profiles: CachedIdentity[] = (() => {
      try {
        const raw = localStorage.getItem("mb_identity");
        return raw ? (JSON.parse(raw) as CachedIdentity[]) : [];
      } catch {
        return [];
      }
    })();
    const match = profiles.find((p) => p.uid === uid);
    if (match) {
      const dest = match.role === USER_ROLE.PLAYER
        ? `/session/${match.sessionId}`
        : `/gamemaker/${match.sessionId}`;
      return <Navigate to={dest} replace />;
    }
  }
  return <LandingPage />;
};

export default RootRedirect;
