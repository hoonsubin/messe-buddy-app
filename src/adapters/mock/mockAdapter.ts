import type { AppAdapter } from "../interface.ts";
import type {
  Session,
  Player,
  BuddyProfile,
  Milestone,
  Mission,
  FormSchema,
  ProgressEvent,
  Resource,
  PBRecord,
} from "../../types/index.ts";
import type { FieldSchema } from "../../types/index.ts";
import {
  MOCK_SESSION,
  MOCK_MILESTONES,
  MOCK_MISSIONS,
  MOCK_FORM_SCHEMAS,
  MOCK_PLAYERS,
  MOCK_BUDDY_PROFILES,
  MOCK_PROGRESS_EVENTS,
  MOCK_RESOURCES,
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

// Subscriptions: key = `${playerId}::${missionId}`, value = Set of callbacks
type ProgressCallback = (event: ProgressEvent) => void;
const subscriptions = new Map<string, Set<ProgressCallback>>();

// Seeding — runs once at module load.
(function seed() {
  sessions.set(MOCK_SESSION.id, MOCK_SESSION);
  for (const m of MOCK_MILESTONES) milestones.set(m.id, m);
  for (const m of MOCK_MISSIONS) missions.set(m.id, m);
  for (const s of MOCK_FORM_SCHEMAS) formSchemas.set(s.missionId, s);
  for (const p of MOCK_PLAYERS) players.set(p.id, p);
  for (const b of MOCK_BUDDY_PROFILES) buddyProfiles.set(b.assignedToPlayerId, b);
  for (const e of MOCK_PROGRESS_EVENTS) {
    progressEvents.set(`${e.playerId}::${e.missionId}`, e);
  }
  for (const r of MOCK_RESOURCES) resources.set(r.id, r);
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId(): string {
  return Math.random().toString(36).slice(2, 17).padEnd(15, "0").slice(0, 15);
}

function now(): string {
  return new Date().toISOString();
}

function makeRecord(): PBRecord {
  const t = now();
  return { id: makeId(), created: t, updated: t };
}

function notify(key: string, event: ProgressEvent): void {
  const subs = subscriptions.get(key);
  if (!subs) return;
  for (const cb of subs) cb(event);
}

// Simulates Game Maker approval — transitions pendingApproval → completed
// after 4 seconds. Mirrors what the real PB SSE subscription does.
function simulateGmApproval(key: string, gmUid = "uid_gamemaker_peter"): void {
  setTimeout(() => {
    const existing = progressEvents.get(key);
    if (!existing || existing.status !== "pendingApproval") return;

    const approved: ProgressEvent = {
      ...existing,
      status: "completed",
      validatedBy: gmUid,
      validatedAt: now(),
      updated: now(),
    };
    progressEvents.set(key, approved);
    notify(key, approved);
  }, 4000);
}

// ── Session ───────────────────────────────────────────────────────────────────

async function getSession(sessionId: string): Promise<Session> {
  const s = sessions.get(sessionId);
  if (!s) throw new Error(`Session not found: ${sessionId}`);
  return s;
}

async function createSession(
  name: string,
  gameMakerUid: string
): Promise<Session> {
  const session: Session = {
    ...makeRecord(),
    name,
    bgImageUrl: "",
    gameMakerId: gameMakerUid,
  };
  sessions.set(session.id, session);
  return session;
}

async function updateSession(
  sessionId: string,
  patch: Partial<Omit<Session, keyof PBRecord>>
): Promise<Session> {
  const existing = await getSession(sessionId);
  const updated: Session = { ...existing, ...patch, updated: now() };
  sessions.set(sessionId, updated);
  return updated;
}

// ── Player ────────────────────────────────────────────────────────────────────

async function getPlayer(uid: string): Promise<Player | null> {
  for (const p of players.values()) {
    if (p.uid === uid) return p;
  }
  return null;
}

async function getPlayerById(playerId: string): Promise<Player | null> {
  return players.get(playerId) ?? null;
}

async function createPlayer(
  data: Omit<Player, keyof PBRecord>
): Promise<Player> {
  const player: Player = { ...makeRecord(), ...data };
  players.set(player.id, player);
  return player;
}

async function updatePlayer(
  playerId: string,
  patch: Partial<Omit<Player, keyof PBRecord>>
): Promise<Player> {
  const existing = players.get(playerId);
  if (!existing) throw new Error(`Player not found: ${playerId}`);
  const updated: Player = { ...existing, ...patch, updated: now() };
  players.set(playerId, updated);
  return updated;
}

async function getPlayerByRecoveryKey(
  recoveryKey: string,
  sessionId: string
): Promise<Player | null> {
  for (const p of players.values()) {
    if (p.recoveryKey === recoveryKey && p.sessionId === sessionId) return p;
  }
  return null;
}

async function listPlayers(sessionId: string): Promise<ReadonlyArray<Player>> {
  return [...players.values()].filter((p) => p.sessionId === sessionId);
}

// ── Milestones ────────────────────────────────────────────────────────────────

async function listMilestones(
  sessionId: string
): Promise<ReadonlyArray<Milestone>> {
  return [...milestones.values()]
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => a.order - b.order);
}

async function createMilestone(
  data: Omit<Milestone, keyof PBRecord>
): Promise<Milestone> {
  const ms: Milestone = { ...makeRecord(), ...data };
  milestones.set(ms.id, ms);
  return ms;
}

async function updateMilestone(
  milestoneId: string,
  patch: Partial<Omit<Milestone, keyof PBRecord>>
): Promise<Milestone> {
  const existing = milestones.get(milestoneId);
  if (!existing) throw new Error(`Milestone not found: ${milestoneId}`);
  const updated: Milestone = { ...existing, ...patch, updated: now() };
  milestones.set(milestoneId, updated);
  return updated;
}

async function deleteMilestone(milestoneId: string): Promise<void> {
  milestones.delete(milestoneId);
}

// ── Missions ──────────────────────────────────────────────────────────────────

async function listMissions(
  sessionId: string
): Promise<ReadonlyArray<Mission>> {
  return [...missions.values()]
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => a.order - b.order);
}

async function createMission(
  data: Omit<Mission, keyof PBRecord>
): Promise<Mission> {
  const mission: Mission = { ...makeRecord(), ...data };
  missions.set(mission.id, mission);
  return mission;
}

async function updateMission(
  missionId: string,
  patch: Partial<Omit<Mission, keyof PBRecord>>
): Promise<Mission> {
  const existing = missions.get(missionId);
  if (!existing) throw new Error(`Mission not found: ${missionId}`);
  const updated: Mission = { ...existing, ...patch, updated: now() };
  missions.set(missionId, updated);
  return updated;
}

async function deleteMission(missionId: string): Promise<void> {
  missions.delete(missionId);
}

// ── Form Schema ───────────────────────────────────────────────────────────────

async function getFormSchema(missionId: string): Promise<FormSchema | null> {
  return formSchemas.get(missionId) ?? null;
}

async function upsertFormSchema(
  missionId: string,
  fields: ReadonlyArray<FieldSchema>
): Promise<FormSchema> {
  const existing = formSchemas.get(missionId);
  const schema: FormSchema = existing
    ? { ...existing, fields, updated: now() }
    : { ...makeRecord(), missionId, fields };
  formSchemas.set(missionId, schema);
  return schema;
}

// ── Progress Events ───────────────────────────────────────────────────────────
// C-05, C-14: upsertProgressEvent is the single write path.

async function upsertProgressEvent(
  playerId: string,
  missionId: string,
  patch: Partial<Omit<ProgressEvent, keyof PBRecord | "playerId" | "missionId">>
): Promise<ProgressEvent> {
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
}

async function listProgressEvents(
  playerId: string
): Promise<ReadonlyArray<ProgressEvent>> {
  return [...progressEvents.values()].filter((e) => e.playerId === playerId);
}

function subscribeProgressEvent(
  playerId: string,
  missionId: string,
  callback: (event: ProgressEvent) => void
): () => void {
  const key = `${playerId}::${missionId}`;
  let subs = subscriptions.get(key);
  if (!subs) {
    subs = new Set();
    subscriptions.set(key, subs);
  }
  subs.add(callback);
  return () => subs?.delete(callback);
}

// ── Buddy Profile ─────────────────────────────────────────────────────────────

async function getBuddyProfile(
  playerId: string
): Promise<BuddyProfile | null> {
  return buddyProfiles.get(playerId) ?? null;
}

async function upsertBuddyProfile(
  playerId: string,
  data: Omit<BuddyProfile, keyof PBRecord>
): Promise<BuddyProfile> {
  const existing = buddyProfiles.get(playerId);
  const profile: BuddyProfile = existing
    ? { ...existing, ...data, updated: now() }
    : { ...makeRecord(), ...data };
  buddyProfiles.set(playerId, profile);
  return profile;
}

// ── Resources ─────────────────────────────────────────────────────────────────

async function listResources(
  sessionId: string
): Promise<ReadonlyArray<Resource>> {
  return [...resources.values()].filter((r) => r.sessionId === sessionId);
}

async function createResource(
  data: Omit<Resource, keyof PBRecord>
): Promise<Resource> {
  const resource: Resource = { ...makeRecord(), ...data };
  resources.set(resource.id, resource);
  return resource;
}

async function updateResource(
  resourceId: string,
  patch: Partial<Omit<Resource, keyof PBRecord>>
): Promise<Resource> {
  const existing = resources.get(resourceId);
  if (!existing) throw new Error(`Resource not found: ${resourceId}`);
  const updated: Resource = { ...existing, ...patch, updated: now() };
  resources.set(resourceId, updated);
  return updated;
}

async function deleteResource(resourceId: string): Promise<void> {
  resources.delete(resourceId);
}

// ── Export ────────────────────────────────────────────────────────────────────

export const mockAdapter: AppAdapter = {
  getSession,
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
};
