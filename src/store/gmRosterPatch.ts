import type { AppAdapter } from "../adapters/interface.ts";
import type {
  Milestone,
  Mission,
  Player,
  ProgressEvent,
} from "../types/index.ts";
import { computeProgress } from "../use-cases/computeProgress.ts";
import type { GmPlayerRow, GmRosterData } from "./gmRosterTypes.ts";
import { mergeProgressEvent } from "./progressEvents.ts";
import { queryKeys } from "./queryKeys.ts";
import type { QueryClient } from "./queryClient.ts";

const STALL_DAYS = 3;

export const buildGmPlayerRow = (
  player: Player,
  events: ReadonlyArray<ProgressEvent>,
  milestones: ReadonlyArray<Milestone>,
  missions: ReadonlyArray<Mission>,
): GmPlayerRow => {
  const joined = player.claimStatus === "claimed";
  if (!joined) {
    return {
      playerId: player.id,
      name: player.name,
      jobTitle: player.jobTitle,
      claimStatus: player.claimStatus,
      joined: false,
      progressPercent: 0,
      daysSinceLastActivity: null,
      isStalled: false,
    };
  }

  const progress = computeProgress(player.id, missions, milestones, events);
  const { milestoneProgress } = progress;
  const progressPercent = milestoneProgress.length === 0 ? 0 : Math.round(
    milestoneProgress.reduce((sum, mp) => sum + mp.percentComplete, 0) /
      milestoneProgress.length * 100,
  );
  const lastMs = events.length > 0
    ? Math.max(...events.map((e) => new Date(e.updated).getTime()))
    : null;
  const days = lastMs !== null
    ? Math.floor((Date.now() - lastMs) / (1000 * 60 * 60 * 24))
    : null;

  return {
    playerId: player.id,
    name: player.name,
    jobTitle: player.jobTitle,
    claimStatus: player.claimStatus,
    joined: true,
    progressPercent,
    daysSinceLastActivity: days,
    isStalled: days !== null && days > STALL_DAYS,
  };
};

export const patchGmRosterFromPlayer = (
  client: QueryClient,
  sessionId: string,
  player: Player,
): void => {
  if (player.sessionId !== sessionId) return;

  const key = queryKeys.gmRoster(sessionId);
  const cached = client.getQueryState<GmRosterData>(key).data;
  if (!cached) {
    client.invalidateQuery(key);
    return;
  }

  const exists = cached.players.some((p) => p.id === player.id);
  if (!exists) {
    client.invalidateQuery(key);
    return;
  }

  client.patchQuery<GmRosterData>(key, (old) => {
    if (!old) return old as never;

    const players = old.players.map((p) => p.id === player.id ? player : p);
    const joined = player.claimStatus === "claimed";
    const rows = old.rows.map((row) => {
      if (row.playerId !== player.id) return row;
      if (!joined) {
        return {
          ...row,
          name: player.name,
          jobTitle: player.jobTitle,
          claimStatus: player.claimStatus,
          joined: false,
          progressPercent: 0,
          daysSinceLastActivity: null,
          isStalled: false,
        };
      }
      return {
        ...row,
        name: player.name,
        jobTitle: player.jobTitle,
        claimStatus: player.claimStatus,
        joined: true,
      };
    });

    return { ...old, players, rows };
  });
};

export const patchGmRosterFromProgressEvent = async (
  client: QueryClient,
  adapter: AppAdapter,
  sessionId: string,
  event: ProgressEvent,
): Promise<void> => {
  if (event.sessionId !== sessionId) return;

  const rosterKey = queryKeys.gmRoster(sessionId);
  client.patchQuery<ReadonlyArray<ProgressEvent>>(
    queryKeys.progress(event.playerId),
    (prev) => mergeProgressEvent(prev, event),
  );

  const cached = client.getQueryState<GmRosterData>(rosterKey).data;
  if (!cached) {
    client.invalidateQuery(rosterKey);
    return;
  }

  const player = cached.players.find((p) => p.id === event.playerId);
  if (!player) {
    client.invalidateQuery(rosterKey);
    return;
  }

  const allProgressEvents = mergeProgressEvent(cached.allProgressEvents, event);
  const playerEvents = allProgressEvents.filter((e) =>
    e.playerId === event.playerId
  );

  let rows = cached.rows;
  if (player.claimStatus === "claimed") {
    const [milestones, missions] = await Promise.all([
      adapter.listMilestones(sessionId, { playerId: player.id }),
      adapter.listMissions(sessionId, { playerId: player.id }),
    ]);
    const row = buildGmPlayerRow(player, playerEvents, milestones, missions);
    rows = cached.rows.map((r) => r.playerId === player.id ? row : r);
  }

  client.patchQuery<GmRosterData>(rosterKey, (old) => {
    if (!old) return old as never;
    return { ...old, allProgressEvents, rows };
  });
};
