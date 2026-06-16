import { useCallback, useEffect, useState } from "react";
import type { LocalIdentity } from "../types/index.ts";
import {
  clearEphemeralIdentity,
  readEphemeralIdentity,
} from "./ephemeralIdentityStore.ts";

const IDENTITY_KEY = "mb_identity";

const readIdentity = (): LocalIdentity | null => {
  const ephemeral = readEphemeralIdentity();
  if (ephemeral) return ephemeral;
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalIdentity;
  } catch {
    return null;
  }
};

export interface UseIdentityResult {
  readonly identity: LocalIdentity | null;
  readonly setIdentity: (identity: LocalIdentity) => void;
  readonly clearIdentity: () => void;
  readonly refresh: () => void;
}

// Reads and writes mb_identity from localStorage.
// Components should call refresh() after externally writing identity
// (e.g. after joinSession or recoverIdentity use cases).
export const useIdentity = (): UseIdentityResult => {
  const [identity, setIdentityState] = useState<LocalIdentity | null>(
    readIdentity,
  );

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === IDENTITY_KEY) setIdentityState(readIdentity());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setIdentity = useCallback((newIdentity: LocalIdentity) => {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(newIdentity));
    setIdentityState(newIdentity);
  }, []);

  const clearIdentity = useCallback(() => {
    localStorage.removeItem(IDENTITY_KEY);
    clearEphemeralIdentity();
    setIdentityState(null);
  }, []);

  const refresh = useCallback(() => {
    setIdentityState(readIdentity());
  }, []);

  return { identity, setIdentity, clearIdentity, refresh };
};
