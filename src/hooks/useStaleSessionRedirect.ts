import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearActiveUid, useIdentity } from "./useIdentity.ts";

/**
 * When a cached identity points at a deleted session, clear storage and
 * return to landing (7.7 follow-up). Pair with cached sessionMeta errors.
 */
export const useStaleSessionRedirect = (
  sessionMissing: boolean,
  identityUid: string | undefined,
): void => {
  const navigate = useNavigate();
  const { removeProfile } = useIdentity();

  useEffect(() => {
    if (!sessionMissing || !identityUid) return;
    removeProfile(identityUid);
    clearActiveUid();
    navigate("/", { replace: true });
  }, [identityUid, navigate, removeProfile, sessionMissing]);
};
