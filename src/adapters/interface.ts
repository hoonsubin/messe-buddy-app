import type {
  BuddyProfile,
  FieldSchema,
  FormSchema,
  LibraryResource,
  Milestone,
  MilestoneResource,
  Mission,
  PBRecord,
  Player,
  ProgressEvent,
  Resource,
  Session,
  TemplateExport,
} from "../types/index.ts";

export interface ListMilestonesOptions {
  readonly playerId?: string;
}

export interface ListMissionsOptions {
  readonly playerId?: string;
}

// The single contract both mock and PocketBase adapters must satisfy.
export interface AppAdapter {
  // Sessions
  getSession(sessionId: string): Promise<Session>;
  getSessionByGmRecoveryKey(recoveryKey: string): Promise<Session | null>;
  listSessions(): Promise<ReadonlyArray<Session>>;
  createSession(
    name: string,
    gameMakerUid: string,
    gmRecoveryKey: string,
  ): Promise<Session>;
  updateSession(
    sessionId: string,
    patch: Partial<Omit<Session, keyof PBRecord | "bgImageUrl">> & {
      readonly bgImageUrl?: string | File;
    },
  ): Promise<Session>;

  // Players
  getPlayer(uid: string): Promise<Player | null>;
  getPlayerById(playerId: string): Promise<Player | null>;
  getPlayerByInviteToken(inviteToken: string): Promise<Player | null>;
  getPlayerByRecoveryKey(recoveryKey: string): Promise<Player | null>;
  invitePlayer(
    sessionId: string,
    data: { readonly name?: string; readonly jobTitle?: string },
  ): Promise<Player>;
  updatePlayer(
    playerId: string,
    patch: Partial<Omit<Player, keyof PBRecord>>,
  ): Promise<Player>;
  listPlayers(sessionId: string): Promise<ReadonlyArray<Player>>;

  // Milestones
  listMilestones(
    sessionId: string,
    options?: ListMilestonesOptions,
  ): Promise<ReadonlyArray<Milestone>>;
  createMilestone(
    data: Omit<Milestone, keyof PBRecord> & { readonly id?: string },
  ): Promise<Milestone>;
  updateMilestone(
    milestoneId: string,
    patch: Partial<Omit<Milestone, keyof PBRecord>>,
  ): Promise<Milestone>;
  deleteMilestone(milestoneId: string): Promise<void>;

  // Missions
  listMissions(
    sessionId: string,
    options?: ListMissionsOptions,
  ): Promise<ReadonlyArray<Mission>>;
  createMission(
    data: Omit<Mission, keyof PBRecord> & { readonly id?: string },
  ): Promise<Mission>;
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

  // ProgressEvents
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

  // Library resources (company-wide)
  listLibraryResources(): Promise<ReadonlyArray<LibraryResource>>;
  createLibraryResource(
    data: Omit<LibraryResource, keyof PBRecord>,
  ): Promise<LibraryResource>;
  updateLibraryResource(
    resourceId: string,
    patch: Partial<Omit<LibraryResource, keyof PBRecord>>,
  ): Promise<LibraryResource>;
  deleteLibraryResource(resourceId: string): Promise<void>;

  // Milestone resource attachments
  listMilestoneResources(
    playerId: string,
    milestoneId?: string,
  ): Promise<ReadonlyArray<MilestoneResource>>;
  attachMilestoneResource(
    data: Omit<MilestoneResource, keyof PBRecord>,
  ): Promise<MilestoneResource>;
  updateMilestoneResource(
    attachmentId: string,
    patch: Partial<Omit<MilestoneResource, keyof PBRecord>>,
  ): Promise<MilestoneResource>;
  detachMilestoneResource(attachmentId: string): Promise<void>;

  /** Resolved library rows for UI (player sidebar / admin lists). */
  listResources(
    sessionId: string,
    options?: { readonly playerId?: string; readonly milestoneId?: string },
  ): Promise<ReadonlyArray<Resource>>;

  // Templates
  listTemplates(): Promise<ReadonlyArray<TemplateExport>>;
  saveTemplate(template: TemplateExport): Promise<void>;
  deleteTemplate(name: string): Promise<void>;
}
