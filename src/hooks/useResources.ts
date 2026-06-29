import { useCallback, useEffect, useState } from "react";
import type { Resource } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";

export interface UseResourcesPlayerResult {
  readonly role: "player";
  readonly resources: ReadonlyArray<Resource>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
}

export interface UseResourcesAdminResult {
  readonly role: "gamemaker";
  readonly resources: ReadonlyArray<Resource>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  readonly addResource: (
    data: Omit<Resource, "id" | "created" | "updated">,
  ) => Promise<void>;
  readonly updateResource: (
    resourceId: string,
    patch: Partial<Omit<Resource, "id" | "created" | "updated">>,
  ) => Promise<void>;
  readonly deleteResource: (resourceId: string) => Promise<void>;
  readonly toggleVisibility: (
    resourceId: string,
    visible: boolean,
  ) => Promise<void>;
}

type UseResourcesOptions = {
  readonly role: "player" | "gamemaker";
};

export function useResources(
  sessionId: string,
  options: { role: "player" },
): UseResourcesPlayerResult;
export function useResources(
  sessionId: string,
  options: { role: "gamemaker" },
): UseResourcesAdminResult;
export function useResources(
  sessionId: string,
  options: UseResourcesOptions,
): UseResourcesPlayerResult | UseResourcesAdminResult {
  const adapter = useAdapter();
  const [resources, setResources] = useState<ReadonlyArray<Resource>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await adapter.listResources(sessionId);
        if (!cancelled) {
          setResources(
            options.role === "player"
              ? all.filter((r) => r.isVisibleToPlayer)
              : all,
          );
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
  }, [adapter, options.role, sessionId, refreshKey]);

  const addResource = useCallback(
    async (data: Omit<Resource, "id" | "created" | "updated">) => {
      const created = await adapter.createResource(data);
      setResources((prev) => [...prev, created]);
    },
    [adapter],
  );

  const updateResource = useCallback(
    async (
      resourceId: string,
      patch: Partial<Omit<Resource, "id" | "created" | "updated">>,
    ) => {
      const updated = await adapter.updateResource(resourceId, patch);
      setResources((prev) =>
        prev.map((r) => (r.id === resourceId ? updated : r))
      );
    },
    [adapter],
  );

  const deleteResource = useCallback(
    async (resourceId: string) => {
      await adapter.deleteResource(resourceId);
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
    },
    [adapter],
  );

  const toggleVisibility = useCallback(
    async (resourceId: string, visible: boolean) => {
      const updated = await adapter.updateResource(resourceId, {
        isVisibleToPlayer: visible,
      });
      setResources((prev) =>
        prev.map((r) => (r.id === resourceId ? updated : r))
      );
    },
    [adapter],
  );

  if (options.role === "gamemaker") {
    return {
      role: "gamemaker",
      resources,
      loading,
      error,
      refresh,
      addResource,
      updateResource,
      deleteResource,
      toggleVisibility,
    };
  }

  return { role: "player", resources, loading, error, refresh };
}
