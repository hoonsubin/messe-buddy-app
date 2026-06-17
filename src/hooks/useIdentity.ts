import { useCallback, useEffect, useState } from "react";
import type { LocalIdentity } from "../types/index.ts";

const IDENTITY_KEY = "mb_identity";

// ── Storage helpers ───────────────────────────────────────────────────────────

const readProfiles = (): LocalIdentity[] => {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Migrate legacy single-object format to array
    if (Array.isArray(parsed)) return parsed as LocalIdentity[];
    if (parsed && typeof parsed === "object") return [parsed as LocalIdentity];
    return [];
  } catch {
    return [];
  }
};

const writeProfiles = (profiles: LocalIdentity[]): void => {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(profiles));
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseIdentityResult {
  /** All locally stored profiles. */
  readonly profiles: ReadonlyArray<LocalIdentity>;
  /** Upsert a profile by uid. Adds if new, replaces if uid already exists. */
  readonly setIdentity: (identity: LocalIdentity) => void;
  /** Remove a single profile by uid. No-op if not found. */
  readonly removeProfile: (uid: string) => void;
  /** Wipe all profiles from storage. Use only for full device reset. */
  readonly clearIdentity: () => void;
  /** Force re-read from localStorage (useful after external writes). */
  readonly refresh: () => void;
}

export const useIdentity = (): UseIdentityResult => {
  const [profiles, setProfiles] = useState<LocalIdentity[]>(readProfiles);

  // Cross-tab sync: another tab wrote mb_identity
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === IDENTITY_KEY) setProfiles(readProfiles());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setIdentity = useCallback((identity: LocalIdentity) => {
    setProfiles((prev) => {
      const next = prev.some((p) => p.uid === identity.uid)
        ? prev.map((p) => (p.uid === identity.uid ? identity : p))
        : [...prev, identity];
      writeProfiles(next);
      return next;
    });
  }, []);

  const removeProfile = useCallback((uid: string) => {
    setProfiles((prev) => {
      const next = prev.filter((p) => p.uid !== uid);
      writeProfiles(next);
      return next;
    });
  }, []);

  const clearIdentity = useCallback(() => {
    localStorage.removeItem(IDENTITY_KEY);
    setProfiles([]);
  }, []);

  const refresh = useCallback(() => {
    setProfiles(readProfiles());
  }, []);

  return { profiles, setIdentity, removeProfile, clearIdentity, refresh };
};
