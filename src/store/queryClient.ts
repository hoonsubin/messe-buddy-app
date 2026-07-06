import { devBackendTrace } from "./devBackendTrace.ts";

export type QueryStatus = "idle" | "loading" | "success" | "error";

interface CacheEntry<T> {
  readonly data: T | undefined;
  readonly error: Error | null;
  readonly status: QueryStatus;
  readonly fetchedAt: number | null;
  readonly stale: boolean;
}

export interface QueryState<T> {
  readonly data: T | undefined;
  readonly error: Error | null;
  readonly isInitialLoading: boolean;
  readonly isRefreshing: boolean;
}

export interface QueryClient {
  readonly fetchQuery: <T>(
    key: string,
    fetcher: () => Promise<T>,
  ) => Promise<T>;
  readonly getQueryState: <T>(key: string) => QueryState<T>;
  readonly subscribe: (key: string, listener: () => void) => () => void;
  readonly invalidateQuery: (keys: string | ReadonlyArray<string>) => void;
  readonly patchQuery: <T>(
    key: string,
    updater: (old: T | undefined) => T,
  ) => void;
}

const emptyState = <T>(): QueryState<T> => ({
  data: undefined,
  error: null,
  isInitialLoading: false,
  isRefreshing: false,
});

export const createQueryClient = (): QueryClient => {
  const cache = new Map<string, CacheEntry<unknown>>();
  const inflight = new Map<string, Promise<unknown>>();
  const listeners = new Map<string, Set<() => void>>();

  const notify = (key: string): void => {
    listeners.get(key)?.forEach((listener) => listener());
  };

  const getEntry = <T>(key: string): CacheEntry<T> | undefined =>
    cache.get(key) as CacheEntry<T> | undefined;

  const setEntry = <T>(key: string, entry: CacheEntry<T>): void => {
    cache.set(key, entry);
  };

  const fetchQuery = async <T>(
    key: string,
    fetcher: () => Promise<T>,
  ): Promise<T> => {
    const existingInflight = inflight.get(key);
    if (existingInflight) {
      devBackendTrace.queryCoalesce(key);
      return existingInflight as Promise<T>;
    }

    const entry = getEntry<T>(key);
    if (
      entry?.data !== undefined && entry.status === "success" && !entry.stale
    ) {
      const ageMs = entry.fetchedAt !== null
        ? Date.now() - entry.fetchedAt
        : 0;
      devBackendTrace.queryHit(key, ageMs);
      return entry.data;
    }

    devBackendTrace.queryFetch(key);

    const promise = (async () => {
      try {
        const data = await fetcher();
        setEntry<T>(key, {
          data,
          error: null,
          status: "success",
          fetchedAt: Date.now(),
          stale: false,
        });
        notify(key);
        return data;
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        setEntry<T>(key, {
          data: entry?.data,
          error,
          status: "error",
          fetchedAt: entry?.fetchedAt ?? null,
          stale: false,
        });
        notify(key);
        throw error;
      } finally {
        inflight.delete(key);
        notify(key);
      }
    })();

    inflight.set(key, promise);
    notify(key);
    return promise;
  };

  const getQueryState = <T>(key: string): QueryState<T> => {
    const entry = getEntry<T>(key);
    const loading = inflight.has(key);
    const hasData = entry?.data !== undefined;

    if (!entry && !loading) return emptyState<T>();

    return {
      data: entry?.data,
      error: entry?.error ?? null,
      isInitialLoading: !hasData && loading,
      isRefreshing: hasData && loading,
    };
  };

  const subscribe = (key: string, listener: () => void): (() => void) => {
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  };

  const invalidateQuery = (keys: string | ReadonlyArray<string>): void => {
    const list = Array.isArray(keys) ? keys : [keys];
    devBackendTrace.queryInvalidate(list);

    for (const key of list) {
      const entry = getEntry<unknown>(key);
      if (entry) {
        setEntry(key, { ...entry, stale: true });
      }
      notify(key);
    }
  };

  const patchQuery = <T>(
    key: string,
    updater: (old: T | undefined) => T,
  ): void => {
    const entry = getEntry<T>(key);
    const data = updater(entry?.data);
    setEntry<T>(key, {
      data,
      error: null,
      status: "success",
      fetchedAt: Date.now(),
      stale: false,
    });
    devBackendTrace.queryPatch(key);
    notify(key);
  };

  return {
    fetchQuery,
    getQueryState,
    subscribe,
    invalidateQuery,
    patchQuery,
  };
};
