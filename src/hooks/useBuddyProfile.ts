import { useCallback, useEffect, useState } from "react";
import type { BuddyProfile } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";

const emptyBuddyDraft = (
  sessionId: string,
): Omit<BuddyProfile, "id" | "created" | "updated" | "assignedToPlayerId"> => ({
  sessionId,
  name: "",
  role: "",
  tenure: "",
  contactUrl: "",
});

export interface UseBuddyProfilePlayerResult {
  readonly role: "player";
  readonly buddy: BuddyProfile | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
}

export interface UseBuddyProfileAdminResult {
  readonly role: "gamemaker";
  readonly buddyDraft: Omit<
    BuddyProfile,
    "id" | "created" | "updated" | "assignedToPlayerId"
  >;
  readonly savedBuddy: BuddyProfile | null;
  readonly setBuddyDraft: (
    draft: Omit<
      BuddyProfile,
      "id" | "created" | "updated" | "assignedToPlayerId"
    >,
  ) => void;
  readonly upsertBuddy: () => Promise<void>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
}

type UseBuddyProfileOptions = {
  readonly role: "player" | "gamemaker";
};

export function useBuddyProfile(
  sessionId: string,
  playerId: string,
  options: { role: "player" },
): UseBuddyProfilePlayerResult;
export function useBuddyProfile(
  sessionId: string,
  playerId: string,
  options: { role: "gamemaker" },
): UseBuddyProfileAdminResult;
export function useBuddyProfile(
  sessionId: string,
  playerId: string,
  options: UseBuddyProfileOptions,
): UseBuddyProfilePlayerResult | UseBuddyProfileAdminResult {
  const adapter = useAdapter();
  const [buddy, setBuddy] = useState<BuddyProfile | null>(null);
  const [savedBuddy, setSavedBuddy] = useState<BuddyProfile | null>(null);
  const [buddyDraft, setBuddyDraft] = useState(() =>
    emptyBuddyDraft(sessionId)
  );
  const [loading, setLoading] = useState(!!playerId);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!playerId) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const profile = await adapter.getBuddyProfile(playerId);
        if (cancelled) return;
        if (options.role === "gamemaker") {
          setSavedBuddy(profile);
          if (profile) {
            setBuddyDraft({
              sessionId: profile.sessionId,
              name: profile.name,
              role: profile.role,
              tenure: profile.tenure ?? "",
              contactUrl: profile.contactUrl ?? "",
            });
          } else {
            setBuddyDraft(emptyBuddyDraft(sessionId));
          }
        } else {
          setBuddy(profile);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [adapter, options.role, playerId, sessionId, refreshKey]);

  const upsertBuddy = useCallback(async () => {
    if (!playerId) return;
    const profile = await adapter.upsertBuddyProfile(playerId, buddyDraft);
    setSavedBuddy(profile);
  }, [adapter, buddyDraft, playerId]);

  if (options.role === "gamemaker") {
    return {
      role: "gamemaker",
      buddyDraft,
      savedBuddy,
      setBuddyDraft,
      upsertBuddy,
      loading,
      error,
      refresh,
    };
  }

  return { role: "player", buddy, loading, error, refresh };
}
