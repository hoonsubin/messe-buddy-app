import { useState, useCallback } from "react";
import type { LocalIdentity } from "../types/index.ts";

const IDENTITY_KEY = "mb_identity";

function readIdentity(): LocalIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalIdentity;
  } catch {
    return null;
  }
}

export interface UseIdentityResult {
  readonly identity: LocalIdentity | null;
  readonly setIdentity: (identity: LocalIdentity) => void;
  readonly clearIdentity: () => void;
  readonly refresh: () => void;
}

// Reads and writes mb_identity from localStorage.
// Components should call refresh() after externally writing identity
// (e.g. after joinSession or recoverIdentity use cases).
export function useIdentity(): UseIdentityResult {
  const [identity, setIdentityState] = useState<LocalIdentity | null>(
    readIdentity
  );

  const setIdentity = useCallback((newIdentity: LocalIdentity) => {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(newIdentity));
    setIdentityState(newIdentity);
  }, []);

  const clearIdentity = useCallback(() => {
    localStorage.removeItem(IDENTITY_KEY);
    setIdentityState(null);
  }, []);

  const refresh = useCallback(() => {
    setIdentityState(readIdentity());
  }, []);

  return { identity, setIdentity, clearIdentity, refresh };
}
