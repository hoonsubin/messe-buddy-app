import { Navigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import type { UserRole } from "../../types/index.ts";
import { useIdentity } from "../../hooks/useIdentity.ts";

interface RequireRoleProps {
  readonly role: UserRole;
  readonly children: ReactNode;
}

// Route guard: redirects to "/" if no stored profile matches both the URL
// sessionId and the required role.
const RequireRole = (props: RequireRoleProps) => {
  const { profiles } = useIdentity();
  const { sessionId } = useParams<{ sessionId: string }>();

  const identity = profiles.find(
    (p) => p.sessionId === sessionId && p.role === props.role,
  );

  if (!identity) {
    return <Navigate to="/" replace />;
  }

  return <>{props.children}</>;
};

export default RequireRole;
