import assert from "node:assert/strict";
import type { AppAdapter } from "../adapters/interface.ts";
import type {
  FieldSchema,
  FormSchema,
  LibraryResource,
  Milestone,
  MilestoneResource,
  Mission,
  PBRecord,
  Player,
  Session,
} from "../types/index.ts";
import { DEFAULT_ONBOARDING_TEMPLATE } from "../constants/defaultOnboardingTemplate.ts";
import { SCRATCH_JOURNEY_TEMPLATE } from "../constants/scratchJourneyTemplate.ts";
import { applyTemplateToNewPlayer } from "./applyTemplateToNewPlayer.ts";

const NOW = new Date().toISOString();
const pb = (id: string) => ({ id, created: NOW, updated: NOW });
const FAKE_BG_IMAGE_URL = "https://example.invalid/map-background.jpg";

const testPlayer = {
  ...pb("player_test"),
  sessionId: "sess_test",
  inviteToken: "invite_test",
  claimStatus: "invited" as const,
  tutorialComplete: false,
  profileComplete: false,
  name: "Test Player",
  jobTitle: "",
  team: "",
  startDate: "",
  location: "",
  timezone: "",
  recoveryKey: "TEST1234",
  languages: [] as const,
  skillsConfident: [] as const,
  skillsDevelop: [] as const,
} satisfies Player;

const testSession: Session = {
  ...pb("sess_test"),
  name: "Test Session",
  bgImageUrl: "",
  mapNodeScale: 0.33,
  gameMakerId: "uid_gm",
  gmRecoveryKey: "TEST1234",
  preBoardingChecks: [],
};

/**
 * Stub adapter covering exactly what importTemplate + the background
 * side-effect need: milestone/mission/schema/resource CRUD, plus
 * getSession/updateSession for the session-level part.
 */
const createStubAdapter = () => {
  const milestones = new Map<string, Milestone>();
  const missions = new Map<string, Mission>();
  const schemas = new Map<string, FormSchema>();
  const attachments = new Map<string, MilestoneResource>();
  let session = testSession;

  let nextId = 1;
  const makeId = () => `gen_${nextId++}`;

  const adapter = {
    getSession: async () => session,
    updateSession: async (_sessionId: string, patch: Partial<Session>) => {
      session = { ...session, ...patch, updated: NOW };
      return session;
    },
    getPlayerById: async (playerId: string) =>
      playerId === testPlayer.id ? testPlayer : null,
    listMilestones: async (
      _sessionId: string,
      options?: { playerId?: string },
    ) =>
      [...milestones.values()].filter((m) =>
        !options?.playerId || m.playerId === options.playerId
      ),
    listMissions: async (_sessionId: string, options?: { playerId?: string }) =>
      [...missions.values()].filter((m) =>
        !options?.playerId || m.playerId === options.playerId
      ),
    listMilestoneResources: async (playerId: string) =>
      [...attachments.values()].filter((a) => a.playerId === playerId),
    deleteMission: async (id: string) => {
      missions.delete(id);
    },
    deleteMilestone: async (id: string) => {
      milestones.delete(id);
    },
    detachMilestoneResource: async (attachmentId: string) => {
      attachments.delete(attachmentId);
    },
    createMilestone: async (
      data: Omit<Milestone, keyof PBRecord> & { readonly id?: string },
    ) => {
      const record = { ...pb(makeId()), ...data, id: data.id ?? makeId() };
      milestones.set(record.id, record);
      return record;
    },
    createMission: async (
      data: Omit<Mission, keyof PBRecord> & { readonly id?: string },
    ) => {
      const record = { ...pb(makeId()), ...data, id: data.id ?? makeId() };
      missions.set(record.id, record);
      return record;
    },
    upsertFormSchema: async (
      missionId: string,
      fields: ReadonlyArray<FieldSchema>,
    ) => {
      const schema = { ...pb(makeId()), missionId, fields };
      schemas.set(missionId, schema);
      return schema;
    },
    getFormSchema: async (missionId: string) => schemas.get(missionId) ?? null,
    listLibraryResources: async (): Promise<
      ReadonlyArray<LibraryResource>
    > => [],
    attachMilestoneResource: async (
      data: Omit<MilestoneResource, keyof PBRecord>,
    ) => {
      const record = { ...pb(makeId()), ...data };
      attachments.set(record.id, record);
      return record;
    },
    getPlayer: async () => testPlayer,
  } as unknown as AppAdapter;

  return { adapter, getSessionState: () => session };
};

Deno.test("applying DEFAULT_ONBOARDING_TEMPLATE with a bg URL sets the session background", async () => {
  const { adapter, getSessionState } = createStubAdapter();

  await applyTemplateToNewPlayer(
    testSession.id,
    testPlayer.id,
    DEFAULT_ONBOARDING_TEMPLATE,
    adapter,
    { defaultTemplateBgImageUrl: FAKE_BG_IMAGE_URL },
  );

  assert.equal(getSessionState().bgImageUrl, FAKE_BG_IMAGE_URL);
});

Deno.test("applying DEFAULT_ONBOARDING_TEMPLATE without a bg URL leaves the session untouched", async () => {
  const { adapter, getSessionState } = createStubAdapter();

  await applyTemplateToNewPlayer(
    testSession.id,
    testPlayer.id,
    DEFAULT_ONBOARDING_TEMPLATE,
    adapter,
  );

  assert.equal(getSessionState().bgImageUrl, "");
});

Deno.test("applying SCRATCH_JOURNEY_TEMPLATE never sets the background, even if a bg URL is given", async () => {
  const { adapter, getSessionState } = createStubAdapter();

  await applyTemplateToNewPlayer(
    testSession.id,
    testPlayer.id,
    SCRATCH_JOURNEY_TEMPLATE,
    adapter,
    { defaultTemplateBgImageUrl: FAKE_BG_IMAGE_URL },
  );

  assert.equal(getSessionState().bgImageUrl, "");
});
