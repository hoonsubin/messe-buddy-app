import { useEffect, useState } from "react";
import type { Resource } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";

export interface UseResourcesResult {
  readonly resources: ReadonlyArray<Resource>;
  readonly loading: boolean;
  readonly error: Error | null;
}

// Fetches resources for a session, filters to visible-to-player only.
export const useResources = (sessionId: string): UseResourcesResult => {
  const adapter = useAdapter();
  const [resources, setResources] = useState<ReadonlyArray<Resource>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await adapter.listResources(sessionId);
        if (!cancelled) {
          setResources(all.filter((r) => r.isVisibleToPlayer));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (sessionId) {
      void fetch();
    }

    return () => {
      cancelled = true;
    };
  }, [adapter, sessionId]);

  return { resources, loading, error };
};
