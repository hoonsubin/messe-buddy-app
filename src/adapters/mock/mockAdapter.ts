import type { AppAdapter } from "../interface.ts";
import type {
  BuddyProfile,
  FormSchema,
  Milestone,
  Mission,
  PBRecord,
  Player,
  ProgressEvent,
  Resource,
  Session,
  TemplateExport,
} from "../../types/index.ts";
import type { FieldSchema } from "../../types/index.ts";
import {
  MOCK_BUDDY_PROFILES,
  MOCK_FORM_SCHEMAS,
  MOCK_MILESTONES,
  MOCK_MILESTONES_2,
  MOCK_MISSIONS,
  MOCK_MISSIONS_2,
  MOCK_PLAYERS,
  MOCK_PROGRESS_EVENTS,
  MOCK_PROGRESS_EVENTS_2,
  MOCK_RESOURCES,
  MOCK_SESSION,
  MOCK_SESSION_2,
} from "./mockData.ts";

// ── Storage ───────────────────────────────────────────────────────────────────
// Module-level Maps initialised from seed data.
// Each Map key is the PB record id.

const sessions = new Map<string, Session>();
const players = new Map<string, Player>();
const milestones = new Map<string, Milestone>();
const missions = new Map<string, Mission>();
const formSchemas = new Map<string, FormSchema>(); // keyed by missionId
const progressEvents = new Map<string, ProgressEvent>(); // keyed by `${playerId}::${missionId}`
const buddyProfiles = new Map<string, BuddyProfile>(); // keyed by assignedToPlayerId
const resources = new Map<string, Resource>();
const templates = new Map<string, TemplateExport>();

// Subscriptions: key = `${playerId}::${missionId}`, value = Set of callbacks
type ProgressCallback = (event: ProgressEvent) => void;
const subscriptions = new Map<string, Set<ProgressCallback>>();

// Seeding — runs once at module load.
(() => {
  sessions.set(MOCK_SESSION.id, MOCK_SESSION);
  sessions.set(MOCK_SESSION_2.id, MOCK_SESSION_2);
  for (const m of MOCK_MILESTONES) milestones.set(m.id, m);
  for (const m of MOCK_MILESTONES_2) milestones.set(m.id, m);
  for (const m of MOCK_MISSIONS) missions.set(m.id, m);
  for (const m of MOCK_MISSIONS_2) missions.set(m.id, m);
  for (const s of MOCK_FORM_SCHEMAS) formSchemas.set(s.missionId, s);
  for (const p of MOCK_PLAYERS) players.set(p.id, p);
  for (const b of MOCK_BUDDY_PROFILES) {
    buddyProfiles.set(b.assignedToPlayerId, b);
  }
  for (const e of MOCK_PROGRESS_EVENTS) {
    progressEvents.set(`${e.playerId}::${e.missionId}`, e);
  }
  for (const e of MOCK_PROGRESS_EVENTS_2) {
    progressEvents.set(`${e.playerId}::${e.missionId}`, e);
  }
  for (const r of MOCK_RESOURCES) resources.set(r.id, r);
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeId = (): string => {
  return Math.random().toString(36).slice(2, 17).padEnd(15, "0").slice(0, 15);
};

const now = (): string => {
  return new Date().toISOString();
};

const makeRecord = (): PBRecord => {
  const t = now();
  return { id: makeId(), created: t, updated: t };
};

const notify = (key: string, event: ProgressEvent): void => {
  const subs = subscriptions.get(key);
  if (!subs) return;
  for (const cb of subs) cb(event);
};

// Store the current GM UID so simulateGmApproval uses the active admin.
let currentAdminUid = "uid_gamemaker_peter";

/** Set the admin UID used for simulated approvals. Call from AdminCockpitPage. */
export const setMockAdminUid = (uid: string): void => {
  currentAdminUid = uid;
};

// Simulates Game Maker approval — transitions pendingApproval → completed
// after 4 seconds. Mirrors what the real PB SSE subscription does.
const simulateGmApproval = (
  key: string,
  gmUid?: string,
): void => {
  const effectiveUid = gmUid ?? currentAdminUid;
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
  }, 4000);
};

// ── Session ───────────────────────────────────────────────────────────────────

const getSession = async (sessionId: string): Promise<Session> => {
  await Promise.resolve();
  const s = sessions.get(sessionId);
  if (!s) throw new Error(`Session not found: ${sessionId}`);
  return s;
};

const listSessions = async (): Promise<ReadonlyArray<Session>> => {
  await Promise.resolve();
  return [...sessions.values()];
};

const createSession = async (
  name: string,
  gameMakerUid: string,
): Promise<Session> => {
  await Promise.resolve();
  const session: Session = {
    ...makeRecord(),
    name,
    bgImageUrl: "",
    gameMakerId: gameMakerUid,
    preBoardingChecks: [],
  };
  sessions.set(session.id, session);
  return session;
};

const updateSession = async (
  sessionId: string,
  patch: Partial<Omit<Session, keyof PBRecord>>,
): Promise<Session> => {
  const existing = await getSession(sessionId);
  const updated: Session = { ...existing, ...patch, updated: now() };
  sessions.set(sessionId, updated);
  return updated;
};

// ── Player ────────────────────────────────────────────────────────────────────

const getPlayer = async (uid: string): Promise<Player | null> => {
  await Promise.resolve();
  for (const p of players.values()) {
    if (p.uid === uid) return p;
  }
  return null;
};

const getPlayerById = async (playerId: string): Promise<Player | null> => {
  await Promise.resolve();
  return players.get(playerId) ?? null;
};

const createPlayer = async (
  data: Omit<Player, keyof PBRecord>,
): Promise<Player> => {
  await Promise.resolve();
  const player: Player = { ...makeRecord(), ...data };
  players.set(player.id, player);
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
  return updated;
};

const getPlayerByRecoveryKey = async (
  recoveryKey: string,
  sessionId: string,
): Promise<Player | null> => {
  await Promise.resolve();
  for (const p of players.values()) {
    if (p.recoveryKey === recoveryKey && p.sessionId === sessionId) return p;
  }
  return null;
};

const listPlayers = async (
  sessionId: string,
): Promise<ReadonlyArray<Player>> => {
  await Promise.resolve();
  return [...players.values()].filter((p) => p.sessionId === sessionId);
};

// ── Milestones ────────────────────────────────────────────────────────────────

const listMilestones = async (
  sessionId: string,
): Promise<ReadonlyArray<Milestone>> => {
  await Promise.resolve();
  return [...milestones.values()]
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => a.order - b.order);
};

const createMilestone = async (
  data: Omit<Milestone, keyof PBRecord>,
): Promise<Milestone> => {
  await Promise.resolve();
  const ms: Milestone = { ...makeRecord(), ...data };
  milestones.set(ms.id, ms);
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
  return updated;
};

const deleteMilestone = async (milestoneId: string): Promise<void> => {
  await Promise.resolve();
  milestones.delete(milestoneId);
};

// ── Missions ──────────────────────────────────────────────────────────────────

const listMissions = async (
  sessionId: string,
): Promise<ReadonlyArray<Mission>> => {
  await Promise.resolve();
  return [...missions.values()]
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => a.order - b.order);
};

const createMission = async (
  data: Omit<Mission, keyof PBRecord>,
): Promise<Mission> => {
  await Promise.resolve();
  const mission: Mission = { ...makeRecord(), ...data };
  missions.set(mission.id, mission);
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
  return updated;
};

const deleteMission = async (missionId: string): Promise<void> => {
  await Promise.resolve();
  missions.delete(missionId);
};

// ── Form Schema ───────────────────────────────────────────────────────────────

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

// ── Progress Events ───────────────────────────────────────────────────────────
// C-05, C-14: upsertProgressEvent is the single write path.

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

  // Need sessionId — derive from the player record.
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

  // Auto-simulate GM approval for pendingApproval events.
  if (event.status === "pendingApproval") {
    simulateGmApproval(key);
  }

  return event;
};

const listProgressEvents = async (
  playerId: string,
): Promise<ReadonlyArray<ProgressEvent>> => {
  await Promise.resolve();
  return [...progressEvents.values()].filter((e) => e.playerId === playerId);
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

// ── Buddy Profile ─────────────────────────────────────────────────────────────

const getBuddyProfile = async (
  playerId: string,
): Promise<BuddyProfile | null> => {
  await Promise.resolve();
  return buddyProfiles.get(playerId) ?? null;
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

// ── Resources ─────────────────────────────────────────────────────────────────

const listResources = async (
  sessionId: string,
): Promise<ReadonlyArray<Resource>> => {
  await Promise.resolve();
  return [...resources.values()].filter((r) => r.sessionId === sessionId);
};

const createResource = async (
  data: Omit<Resource, keyof PBRecord>,
): Promise<Resource> => {
  await Promise.resolve();
  const resource: Resource = { ...makeRecord(), ...data };
  resources.set(resource.id, resource);
  return resource;
};

const updateResource = async (
  resourceId: string,
  patch: Partial<Omit<Resource, keyof PBRecord>>,
): Promise<Resource> => {
  await Promise.resolve();
  const existing = resources.get(resourceId);
  if (!existing) throw new Error(`Resource not found: ${resourceId}`);
  const updated: Resource = { ...existing, ...patch, updated: now() };
  resources.set(resourceId, updated);
  return updated;
};

const deleteResource = async (resourceId: string): Promise<void> => {
  await Promise.resolve();
  resources.delete(resourceId);
};

// ── Templates ─────────────────────────────────────────────────────────────────

const listTemplates = async (): Promise<ReadonlyArray<TemplateExport>> => {
  await Promise.resolve();
  return [...templates.values()];
};

const saveTemplate = async (template: TemplateExport): Promise<void> => {
  await Promise.resolve();
  templates.set(template.name, template);
};

// ── Export ────────────────────────────────────────────────────────────────────

export const mockAdapter: AppAdapter = {
  getSession,
  listSessions,
  createSession,
  updateSession,
  getPlayer,
  getPlayerById,
  createPlayer,
  updatePlayer,
  getPlayerByRecoveryKey,
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
  subscribeProgressEvent,
  getBuddyProfile,
  upsertBuddyProfile,
  listResources,
  createResource,
  updateResource,
  deleteResource,
  listTemplates,
  saveTemplate,
};
