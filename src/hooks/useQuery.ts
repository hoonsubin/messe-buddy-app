import { useEffect, useRef, useState } from "react";
import type { AppAdapter } from "../adapters/interface.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import type { QueryState } from "../store/queryClient.ts";
import { useQueryClient } from "../store/useQueryClient.ts";

export interface UseQueryOptions {
  /** When false, no fetch is issued. Default true. */
  readonly enabled?: boolean;
}

const idleState = <T>(): QueryState<T> => ({
  data: undefined,
  error: null,
  isInitialLoading: false,
  isRefreshing: false,
});

/**
 * Subscribe to a cached query key. Fetcher runs through the query client
 * (coalesced + traced). Pass `null` key or `enabled: false` to skip — use
 * this to gate `journey:*` until `playerId` resolves.
 */
export const useQuery = <T>(
  key: string | null | undefined,
  fetcher: (adapter: AppAdapter) => Promise<T>,
  options?: UseQueryOptions,
): QueryState<T> => {
  const adapter = useAdapter();
  const client = useQueryClient();
  const enabled = (options?.enabled ?? true) && Boolean(key);
  const resolvedKey = enabled && key ? key : "";

  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const [, setTick] = useState(0);

  useEffect(() => {
    if (!resolvedKey) return;

    const run = () => {
      void client.fetchQuery(resolvedKey, () => fetcherRef.current(adapter));
    };

    run();
    return client.subscribe(resolvedKey, () => {
      setTick((t) => t + 1);
      run();
    });
  }, [adapter, client, resolvedKey]);

  if (!resolvedKey) return idleState<T>();

  return client.getQueryState<T>(resolvedKey);
};
