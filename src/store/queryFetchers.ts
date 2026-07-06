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
import type { ClaimStatus } from "../types/index.ts";
import { computeProgress } from "../use-cases/computeProgress.ts";
import { listDistinctBuddyProfilesForPicker } from "../use-cases/createOnboardingJourney.ts";

const STALL_DAYS = 3;

export interface JourneyData {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missions: ReadonlyArray<Mission>;
}

export interface GmPlayerRow {
  readonly playerId: string;
  readonly name: string;
  readonly jobTitle: string;
  readonly claimStatus: ClaimStatus;
  readonly joined: boolean;
  readonly progressPercent: number;
  readonly daysSinceLastActivity: number | null;
  readonly isStalled: boolean;
}

export interface GmRosterData {
  readonly players: ReadonlyArray<Player>;
  readonly allProgressEvents: ReadonlyArray<ProgressEvent>;
  readonly rows: ReadonlyArray<GmPlayerRow>;
}

export const fetchSessionMeta = (sessionId: string) =>
async (adapter: AppAdapter): Promise<Session> =>
  adapter.getSession(sessionId);

export const fetchJourney = (sessionId: string, playerId: string) =>
async (adapter: AppAdapter): Promise<JourneyData> => {
  const [milestones, missions] = await Promise.all([
    adapter.listMilestones(sessionId, { playerId }),
    adapter.listMissions(sessionId, { playerId }),
  ]);
  return { milestones, missions };
};

export const fetchPlayerByUid = (uid: string) =>
async (adapter: AppAdapter): Promise<Player | null> => adapter.getPlayer(uid);

export const fetchPlayerById = (playerId: string) =>
async (adapter: AppAdapter): Promise<Player | null> =>
  adapter.getPlayerById(playerId);

export const fetchProgress = (playerId: string) =>
async (adapter: AppAdapter): Promise<ReadonlyArray<ProgressEvent>> =>
  adapter.listProgressEvents(playerId);

export const fetchBuddy = (playerId: string) =>
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

export const fetchTemplates = () =>
async (adapter: AppAdapter): Promise<ReadonlyArray<TemplateExport>> =>
  adapter.listTemplates();

export const fetchLibraryResources = () =>
async (adapter: AppAdapter): Promise<ReadonlyArray<LibraryResource>> =>
  adapter.listLibraryResources();

export const fetchBuddyPicker = (sessionId: string) =>
async (adapter: AppAdapter): Promise<ReadonlyArray<BuddyProfile>> =>
  listDistinctBuddyProfilesForPicker(sessionId, adapter);

export const fetchFormSchema = (missionId: string) =>
async (adapter: AppAdapter): Promise<FormSchema | null> => {
  try {
    return await adapter.getFormSchema(missionId);
  } catch {
    return null;
  }
};

export const fetchGmRoster = (sessionId: string) =>
async (adapter: AppAdapter): Promise<GmRosterData> => {
  const sessionPlayers = await adapter.listPlayers(sessionId);
  const progressResults = await Promise.all(
    sessionPlayers.map((p) => adapter.listProgressEvents(p.id)),
  );
  const allProgressEvents = progressResults.flat();

  const rows = await Promise.all(
    sessionPlayers.map(async (p, index): Promise<GmPlayerRow> => {
      const joined = p.claimStatus === "claimed";
      if (!joined) {
        return {
          playerId: p.id,
          name: p.name,
          jobTitle: p.jobTitle,
          claimStatus: p.claimStatus,
          joined: false,
          progressPercent: 0,
          daysSinceLastActivity: null,
          isStalled: false,
        };
      }

      const events = progressResults[index] ?? [];
      const [milestones, missions] = await Promise.all([
        adapter.listMilestones(sessionId, { playerId: p.id }),
        adapter.listMissions(sessionId, { playerId: p.id }),
      ]);
      const progress = computeProgress(p.id, missions, milestones, events);
      const { milestoneProgress } = progress;
      const progressPercent = milestoneProgress.length === 0
        ? 0
        : Math.round(
          (milestoneProgress.reduce((sum, mp) => sum + mp.percentComplete, 0) /
            milestoneProgress.length) * 100,
        );
      const lastMs = events.length > 0
        ? Math.max(...events.map((e) => new Date(e.updated).getTime()))
        : null;
      const days = lastMs !== null
        ? Math.floor((Date.now() - lastMs) / (1000 * 60 * 60 * 24))
        : null;

      return {
        playerId: p.id,
        name: p.name,
        jobTitle: p.jobTitle,
        claimStatus: p.claimStatus,
        joined: true,
        progressPercent,
        daysSinceLastActivity: days,
        isStalled: days !== null && days > STALL_DAYS,
      };
    }),
  );

  return { players: sessionPlayers, allProgressEvents, rows };
};
