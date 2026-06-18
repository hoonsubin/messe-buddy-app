import type {
  BuddyProfile,
  FieldSchema,
  FormSchema,
  Milestone,
  Mission,
  PBRecord,
  Player,
  ProgressEvent,
  Resource,
  Session,
  TemplateExport,
} from "../types/index.ts";

// The single contract both mock and PocketBase adapters must satisfy.
// Components and use cases consume this interface via AdapterContext.
// Swapping implementations is a one-line change in the context provider.
export interface AppAdapter {
  // Sessions
  getSession(sessionId: string): Promise<Session>;
  listSessions(): Promise<ReadonlyArray<Session>>;
  createSession(name: string, gameMakerUid: string): Promise<Session>;
  updateSession(
    sessionId: string,
    patch: Partial<Omit<Session, keyof PBRecord | "bgImageUrl">> & {
      readonly bgImageUrl?: string | File;
    },
  ): Promise<Session>;

  // Players
  getPlayer(uid: string): Promise<Player | null>;
  getPlayerById(playerId: string): Promise<Player | null>;
  createPlayer(data: Omit<Player, keyof PBRecord>): Promise<Player>;
  updatePlayer(
    playerId: string,
    patch: Partial<Omit<Player, keyof PBRecord>>,
  ): Promise<Player>;
  getPlayerByRecoveryKey(recoveryKey: string): Promise<Player | null>;
  listPlayers(sessionId: string): Promise<ReadonlyArray<Player>>;

  // Milestones
  listMilestones(sessionId: string): Promise<ReadonlyArray<Milestone>>;
  createMilestone(data: Omit<Milestone, keyof PBRecord>): Promise<Milestone>;
  updateMilestone(
    milestoneId: string,
    patch: Partial<Omit<Milestone, keyof PBRecord>>,
  ): Promise<Milestone>;
  deleteMilestone(milestoneId: string): Promise<void>;

  // Missions
  listMissions(sessionId: string): Promise<ReadonlyArray<Mission>>;
  createMission(data: Omit<Mission, keyof PBRecord>): Promise<Mission>;
  updateMission(
    missionId: string,
    patch: Partial<Omit<Mission, keyof PBRecord>>,
  ): Promise<Mission>;
  deleteMission(missionId: string): Promise<void>;

  // FormSchemas
  getFormSchema(missionId: string): Promise<FormSchema | null>;
  upsertFormSchema(
    missionId: string,
    fields: ReadonlyArray<FieldSchema>,
  ): Promise<FormSchema>;

  // ProgressEvents - all writes go through upsertProgressEvent (C-05, C-14)
  upsertProgressEvent(
    playerId: string,
    missionId: string,
    patch: Partial<
      Omit<
        ProgressEvent,
        keyof PBRecord | "playerId" | "missionId" | "sessionId"
      >
    >,
  ): Promise<ProgressEvent>;
  listProgressEvents(playerId: string): Promise<ReadonlyArray<ProgressEvent>>;
  // Returns an unsubscribe function. Consumed via useWatchMission (C-20).
  subscribeProgressEvent(
    playerId: string,
    missionId: string,
    callback: (event: ProgressEvent) => void,
  ): () => void;

  // BuddyProfiles
  getBuddyProfile(playerId: string): Promise<BuddyProfile | null>;
  upsertBuddyProfile(
    playerId: string,
    data: Omit<BuddyProfile, keyof PBRecord | "assignedToPlayerId">,
  ): Promise<BuddyProfile>;

  // Resources
  listResources(sessionId: string): Promise<ReadonlyArray<Resource>>;
  createResource(data: Omit<Resource, keyof PBRecord>): Promise<Resource>;
  updateResource(
    resourceId: string,
    patch: Partial<Omit<Resource, keyof PBRecord>>,
  ): Promise<Resource>;
  deleteResource(resourceId: string): Promise<void>;

  // Templates
  listTemplates(): Promise<ReadonlyArray<TemplateExport>>;
  saveTemplate(template: TemplateExport): Promise<void>;
  deleteTemplate(name: string): Promise<void>;
}
