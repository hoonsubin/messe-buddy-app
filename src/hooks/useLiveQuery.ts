import { useEffect, useRef, useState } from "react";
import type { AppAdapter } from "../adapters/interface.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import type { QueryState } from "../store/queryClient.ts";
import { resolveRealtimeDeps } from "../store/realtimeDeps.ts";
import { subscriptionBookkeeper } from "../store/subscriptionBookkeeper.ts";
import { useQueryClient } from "../store/useQueryClient.ts";
import type { UseQueryOptions } from "./useQuery.ts";

const idleState = <T>(): QueryState<T> => ({
  data: undefined,
  error: null,
  isInitialLoading: false,
  isRefreshing: false,
  isStale: false,
});

/**
 * Cached query with PocketBase realtime — subscribes to topics from
 * `resolveRealtimeDeps` and patches or invalidates the cache on push.
 */
export const useLiveQuery = <T>(
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
      const state = client.getQueryState<T>(resolvedKey);
      if (
        state.isStale && !state.isInitialLoading && !state.isRefreshing
      ) {
        run();
      }
    });
  }, [adapter, client, resolvedKey]);

  useEffect(() => {
    if (!resolvedKey) return;

    const deps = resolveRealtimeDeps(resolvedKey);
    if (deps.length === 0) return;

    const unsubs = deps.map((dep) =>
      subscriptionBookkeeper.register(adapter, client, resolvedKey, dep)
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [adapter, client, resolvedKey]);

  if (!resolvedKey) return idleState<T>();

  return client.getQueryState<T>(resolvedKey);
};
