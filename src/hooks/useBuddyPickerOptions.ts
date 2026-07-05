import { useCallback, useEffect, useState } from "react";
import { useAdapter } from "../adapters/useAdapter.ts";
import type { BuddyProfile } from "../types/index.ts";
import { listDistinctBuddyProfilesForPicker } from "../use-cases/createOnboardingJourney.ts";

export interface UseBuddyPickerOptionsResult {
  readonly options: ReadonlyArray<BuddyProfile>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
}

export const useBuddyPickerOptions = (
  sessionId: string,
  active: boolean,
): UseBuddyPickerOptionsResult => {
  const adapter = useAdapter();
  const [options, setOptions] = useState<ReadonlyArray<BuddyProfile>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!active || !sessionId) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const profiles = await listDistinctBuddyProfilesForPicker(
          sessionId,
          adapter,
        );
        if (!cancelled) setOptions(profiles);
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
  }, [adapter, sessionId, active, refreshKey]);

  return { options, loading, error, refresh };
};
