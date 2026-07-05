import { useCallback, useEffect, useState } from "react";
import type { Resource } from "../types/index.ts";
import type { ResourceType } from "../types/index.ts";
import type { AppAdapter } from "../adapters/interface.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import {
  ensureUniqueResourceKey,
  generateResourceKey,
} from "../utils/resourceKey.ts";

export interface AddResourceInput {
  readonly title: string;
  readonly type: ResourceType;
  readonly url: string;
  readonly isVisibleToPlayer: boolean;
  readonly milestoneId?: string;
  readonly description?: string;
}

export interface UseResourcesPlayerResult {
  readonly role: "player";
  readonly resources: ReadonlyArray<Resource>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
}

export interface UseResourcesGmResult {
  readonly role: "gamemaker";
  readonly resources: ReadonlyArray<Resource>;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
  readonly addResource: (data: AddResourceInput) => Promise<void>;
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
  readonly playerId?: string;
  readonly milestoneId?: string;
};

const slugKey = async (
  adapter: AppAdapter,
  title: string,
): Promise<string> => {
  const existing = await adapter.listLibraryResources();
  const keys = new Set(existing.map((r) => r.resourceKey));
  return ensureUniqueResourceKey(generateResourceKey(title), keys);
};

export function useResources(
  sessionId: string,
  options: { role: "player"; playerId?: string },
): UseResourcesPlayerResult;
export function useResources(
  sessionId: string,
  options: { role: "gamemaker"; playerId?: string; milestoneId?: string },
): UseResourcesGmResult;
export function useResources(
  sessionId: string,
  options: UseResourcesOptions,
): UseResourcesPlayerResult | UseResourcesGmResult {
  const adapter = useAdapter();
  const { playerId, milestoneId } = options;
  const [resources, setResources] = useState<ReadonlyArray<Resource>>([]);
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await adapter.listResources(sessionId, {
          playerId,
          milestoneId,
        });
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
  }, [adapter, options.role, sessionId, playerId, milestoneId, refreshKey]);

  const addResource = useCallback(
    async (data: AddResourceInput) => {
      if (!playerId) throw new Error("playerId required to attach resources");
      const lib = await adapter.createLibraryResource({
        resourceKey: await slugKey(adapter, data.title),
        title: data.title,
        type: data.type,
        url: data.url,
        description: data.description,
      });
      const msId = data.milestoneId ?? milestoneId;
      if (!msId) throw new Error("milestoneId required to attach resources");
      await adapter.attachMilestoneResource({
        sessionId,
        playerId,
        milestoneId: msId,
        libraryResourceId: lib.id,
        isVisibleToPlayer: data.isVisibleToPlayer,
      });
      setRefreshKey((k) => k + 1);
    },
    [adapter, sessionId, playerId, milestoneId],
  );

  const updateResource = useCallback(
    async (
      resourceId: string,
      patch: Partial<Omit<Resource, "id" | "created" | "updated">>,
    ) => {
      const libFields: Array<
        keyof Pick<
          Resource,
          "title" | "type" | "url" | "description" | "resourceKey"
        >
      > = ["title", "type", "url", "description", "resourceKey"];
      const libPatch = Object.fromEntries(
        libFields
          .filter((key) => patch[key] !== undefined)
          .map((key) => [key, patch[key]]),
      ) as Partial<
        Pick<Resource, "title" | "type" | "url" | "description" | "resourceKey">
      >;
      if (Object.keys(libPatch).length > 0) {
        await adapter.updateLibraryResource(resourceId, libPatch);
      }
      const { isVisibleToPlayer } = patch;
      if (isVisibleToPlayer !== undefined && playerId) {
        const attachments = await adapter.listMilestoneResources(playerId);
        const match = attachments.find((mr) =>
          mr.libraryResourceId === resourceId
        );
        if (match) {
          await adapter.updateMilestoneResource(match.id, {
            isVisibleToPlayer,
          });
        }
      }
      setRefreshKey((k) => k + 1);
    },
    [adapter, playerId],
  );

  const deleteResource = useCallback(
    async (resourceId: string) => {
      if (playerId) {
        const attachments = await adapter.listMilestoneResources(playerId);
        for (const mr of attachments) {
          if (mr.libraryResourceId === resourceId) {
            await adapter.detachMilestoneResource(mr.id);
          }
        }
      }
      await adapter.deleteLibraryResource(resourceId);
      setRefreshKey((k) => k + 1);
    },
    [adapter, playerId],
  );

  const toggleVisibility = useCallback(
    async (resourceId: string, visible: boolean) => {
      await updateResource(resourceId, { isVisibleToPlayer: visible });
    },
    [updateResource],
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
