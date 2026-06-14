import { Navigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";
import type { UserRole } from "../../types/index.ts";
import { useIdentity } from "../../hooks/useIdentity.ts";

interface RequireRoleProps {
  readonly role: UserRole;
  readonly children: ReactNode;
}

// Route guard: redirects to "/" if identity is absent, role mismatches,
// or the identity's sessionId differs from the URL param.
const RequireRole = (props: RequireRoleProps) => {
  const { identity } = useIdentity();
  const { sessionId } = useParams<{ sessionId: string }>();

  if (
    !identity ||
    identity.role !== props.role ||
    identity.sessionId !== sessionId
  ) {
    return <Navigate to="/" replace />;
  }

  return <>{props.children}</>;
};

export default RequireRole;
