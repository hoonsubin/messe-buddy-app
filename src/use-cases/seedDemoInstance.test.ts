import assert from "node:assert/strict";
import type { AppAdapter, ListMissionsOptions } from "../adapters/interface.ts";
import type {
  BuddyProfile,
  LibraryResource,
  Milestone,
  MilestoneResource,
  Mission,
  Player,
  ProgressEvent,
  Session,
  TemplateExport,
} from "../types/index.ts";
import {
  DEMO_GM_UID,
  DEMO_PERSONAS,
  DEMO_SESSION_ID,
} from "../constants/demoInstance.ts";
import { seedDemoInstance } from "./seedDemoInstance.ts";

/**
 * Minimal in-memory AppAdapter, self-contained per call (unlike the real
 * mockAdapter singleton) so each test starts from a clean slate. Mirrors the
 * relevant parts of mockAdapter.ts's behavior closely enough to exercise
 * seedDemoInstance's full call chain (createSession -> invitePlayer ->
 * applyTemplateIfBlank -> upsertProgressEvent -> upsertBuddyProfile).
 */
const createFakeAdapter = () => {
  const sessions = new Map<string, Session>();
  const players = new Map<string, Player>();
  const milestones = new Map<string, Milestone>();
  const missions = new Map<string, Mission>();
  const progressEvents = new Map<string, ProgressEvent>();
  const buddyProfiles = new Map<string, BuddyProfile>();
  const libraryResources = new Map<string, LibraryResource>();
  const milestoneResources = new Map<string, MilestoneResource>();
  const templates = new Map<string, TemplateExport>();

  let nextId = 1;
  const makeId = () => `gen_${nextId++}`;
  const now = () => "2026-07-06T00:00:00.000Z";
  const record = () => ({ id: makeId(), created: now(), updated: now() });

  const adapter: AppAdapter = {
    getSession: async (sessionId) => {
      const s = sessions.get(sessionId);
      if (!s) throw new Error(`Session not found: ${sessionId}`);
      return s;
    },
    getSessionByGmRecoveryKey: async () => null,
    listSessions: async () => [...sessions.values()],
    createSession: async (name, gameMakerUid, gmRecoveryKey, id) => {
      const r = record();
      const sessionId = id ?? r.id;
      const session: Session = {
        ...r,
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
    },
    updateSession: async (sessionId, patch) => {
      const existing = sessions.get(sessionId);
      if (!existing) throw new Error(`Session not found: ${sessionId}`);
      const { bgImageUrl, ...rest } = patch;
      const updated: Session = {
        ...existing,
        ...rest,
        bgImageUrl: typeof bgImageUrl === "string"
          ? bgImageUrl
          : existing.bgImageUrl,
        updated: now(),
      };
      sessions.set(sessionId, updated);
      return updated;
    },
    getPlayer: async (uid) => {
      for (const p of players.values()) if (p.uid === uid) return p;
      return null;
    },
    getPlayerById: async (playerId) => players.get(playerId) ?? null,
    getPlayerByInviteToken: async () => null,
    getPlayerByRecoveryKey: async () => null,
    invitePlayer: async (sessionId, data, id) => {
      const r = record();
      const player: Player = {
        ...r,
        id: id ?? r.id,
        sessionId,
        inviteToken: makeId(),
        claimStatus: "invited",
        tutorialComplete: false,
        profileComplete: false,
        name: data.name?.trim() || "New player",
        jobTitle: data.jobTitle?.trim() || "",
        team: "",
        startDate: "",
        location: "",
        timezone: "Europe/Berlin",
        skillsConfident: [],
        skillsDevelop: [],
        languages: [],
      };
      players.set(player.id, player);
      return player;
    },
    updatePlayer: async (playerId, patch) => {
      const existing = players.get(playerId);
      if (!existing) throw new Error(`Player not found: ${playerId}`);
      const updated: Player = { ...existing, ...patch, updated: now() };
      players.set(playerId, updated);
      return updated;
    },
    listPlayers: async (sessionId) =>
      [...players.values()].filter((p) => p.sessionId === sessionId),
    listMilestones: async (sessionId, options) =>
      [...milestones.values()]
        .filter((m) =>
          m.sessionId === sessionId &&
          (!options?.playerId || m.playerId === options.playerId)
        )
        .sort((a, b) => a.order - b.order),
    createMilestone: async (data) => {
      const r = record();
      const ms: Milestone = { ...r, ...data, id: data.id ?? r.id };
      milestones.set(ms.id, ms);
      return ms;
    },
    updateMilestone: async (milestoneId, patch) => {
      const existing = milestones.get(milestoneId);
      if (!existing) throw new Error(`Milestone not found: ${milestoneId}`);
      const updated = { ...existing, ...patch, updated: now() };
      milestones.set(milestoneId, updated);
      return updated;
    },
    deleteMilestone: async (milestoneId) => {
      milestones.delete(milestoneId);
    },
    listMissions: async (sessionId, options: ListMissionsOptions = {}) =>
      [...missions.values()]
        .filter((m) =>
          m.sessionId === sessionId &&
          (!options.playerId || m.playerId === options.playerId)
        )
        .sort((a, b) => a.order - b.order),
    createMission: async (data) => {
      const r = record();
      const mission: Mission = { ...r, ...data, id: data.id ?? r.id };
      missions.set(mission.id, mission);
      return mission;
    },
    updateMission: async (missionId, patch) => {
      const existing = missions.get(missionId);
      if (!existing) throw new Error(`Mission not found: ${missionId}`);
      const updated = { ...existing, ...patch, updated: now() };
      missions.set(missionId, updated);
      return updated;
    },
    deleteMission: async (missionId) => {
      missions.delete(missionId);
    },
    getFormSchema: async () => null,
    upsertFormSchema: async (missionId, fields) => ({
      ...record(),
      missionId,
      fields,
    }),
    upsertProgressEvent: async (playerId, missionId, patch) => {
      const key = `${playerId}::${missionId}`;
      const player = players.get(playerId);
      const existing = progressEvents.get(key);
      const base: ProgressEvent = existing ?? {
        ...record(),
        sessionId: player?.sessionId ?? "",
        playerId,
        missionId,
        status: "pending",
      };
      const event: ProgressEvent = { ...base, ...patch, updated: now() };
      progressEvents.set(key, event);
      return event;
    },
    listProgressEvents: async (playerId) =>
      [...progressEvents.values()].filter((e) => e.playerId === playerId),
    subscribeCollection: () => () => {},
    getBuddyProfile: async (playerId) => buddyProfiles.get(playerId) ?? null,
    listBuddyProfiles: async (sessionId) =>
      [...buddyProfiles.values()].filter((b) => b.sessionId === sessionId),
    upsertBuddyProfile: async (playerId, data) => {
      const existing = buddyProfiles.get(playerId);
      const profile: BuddyProfile = existing
        ? { ...existing, ...data, assignedToPlayerId: playerId, updated: now() }
        : { ...record(), ...data, assignedToPlayerId: playerId };
      buddyProfiles.set(playerId, profile);
      return profile;
    },
    listLibraryResources: async () => [...libraryResources.values()],
    createLibraryResource: async (data) => {
      const resource: LibraryResource = { ...record(), ...data };
      libraryResources.set(resource.id, resource);
      return resource;
    },
    updateLibraryResource: async (resourceId, patch) => {
      const existing = libraryResources.get(resourceId);
      if (!existing) {
        throw new Error(`Library resource not found: ${resourceId}`);
      }
      const updated = { ...existing, ...patch, updated: now() };
      libraryResources.set(resourceId, updated);
      return updated;
    },
    deleteLibraryResource: async (resourceId) => {
      libraryResources.delete(resourceId);
    },
    listMilestoneResources: async (playerId, milestoneId) =>
      [...milestoneResources.values()].filter((mr) =>
        mr.playerId === playerId &&
        (!milestoneId || mr.milestoneId === milestoneId)
      ),
    attachMilestoneResource: async (data) => {
      const attachment: MilestoneResource = { ...record(), ...data };
      milestoneResources.set(attachment.id, attachment);
      return attachment;
    },
    updateMilestoneResource: async (attachmentId, patch) => {
      const existing = milestoneResources.get(attachmentId);
      if (!existing) {
        throw new Error(`Milestone resource not found: ${attachmentId}`);
      }
      const updated = { ...existing, ...patch, updated: now() };
      milestoneResources.set(attachmentId, updated);
      return updated;
    },
    detachMilestoneResource: async (attachmentId) => {
      milestoneResources.delete(attachmentId);
    },
    listResources: async () => [],
    listTemplates: async () => [...templates.values()],
    saveTemplate: async (template) => {
      templates.set(template.name, template);
    },
    deleteTemplate: async (name) => {
      templates.delete(name);
    },
  };

  return {
    adapter,
    sessions,
    players,
    missions,
    progressEvents,
    buddyProfiles,
    templates,
  };
};

const FAKE_BG_IMAGE_URL = "https://example.invalid/map-background.jpg";

Deno.test("seedDemoInstance reproduces the demo session, players, and progress", async () => {
  const {
    adapter,
    sessions,
    players,
    progressEvents,
    buddyProfiles,
    templates,
  } = createFakeAdapter();

  await seedDemoInstance(adapter, { bgImageUrl: FAKE_BG_IMAGE_URL });

  // The bundled template is registered and selectable from the GM wizard.
  assert.equal(templates.size, 1);
  assert.ok(templates.has("Messe München Onboarding"));

  assert.equal(sessions.get(DEMO_SESSION_ID)?.bgImageUrl, FAKE_BG_IMAGE_URL);

  assert.equal(sessions.size, 1);
  assert.ok(sessions.has(DEMO_SESSION_ID));
  assert.equal(sessions.get(DEMO_SESSION_ID)?.gameMakerId, DEMO_GM_UID);

  assert.equal(players.size, DEMO_PERSONAS.length);
  const sofia = players.get("player_sofia");
  const alex = players.get("player_alex");
  assert.equal(sofia?.claimStatus, "claimed");
  assert.equal(sofia?.uid, "uid_sofia_002");
  assert.equal(alex?.claimStatus, "invited");
  assert.equal(alex?.uid, undefined);

  // Sofia's 3 pre-completed missions.
  const sofiaCompleted = [...progressEvents.values()].filter((e) =>
    e.playerId === "player_sofia" && e.status === "completed"
  );
  assert.equal(sofiaCompleted.length, 3);
  assert.equal(sofia?.profileComplete, true);
  assert.equal(sofia?.tutorialComplete, true);

  // Alex has no progress yet.
  const alexCompleted = [...progressEvents.values()].filter((e) =>
    e.playerId === "player_alex"
  );
  assert.equal(alexCompleted.length, 0);
  assert.equal(alex?.profileComplete, false);

  // Both personas have a buddy assigned.
  assert.equal(buddyProfiles.size, 2);
  assert.equal(buddyProfiles.get("player_sofia")?.name, "Lena Hoffmann");
  assert.equal(buddyProfiles.get("player_alex")?.name, "Marcus Weber");
});

Deno.test("seedDemoInstance is idempotent", async () => {
  const {
    adapter,
    sessions,
    players,
    progressEvents,
    buddyProfiles,
    templates,
  } = createFakeAdapter();

  await seedDemoInstance(adapter, { bgImageUrl: FAKE_BG_IMAGE_URL });
  await seedDemoInstance(adapter, { bgImageUrl: FAKE_BG_IMAGE_URL });

  assert.equal(sessions.size, 1);
  assert.equal(players.size, DEMO_PERSONAS.length);
  const sofiaCompleted = [...progressEvents.values()].filter((e) =>
    e.playerId === "player_sofia" && e.status === "completed"
  );
  assert.equal(sofiaCompleted.length, 3);
  assert.equal(buddyProfiles.size, 2);
  assert.equal(templates.size, 1);
  assert.equal(sessions.get(DEMO_SESSION_ID)?.bgImageUrl, FAKE_BG_IMAGE_URL);
});

Deno.test("seedDemoInstance re-registers the template even if the session already exists", async () => {
  const { adapter, templates } = createFakeAdapter();

  await seedDemoInstance(adapter);
  templates.delete("Messe München Onboarding"); // simulate a stale/pre-rename instance

  await seedDemoInstance(adapter);

  assert.ok(templates.has("Messe München Onboarding"));
});
