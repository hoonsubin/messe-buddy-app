import type { AppAdapter } from "../adapters/interface.ts";
import type {
  BuddyProfile,
  FormSchema,
  LibraryResource,
  Milestone,
  Mission,
  Player,
  ProgressEvent,
  Resource,
  Session,
  TemplateExport,
} from "../types/index.ts";
import { buildGmPlayerRow } from "./gmRosterPatch.ts";
import type { GmPlayerRow, GmRosterData } from "./gmRosterTypes.ts";
import { listDistinctBuddyProfilesForPicker } from "../use-cases/createOnboardingJourney.ts";

export type { GmPlayerRow, GmRosterData } from "./gmRosterTypes.ts";

export interface JourneyData {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
}

export const fetchSessionMeta =
  (sessionId: string) => async (adapter: AppAdapter): Promise<Session> =>
    adapter.getSession(sessionId);

export const fetchJourney =
  (sessionId: string, playerId: string) =>
  async (adapter: AppAdapter): Promise<JourneyData> => {
    const [milestones, missions] = await Promise.all([
      adapter.listMilestones(sessionId, { playerId }),
      adapter.listMissions(sessionId, { playerId }),
    ]);
    return { milestones, missions };
  };

export const fetchPlayerByUid =
  (uid: string) => async (adapter: AppAdapter): Promise<Player | null> =>
    adapter.getPlayer(uid);

export const fetchPlayerById =
  (playerId: string) => async (adapter: AppAdapter): Promise<Player | null> =>
    adapter.getPlayerById(playerId);

export const fetchProgress =
  (playerId: string) =>
  async (adapter: AppAdapter): Promise<ReadonlyArray<ProgressEvent>> =>
    adapter.listProgressEvents(playerId);

export const fetchBuddy =
  (playerId: string) =>
  async (adapter: AppAdapter): Promise<BuddyProfile | null> =>
    adapter.getBuddyProfile(playerId);

export const fetchPlayerResources = (
  sessionId: string,
  playerId: string,
  visibleOnly: boolean,
) =>
async (adapter: AppAdapter): Promise<ReadonlyArray<Resource>> => {
  const all = await adapter.listResources(sessionId, { playerId });
  return visibleOnly ? all.filter((r) => r.isVisibleToPlayer) : all;
};

export const fetchTemplates =
  () => async (adapter: AppAdapter): Promise<ReadonlyArray<TemplateExport>> =>
    adapter.listTemplates();

export const fetchLibraryResources =
  () => async (adapter: AppAdapter): Promise<ReadonlyArray<LibraryResource>> =>
    adapter.listLibraryResources();

export const fetchBuddyPicker =
  (sessionId: string) =>
  async (adapter: AppAdapter): Promise<ReadonlyArray<BuddyProfile>> =>
    listDistinctBuddyProfilesForPicker(sessionId, adapter);

export const fetchFormSchema =
  (missionId: string) =>
  async (adapter: AppAdapter): Promise<FormSchema | null> => {
    try {
      return await adapter.getFormSchema(missionId);
    } catch {
      return null;
    }
  };

export const fetchGmRoster =
  (sessionId: string) => async (adapter: AppAdapter): Promise<GmRosterData> => {
    const sessionPlayers = await adapter.listPlayers(sessionId);
    const progressResults = await Promise.all(
      sessionPlayers.map((p) => adapter.listProgressEvents(p.id)),
    );
    const allProgressEvents = progressResults.flat();

    const rows = await Promise.all(
      sessionPlayers.map(async (p, index): Promise<GmPlayerRow> => {
        const events = progressResults[index] ?? [];
        if (p.claimStatus !== "claimed") {
          return buildGmPlayerRow(p, events, [], []);
        }
        const [milestones, missions] = await Promise.all([
          adapter.listMilestones(sessionId, { playerId: p.id }),
          adapter.listMissions(sessionId, { playerId: p.id }),
        ]);
        return buildGmPlayerRow(p, events, milestones, missions);
      }),
    );

    return { players: sessionPlayers, allProgressEvents, rows };
  };
