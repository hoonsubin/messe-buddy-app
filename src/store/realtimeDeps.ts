import type { AppAdapter } from "../adapters/interface.ts";
import type { Player, ProgressEvent } from "../types/index.ts";
import {
  patchGmRosterFromPlayer,
  patchGmRosterFromProgressEvent,
} from "./gmRosterPatch.ts";
import { pbEqFilter } from "./realtimeFilters.ts";
import type { RealtimeAction, RealtimeDep } from "./realtimeTypes.ts";
import type { QueryClient } from "./queryClient.ts";

export interface RealtimeHandlerContext {
  readonly queryKey: string;
  readonly collection: string;
  readonly action: RealtimeAction;
  readonly record: unknown;
  readonly client: QueryClient;
  readonly adapter: AppAdapter;
}

export type RealtimeHandler = (
  ctx: RealtimeHandlerContext,
) => void | Promise<void>;

/** Map a cache key to the PocketBase topics that should invalidate or patch it. */
export const resolveRealtimeDeps = (
  queryKey: string,
): ReadonlyArray<RealtimeDep> => {
  if (queryKey.startsWith("gmRoster:")) {
    const sessionId = queryKey.slice("gmRoster:".length);
    if (!sessionId) return [];
    const sessionFilter = pbEqFilter("sessionId", sessionId);
    return [
      { collection: "players", filter: sessionFilter },
      { collection: "progress_events", filter: sessionFilter },
    ];
  }

  if (queryKey.startsWith("journey:")) {
    const parts = queryKey.split(":");
    if (parts.length < 3) return [];
    const playerId = parts.slice(2).join(":");
    if (!playerId) return [];
    const playerFilter = pbEqFilter("playerId", playerId);
    return [
      { collection: "milestones", filter: playerFilter },
      { collection: "missions", filter: playerFilter },
    ];
  }

  if (queryKey.startsWith("progress:")) {
    const playerId = queryKey.slice("progress:".length);
    if (!playerId) return [];
    return [
      {
        collection: "progress_events",
        filter: pbEqFilter("playerId", playerId),
      },
    ];
  }

  if (queryKey === "templates") {
    return [{ collection: "templates" }];
  }

  if (queryKey === "libraryResources") {
    return [{ collection: "library_resources" }];
  }

  if (queryKey.startsWith("buddy:")) {
    const playerId = queryKey.slice("buddy:".length);
    if (!playerId) return [];
    return [{
      collection: "buddy_profiles",
      filter: pbEqFilter("assignedToPlayerId", playerId),
    }];
  }

  if (queryKey.startsWith("buddyPicker:")) {
    const sessionId = queryKey.slice("buddyPicker:".length);
    if (!sessionId) return [];
    return [{
      collection: "buddy_profiles",
      filter: pbEqFilter("sessionId", sessionId),
    }];
  }

  if (queryKey.startsWith("resources:")) {
    const parts = queryKey.split(":");
    if (parts.length < 3) return [];
    const playerId = parts.slice(2).join(":");
    if (!playerId) return [];
    return [
      {
        collection: "milestone_resources",
        filter: pbEqFilter("playerId", playerId),
      },
      { collection: "library_resources" },
    ];
  }

  if (queryKey.startsWith("formSchema:")) {
    const missionId = queryKey.slice("formSchema:".length);
    if (!missionId) return [];
    return [{
      collection: "form_schemas",
      filter: pbEqFilter("missionId", missionId),
    }];
  }

  return [];
};

const handleGmRosterEvent = (
  ctx: RealtimeHandlerContext,
): void | Promise<void> => {
  const sessionId = ctx.queryKey.slice("gmRoster:".length);
  if (!sessionId) return;

  if (ctx.collection === "players") {
    if (ctx.action === "delete") {
      ctx.client.invalidateQuery(ctx.queryKey);
      return;
    }
    patchGmRosterFromPlayer(
      ctx.client,
      sessionId,
      ctx.record as Player,
    );
    return;
  }

  if (ctx.collection === "progress_events") {
    if (ctx.action === "delete") {
      ctx.client.invalidateQuery(ctx.queryKey);
      return;
    }
    return patchGmRosterFromProgressEvent(
      ctx.client,
      ctx.adapter,
      sessionId,
      ctx.record as ProgressEvent,
    );
  }
};

/** Optional per-key handler; default is invalidate-on-event. */
export const resolveRealtimeHandler = (
  queryKey: string,
): RealtimeHandler | undefined => {
  if (queryKey.startsWith("gmRoster:")) return handleGmRosterEvent;
  return undefined;
};
