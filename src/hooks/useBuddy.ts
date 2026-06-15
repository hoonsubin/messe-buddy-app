import { useEffect, useState } from "react";
import type { BuddyProfile } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";

export interface UseBuddyResult {
  readonly buddy: BuddyProfile | null;
  readonly loading: boolean;
  readonly error: Error | null;
}

// Fetches BuddyProfile for a player.
export const useBuddy = (playerId: string): UseBuddyResult => {
  const adapter = useAdapter();
  const [buddy, setBuddy] = useState<BuddyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const profile = await adapter.getBuddyProfile(playerId);
        if (!cancelled) setBuddy(profile);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (playerId) {
      void fetch();
    }

    return () => {
      cancelled = true;
    };
  }, [adapter, playerId]);

  return { buddy, loading, error };
};
