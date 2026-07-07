import type {
  AppAdapter,
  ListMilestonesOptions,
  ListMissionsOptions,
} from "../interface.ts";
import type {
  BuddyProfile,
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
} from "../../types/index.ts";
import type { FieldSchema } from "../../types/index.ts";
import { generateInviteToken } from "../../utils/inviteToken.ts";
import { seedDemoInstance } from "../../use-cases/seedDemoInstance.ts";
import { DEFAULT_SESSION_BACKGROUND_URL } from "../../constants/defaultSessionBackground.ts";

const sessions = new Map<string, Session>();
const players = new Map<string, Player>();
const milestones = new Map<string, Milestone>();
const missions = new Map<string, Mission>();
const formSchemas = new Map<string, FormSchema>();
const progressEvents = new Map<string, ProgressEvent>();
const buddyProfiles = new Map<string, BuddyProfile>();
const libraryResources = new Map<string, LibraryResource>();
const milestoneResources = new Map<string, MilestoneResource>();
const templates = new Map<string, TemplateExport>();

type ProgressCallback = (event: ProgressEvent) => void;
const subscriptions = new Map<string, Set<ProgressCallback>>();

type SessionPlayerCallback = (player: Player) => void;
const sessionPlayerSubscriptions = new Map<
  string,
  Set<SessionPlayerCallback>
>();

type SessionProgressCallback = (event: ProgressEvent) => void;
const sessionProgressSubscriptions = new Map<
  string,
  Set<SessionProgressCallback>
>();

const makeId = (): string =>
  Math.random().toString(36).slice(2, 17).padEnd(15, "0").slice(0, 15);

const now = (): string => new Date().toISOString();

const makeRecord = (): PBRecord => {
  const t = now();
  return { id: makeId(), created: t, updated: t };
};

const notify = (key: string, event: ProgressEvent): void => {
  const subs = subscriptions.get(key);
  if (!subs) return;
  for (const cb of subs) cb(event);
};

type RealtimeAction = "create" | "update" | "delete";
type CollectionCallback = (
  action: RealtimeAction,
  record: unknown,
) => void;
const collectionSubscriptions = new Map<string, Set<CollectionCallback>>();

const collectionTopicKey = (collection: string, filter?: string): string =>
  `${collection}\0${filter ?? ""}`;

const unescapeFilterValue = (raw: string): string =>
  raw.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

const recordMatchesFilter = (record: unknown, filter?: string): boolean => {
  if (!filter) return true;
  const match = filter.match(/^(\w+)\s*=\s*"((?:\\.|[^"\\])*)"$/);
  if (!match) return true;
  const [, field, rawValue] = match;
  const value = unescapeFilterValue(rawValue);
  const rec = record as Record<string, unknown>;
  return String(rec[field] ?? "") === value;
};

const notifyCollection = (
  collection: string,
  action: RealtimeAction,
  record: unknown,
): void => {
  for (const [key, subs] of collectionSubscriptions) {
    const sep = key.indexOf("\0");
    const coll = key.slice(0, sep);
    const filter = key.slice(sep + 1) || undefined;
    if (coll !== collection) continue;
    if (!recordMatchesFilter(record, filter)) continue;
    for (const cb of subs) cb(action, record);
  }
};

const notifySessionPlayer = (
  sessionId: string,
  player: Player,
  action: RealtimeAction = "update",
): void => {
  const subs = sessionPlayerSubscriptions.get(sessionId);
  if (subs) {
    for (const cb of subs) cb(player);
  }
  notifyCollection("players", action, player);
};

const notifySessionProgress = (
  sessionId: string,
  event: ProgressEvent,
  action: RealtimeAction = "update",
): void => {
  const subs = sessionProgressSubscriptions.get(sessionId);
  if (subs) {
    for (const cb of subs) cb(event);
  }
  notifyCollection("progress_events", action, event);
};

let currentGmUid = "uid_gamemaker_peter";

export const setMockGmUid = (uid: string): void => {
  currentGmUid = uid;
};

const simulateGmApproval = (key: string, gmUid?: string): void => {
  const effectiveUid = gmUid ?? currentGmUid;
  setTimeout(() => {
    const existing = progressEvents.get(key);
    if (!existing || existing.status !== "pendingApproval") return;
    const approved: ProgressEvent = {
      ...existing,
      status: "completed",
      validatedBy: effectiveUid,
      validatedAt: now(),
      updated: now(),
    };
    progressEvents.set(key, approved);
    notify(key, approved);
    if (approved.sessionId) notifySessionProgress(approved.sessionId, approved);
  }, 4000);
};

const uniqueInviteToken = async (): Promise<string> => {
  for (let attempt = 0; attempt < 8; attempt++) {
    const token = generateInviteToken();
    const taken = [...players.values()].some((p) => p.inviteToken === token);
    if (!taken) return token;
  }
  throw new Error("Could not generate invite token");
};

const resolveResources = (
  sessionId: string,
  options?: { readonly playerId?: string; readonly milestoneId?: string },
): ReadonlyArray<Resource> => {
  let attachments = [...milestoneResources.values()].filter(
    (mr) => mr.sessionId === sessionId,
  );
  if (options?.playerId) {
    attachments = attachments.filter((mr) => mr.playerId === options.playerId);
  }
  if (options?.milestoneId) {
    attachments = attachments.filter((mr) =>
      mr.milestoneId === options.milestoneId
    );
  }
  return attachments.flatMap((mr) => {
    const lib = libraryResources.get(mr.libraryResourceId);
    if (!lib) return [];
    return [{
      ...lib,
      isVisibleToPlayer: mr.isVisibleToPlayer,
      milestoneId: mr.milestoneId,
      playerId: mr.playerId,
    }];
  });
};

const getSession = async (sessionId: string): Promise<Session> => {
  await Promise.resolve();
  const s = sessions.get(sessionId);
  if (!s) throw new Error(`Session not found: ${sessionId}`);
  return s;
};

const getSessionByGmRecoveryKey = async (
  recoveryKey: string,
): Promise<Session | null> => {
  await Promise.resolve();
  for (const s of sessions.values()) {
    if (s.gmRecoveryKey === recoveryKey) return s;
  }
  return null;
};

const listSessions = async (): Promise<ReadonlyArray<Session>> => {
  await Promise.resolve();
  return [...sessions.values()];
};

const createSession = async (
  name: string,
  gameMakerUid: string,
  gmRecoveryKey: string,
  id?: string,
): Promise<Session> => {
  await Promise.resolve();
  const record = makeRecord();
  const sessionId = id ?? record.id;
  const session: Session = {
    ...record,
    id: sessionId,
    name,
    bgImageUrl: "",
    mapNodeScale: 0.33,
    gameMakerId: gameMakerUid,
    gmRecoveryKey,
    preBoardingChecks: [],
    qrSecret: sessionId,
  };
  sessions.set(session.id, session);
  return session;
};

const updateSession = async (
  sessionId: string,
  patch: Parameters<AppAdapter["updateSession"]>[1],
): Promise<Session> => {
  const { bgImageUrl, ...rest } = patch;
  const existing = await getSession(sessionId);
  let nextBg = existing.bgImageUrl;
  if (typeof File !== "undefined" && bgImageUrl instanceof File) {
    nextBg = URL.createObjectURL(bgImageUrl);
  } else if (typeof bgImageUrl === "string") {
    nextBg = bgImageUrl;
  }
  const updated: Session = {
    ...existing,
    ...rest,
    bgImageUrl: nextBg,
    updated: now(),
  };
  sessions.set(sessionId, updated);
  return updated;
};

const getPlayer = async (uid: string): Promise<Player | null> => {
  await Promise.resolve();
  if (!uid) return null;
  for (const p of players.values()) {
    if (p.uid === uid) return p;
  }
  return null;
};

const getPlayerById = async (playerId: string): Promise<Player | null> => {
  await Promise.resolve();
  return players.get(playerId) ?? null;
};

const getPlayerByInviteToken = async (
  inviteToken: string,
): Promise<Player | null> => {
  await Promise.resolve();
  for (const p of players.values()) {
    if (p.inviteToken === inviteToken) return p;
  }
  return null;
};

const getPlayerByRecoveryKey = async (
  recoveryKey: string,
): Promise<Player | null> => {
  await Promise.resolve();
  for (const p of players.values()) {
    if (p.recoveryKey === recoveryKey) return p;
  }
  return null;
};

const invitePlayer = async (
  sessionId: string,
  data: { readonly name?: string; readonly jobTitle?: string },
  id?: string,
): Promise<Player> => {
  await Promise.resolve();
  await getSession(sessionId);
  const token = await uniqueInviteToken();
  const today = new Date().toISOString().split("T")[0] ?? "";
  const record = makeRecord();
  const player: Player = {
    ...record,
    id: id ?? record.id,
    sessionId,
    inviteToken: token,
    claimStatus: "invited",
    tutorialComplete: false,
    profileComplete: false,
    name: data.name?.trim() || "New player",
    jobTitle: data.jobTitle?.trim() || "",
    team: "",
    startDate: today,
    location: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    skillsConfident: [],
    skillsDevelop: [],
    languages: [],
  };
  players.set(player.id, player);
  notifySessionPlayer(sessionId, player, "create");
  return player;
};

const updatePlayer = async (
  playerId: string,
  patch: Partial<Omit<Player, keyof PBRecord>>,
): Promise<Player> => {
  await Promise.resolve();
  const existing = players.get(playerId);
  if (!existing) throw new Error(`Player not found: ${playerId}`);
  const updated: Player = { ...existing, ...patch, updated: now() };
  players.set(playerId, updated);
  notifySessionPlayer(updated.sessionId, updated);
  return updated;
};

const listPlayers = async (
  sessionId: string,
): Promise<ReadonlyArray<Player>> => {
  await Promise.resolve();
  return [...players.values()].filter((p) => p.sessionId === sessionId);
};

const listMilestones = async (
  sessionId: string,
  options?: ListMilestonesOptions,
): Promise<ReadonlyArray<Milestone>> => {
  await Promise.resolve();
  return [...milestones.values()]
    .filter((m) =>
      m.sessionId === sessionId &&
      (!options?.playerId || m.playerId === options.playerId)
    )
    .sort((a, b) => a.order - b.order);
};

const createMilestone = async (
  data: Omit<Milestone, keyof PBRecord> & { readonly id?: string },
): Promise<Milestone> => {
  await Promise.resolve();
  const record = makeRecord();
  const ms: Milestone = { ...record, ...data, id: data.id ?? record.id };
  milestones.set(ms.id, ms);
  notifyCollection("milestones", "create", ms);
  return ms;
};

const updateMilestone = async (
  milestoneId: string,
  patch: Partial<Omit<Milestone, keyof PBRecord>>,
): Promise<Milestone> => {
  await Promise.resolve();
  const existing = milestones.get(milestoneId);
  if (!existing) throw new Error(`Milestone not found: ${milestoneId}`);
  const updated: Milestone = { ...existing, ...patch, updated: now() };
  milestones.set(milestoneId, updated);
  notifyCollection("milestones", "update", updated);
  return updated;
};

const deleteMilestone = async (milestoneId: string): Promise<void> => {
  await Promise.resolve();
  const existing = milestones.get(milestoneId);
  milestones.delete(milestoneId);
  if (existing) notifyCollection("milestones", "delete", existing);
  for (const [id, mr] of milestoneResources) {
    if (mr.milestoneId === milestoneId) milestoneResources.delete(id);
  }
};

const listMissions = async (
  sessionId: string,
  options?: ListMissionsOptions,
): Promise<ReadonlyArray<Mission>> => {
  await Promise.resolve();
  return [...missions.values()]
    .filter((m) =>
      m.sessionId === sessionId &&
      (!options?.playerId || m.playerId === options.playerId)
    )
    .sort((a, b) => a.order - b.order);
};

const createMission = async (
  data: Omit<Mission, keyof PBRecord> & { readonly id?: string },
): Promise<Mission> => {
  await Promise.resolve();
  const record = makeRecord();
  const mission: Mission = { ...record, ...data, id: data.id ?? record.id };
  missions.set(mission.id, mission);
  notifyCollection("missions", "create", mission);
  return mission;
};

const updateMission = async (
  missionId: string,
  patch: Partial<Omit<Mission, keyof PBRecord>>,
): Promise<Mission> => {
  await Promise.resolve();
  const existing = missions.get(missionId);
  if (!existing) throw new Error(`Mission not found: ${missionId}`);
  const updated: Mission = { ...existing, ...patch, updated: now() };
  missions.set(missionId, updated);
  notifyCollection("missions", "update", updated);
  return updated;
};

const deleteMission = async (missionId: string): Promise<void> => {
  await Promise.resolve();
  const existing = missions.get(missionId);
  missions.delete(missionId);
  if (existing) notifyCollection("missions", "delete", existing);
  formSchemas.delete(missionId);
};

const getFormSchema = async (missionId: string): Promise<FormSchema | null> => {
  await Promise.resolve();
  return formSchemas.get(missionId) ?? null;
};

const upsertFormSchema = async (
  missionId: string,
  fields: ReadonlyArray<FieldSchema>,
): Promise<FormSchema> => {
  await Promise.resolve();
  const existing = formSchemas.get(missionId);
  const schema: FormSchema = existing
    ? { ...existing, fields, updated: now() }
    : { ...makeRecord(), missionId, fields };
  formSchemas.set(missionId, schema);
  return schema;
};

const upsertProgressEvent = async (
  playerId: string,
  missionId: string,
  patch: Partial<
    Omit<ProgressEvent, keyof PBRecord | "playerId" | "missionId" | "sessionId">
  >,
): Promise<ProgressEvent> => {
  await Promise.resolve();
  const key = `${playerId}::${missionId}`;
  const existing = progressEvents.get(key);
  const player = players.get(playerId);
  const sessionId = player?.sessionId ?? existing?.sessionId ?? "";
  const base: ProgressEvent = existing ?? {
    ...makeRecord(),
    sessionId,
    playerId,
    missionId,
    status: "pending",
  };
  const event: ProgressEvent = { ...base, ...patch, updated: now() };
  progressEvents.set(key, event);
  notify(key, event);
  if (sessionId) notifySessionProgress(sessionId, event);
  if (event.status === "pendingApproval") simulateGmApproval(key);
  return event;
};

const listProgressEvents = async (
  playerId: string,
): Promise<ReadonlyArray<ProgressEvent>> => {
  await Promise.resolve();
  return [...progressEvents.values()].filter((e) => e.playerId === playerId);
};

const subscribeCollection = (
  collection: string,
  filter: string | undefined,
  callback: (action: RealtimeAction, record: unknown) => void,
): () => void => {
  const key = collectionTopicKey(collection, filter);
  let subs = collectionSubscriptions.get(key);
  if (!subs) {
    subs = new Set();
    collectionSubscriptions.set(key, subs);
  }
  subs.add(callback);
  return () => {
    subs?.delete(callback);
    if (subs && subs.size === 0) collectionSubscriptions.delete(key);
  };
};

const subscribeProgressEvent = (
  playerId: string,
  missionId: string,
  callback: (event: ProgressEvent) => void,
): () => void => {
  const key = `${playerId}::${missionId}`;
  let subs = subscriptions.get(key);
  if (!subs) {
    subs = new Set();
    subscriptions.set(key, subs);
  }
  subs.add(callback);
  return () => subs?.delete(callback);
};

const subscribeSessionPlayers = (
  sessionId: string,
  callback: (player: Player) => void,
): () => void => {
  let subs = sessionPlayerSubscriptions.get(sessionId);
  if (!subs) {
    subs = new Set();
    sessionPlayerSubscriptions.set(sessionId, subs);
  }
  subs.add(callback);
  return () => subs?.delete(callback);
};

const subscribeSessionProgressEvents = (
  sessionId: string,
  callback: (event: ProgressEvent) => void,
): () => void => {
  let subs = sessionProgressSubscriptions.get(sessionId);
  if (!subs) {
    subs = new Set();
    sessionProgressSubscriptions.set(sessionId, subs);
  }
  subs.add(callback);
  return () => subs?.delete(callback);
};

const getBuddyProfile = async (
  playerId: string,
): Promise<BuddyProfile | null> => {
  await Promise.resolve();
  return buddyProfiles.get(playerId) ?? null;
};

const listBuddyProfiles = async (
  sessionId: string,
): Promise<ReadonlyArray<BuddyProfile>> => {
  await Promise.resolve();
  return [...buddyProfiles.values()].filter((b) => b.sessionId === sessionId);
};

const upsertBuddyProfile = async (
  playerId: string,
  data: Omit<BuddyProfile, keyof PBRecord | "assignedToPlayerId">,
): Promise<BuddyProfile> => {
  await Promise.resolve();
  const existing = buddyProfiles.get(playerId);
  const profile: BuddyProfile = existing
    ? { ...existing, ...data, assignedToPlayerId: playerId, updated: now() }
    : { ...makeRecord(), ...data, assignedToPlayerId: playerId };
  buddyProfiles.set(playerId, profile);
  return profile;
};

const listLibraryResources = async (): Promise<
  ReadonlyArray<LibraryResource>
> => {
  await Promise.resolve();
  return [...libraryResources.values()];
};

const createLibraryResource = async (
  data: Omit<LibraryResource, keyof PBRecord>,
): Promise<LibraryResource> => {
  await Promise.resolve();
  const resource: LibraryResource = { ...makeRecord(), ...data };
  libraryResources.set(resource.id, resource);
  return resource;
};

const updateLibraryResource = async (
  resourceId: string,
  patch: Partial<Omit<LibraryResource, keyof PBRecord>>,
): Promise<LibraryResource> => {
  await Promise.resolve();
  const existing = libraryResources.get(resourceId);
  if (!existing) throw new Error(`Library resource not found: ${resourceId}`);
  const updated: LibraryResource = { ...existing, ...patch, updated: now() };
  libraryResources.set(resourceId, updated);
  return updated;
};

const deleteLibraryResource = async (resourceId: string): Promise<void> => {
  await Promise.resolve();
  libraryResources.delete(resourceId);
  for (const [id, mr] of milestoneResources) {
    if (mr.libraryResourceId === resourceId) milestoneResources.delete(id);
  }
};

const listMilestoneResources = async (
  playerId: string,
  milestoneId?: string,
): Promise<ReadonlyArray<MilestoneResource>> => {
  await Promise.resolve();
  return [...milestoneResources.values()].filter((mr) =>
    mr.playerId === playerId &&
    (!milestoneId || mr.milestoneId === milestoneId)
  );
};

const attachMilestoneResource = async (
  data: Omit<MilestoneResource, keyof PBRecord>,
): Promise<MilestoneResource> => {
  await Promise.resolve();
  const attachment: MilestoneResource = { ...makeRecord(), ...data };
  milestoneResources.set(attachment.id, attachment);
  return attachment;
};

const updateMilestoneResource = async (
  attachmentId: string,
  patch: Partial<Omit<MilestoneResource, keyof PBRecord>>,
): Promise<MilestoneResource> => {
  await Promise.resolve();
  const existing = milestoneResources.get(attachmentId);
  if (!existing) {
    throw new Error(`Milestone resource not found: ${attachmentId}`);
  }
  const updated: MilestoneResource = { ...existing, ...patch, updated: now() };
  milestoneResources.set(attachmentId, updated);
  return updated;
};

const detachMilestoneResource = async (attachmentId: string): Promise<void> => {
  await Promise.resolve();
  milestoneResources.delete(attachmentId);
};

const listResources = async (
  sessionId: string,
  options?: { readonly playerId?: string; readonly milestoneId?: string },
): Promise<ReadonlyArray<Resource>> => {
  await Promise.resolve();
  return resolveResources(sessionId, options);
};

const listTemplates = async (): Promise<ReadonlyArray<TemplateExport>> => {
  await Promise.resolve();
  return [...templates.values()];
};

const saveTemplate = async (template: TemplateExport): Promise<void> => {
  await Promise.resolve();
  templates.set(template.name, template);
};

const deleteTemplate = async (name: string): Promise<void> => {
  await Promise.resolve();
  templates.delete(name);
};

export const mockAdapter: AppAdapter = {
  getSession,
  getSessionByGmRecoveryKey,
  listSessions,
  createSession,
  updateSession,
  getPlayer,
  getPlayerById,
  getPlayerByInviteToken,
  getPlayerByRecoveryKey,
  invitePlayer,
  updatePlayer,
  listPlayers,
  listMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  listMissions,
  createMission,
  updateMission,
  deleteMission,
  getFormSchema,
  upsertFormSchema,
  upsertProgressEvent,
  listProgressEvents,
  subscribeCollection,
  subscribeProgressEvent,
  subscribeSessionPlayers,
  subscribeSessionProgressEvents,
  getBuddyProfile,
  listBuddyProfiles,
  upsertBuddyProfile,
  listLibraryResources,
  createLibraryResource,
  updateLibraryResource,
  deleteLibraryResource,
  listMilestoneResources,
  attachMilestoneResource,
  updateMilestoneResource,
  detachMilestoneResource,
  listResources,
  listTemplates,
  saveTemplate,
  deleteTemplate,
};

// Bootstrap the demo instance (idempotent) through real adapter calls —
// no more direct Map seeding from hand-authored MOCK_* constants.
await seedDemoInstance(mockAdapter, {
  bgImageUrl: DEFAULT_SESSION_BACKGROUND_URL,
});
