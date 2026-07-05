import { useCallback, useEffect, useMemo, useState } from "react";
import type { LibraryResource } from "../types/index.ts";
import { RESOURCE_TYPE } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import {
  collectTagSuggestions,
  serializeLibraryTags,
} from "../utils/libraryTags.ts";
import {
  ensureUniqueResourceKey,
  generateResourceKey,
} from "../utils/resourceKey.ts";

export interface LibraryResourceInput {
  readonly title: string;
  readonly url: string;
  readonly description?: string;
  readonly tags: ReadonlyArray<string>;
}

export type LibraryResourcePatch = Partial<LibraryResourceInput>;

export interface UseLibraryResourcesResult {
  readonly resources: ReadonlyArray<LibraryResource>;
  readonly tagSuggestions: ReadonlyArray<string>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  readonly createResource: (
    data: LibraryResourceInput,
  ) => Promise<LibraryResource>;
  readonly updateResource: (
    id: string,
    patch: LibraryResourcePatch,
  ) => Promise<LibraryResource>;
  readonly deleteResource: (id: string) => Promise<void>;
}

export const useLibraryResources = (
  active: boolean,
): UseLibraryResourcesResult => {
  const adapter = useAdapter();
  const [resources, setResources] = useState<ReadonlyArray<LibraryResource>>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await adapter.listLibraryResources();
        if (!cancelled) setResources(rows);
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
  }, [adapter, active, refreshKey]);

  const tagSuggestions = useMemo(
    () => collectTagSuggestions(resources),
    [resources],
  );

  const createResource = useCallback(
    async (data: LibraryResourceInput): Promise<LibraryResource> => {
      const existing = await adapter.listLibraryResources();
      const keys = new Set(existing.map((r) => r.resourceKey));
      const resourceKey = ensureUniqueResourceKey(
        generateResourceKey(data.title),
        keys,
      );
      const created = await adapter.createLibraryResource({
        resourceKey,
        title: data.title.trim(),
        type: RESOURCE_TYPE.LINK,
        url: data.url.trim(),
        description: data.description?.trim() || undefined,
        tags: serializeLibraryTags(data.tags),
      });
      setRefreshKey((k) => k + 1);
      return created;
    },
    [adapter],
  );

  const updateResource = useCallback(
    async (
      id: string,
      patch: LibraryResourcePatch,
    ): Promise<LibraryResource> => {
      const libPatch: Partial<
        Omit<LibraryResource, "id" | "created" | "updated">
      > = {
        ...(patch.title !== undefined && { title: patch.title.trim() }),
        ...(patch.url !== undefined && { url: patch.url.trim() }),
        ...(patch.description !== undefined && {
          description: patch.description.trim() || undefined,
        }),
        ...(patch.tags !== undefined && {
          tags: serializeLibraryTags(patch.tags),
        }),
      };
      const updated = await adapter.updateLibraryResource(id, libPatch);
      setRefreshKey((k) => k + 1);
      return updated;
    },
    [adapter],
  );

  const deleteResource = useCallback(
    async (id: string): Promise<void> => {
      await adapter.deleteLibraryResource(id);
      setRefreshKey((k) => k + 1);
    },
    [adapter],
  );

  return {
    resources,
    tagSuggestions,
    loading,
    error,
    refresh,
    createResource,
    updateResource,
    deleteResource,
  };
};
