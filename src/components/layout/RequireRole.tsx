import { Navigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import type { UserRole } from "../../types/index.ts";
import { useActiveProfile } from "../../hooks/useActiveProfile.ts";
import { clearActiveUid } from "../../hooks/useIdentity.ts";

interface RequireRoleProps {
  readonly role: UserRole;
  readonly children: ReactNode;
}

// Route guard: redirects to "/" if no stored profile matches both the URL
// sessionId and the required role. Clears the active-uid pointer so the
// RootRedirect at "/" shows the picker instead of looping back here (P-18).
const RequireRole = (props: RequireRoleProps) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const identity = useActiveProfile(sessionId, props.role);

  if (!identity) {
    clearActiveUid();
    return <Navigate to="/" replace />;
  }

  return <>{props.children}</>;
};

export default RequireRole;
