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
} from "../types/index.ts";
import { MISSION_TAG } from "../types/unions.ts";
import { DEFAULT_ONBOARDING_TEMPLATE } from "../constants/defaultOnboardingTemplate.ts";
import { SCRATCH_JOURNEY_TEMPLATE } from "../constants/scratchJourneyTemplate.ts";
import { applyTemplateIfBlank } from "./applyTemplateIfBlank.ts";

const NOW = new Date().toISOString();
const pb = (id: string) => ({ id, created: NOW, updated: NOW });

// Mirrors the resourceKeys actually referenced by DEFAULT_ONBOARDING_TEMPLATE
// (campus_map, wenet, it_help, welcome_video, absence, org_chart, benefits).
// A stand-in for the shared resource library so attachMilestoneResource has
// real ids to resolve resourceKey -> libraryResourceId against.
const FIXTURE_LIBRARY_RESOURCES: ReadonlyArray<LibraryResource> = [
  "campus_map",
  "wenet",
  "it_help",
  "welcome_video",
  "absence",
  "org_chart",
  "benefits",
].map((resourceKey) => ({
  ...pb(`lib_${resourceKey}`),
  resourceKey,
  title: resourceKey,
  type: "link",
  url: `https://example.test/${resourceKey}`,
}));

const createStubAdapter = (player: Player) => {
  const milestones = new Map<string, Milestone>();
  const missions = new Map<string, Mission>();
  const schemas = new Map<string, FormSchema>();
  const attachments = new Map<string, MilestoneResource>();

  let nextId = 1;
  const makeId = () => `gen_${nextId++}`;

  const adapter = {
    getPlayerById: async (playerId: string) =>
      playerId === player.id ? player : null,
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
    listLibraryResources: async () => FIXTURE_LIBRARY_RESOURCES,
    attachMilestoneResource: async (
      data: Omit<MilestoneResource, keyof PBRecord>,
    ) => {
      const record = { ...pb(makeId()), ...data };
      attachments.set(record.id, record);
      return record;
    },
    getPlayer: async () => player,
  } as unknown as AppAdapter;

  return { adapter, milestones, missions, schemas, attachments };
};

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

Deno.test("applyTemplateIfBlank seeds milestone, profile mission, and schema (DEFAULT_ONBOARDING_TEMPLATE)", async () => {
  const { adapter, milestones, missions, schemas, attachments } =
    createStubAdapter(testPlayer);

  await applyTemplateIfBlank(
    testPlayer.sessionId,
    testPlayer.id,
    DEFAULT_ONBOARDING_TEMPLATE,
    adapter,
  );

  assert.equal(milestones.size, 6);
  const firstMilestone = [...milestones.values()].find((m) => m.order === 0);
  assert.equal(firstMilestone?.name, "Arrive & Get Set Up");

  assert.equal(missions.size, 33);
  const profileMission = [...missions.values()].find((m) =>
    m.tags.includes(MISSION_TAG.ONBOARDING_PROFILE)
  );
  assert.equal(profileMission?.title, "Complete Your Profile");
  assert.equal(profileMission?.isInCurrentMissions, true);
  assert.ok(schemas.has(profileMission!.id));
  // Regression check for the order-collision bug: every milestone's first
  // mission used to share order:0, which broke form-schema linkage once more
  // than one milestone existed. Confirm the schema landed on the actual
  // profile mission, not on some other milestone's first mission.
  assert.equal(schemas.get(profileMission!.id)?.fields.length, 11);

  // Resource bindings: 8 attachments total (5 on M1, 1 each on M3/M4/M5),
  // covering all 7 library resourceKeys the template references, each
  // resolved to a real libraryResourceId and pointed at the right milestone.
  assert.equal(attachments.size, 8);
  const libById = new Map(
    FIXTURE_LIBRARY_RESOURCES.map((r) => [r.id, r.resourceKey]),
  );
  const keysUsed = new Set(
    [...attachments.values()].map((a) => libById.get(a.libraryResourceId)),
  );
  assert.equal(keysUsed.size, 7);
  assert.ok(
    !keysUsed.has(undefined),
    "every attachment resolved to a real library resource",
  );

  const arriveMilestone = firstMilestone!;
  const arriveKeys = [...attachments.values()]
    .filter((a) => a.milestoneId === arriveMilestone.id)
    .map((a) => libById.get(a.libraryResourceId));
  assert.deepEqual(
    new Set(arriveKeys),
    new Set(["campus_map", "wenet", "it_help", "welcome_video", "absence"]),
  );

  const cultureMilestone = [...milestones.values()].find((m) =>
    m.name === "Culture & Benefits"
  );
  const cultureKeys = [...attachments.values()]
    .filter((a) => a.milestoneId === cultureMilestone!.id)
    .map((a) => libById.get(a.libraryResourceId));
  assert.deepEqual(cultureKeys, ["benefits"]);
});

Deno.test("applyTemplateIfBlank is idempotent (DEFAULT_ONBOARDING_TEMPLATE)", async () => {
  const { adapter, milestones, attachments } = createStubAdapter(testPlayer);

  await applyTemplateIfBlank(
    testPlayer.sessionId,
    testPlayer.id,
    DEFAULT_ONBOARDING_TEMPLATE,
    adapter,
  );
  const firstId = [...milestones.values()][0]?.id;

  await applyTemplateIfBlank(
    testPlayer.sessionId,
    testPlayer.id,
    DEFAULT_ONBOARDING_TEMPLATE,
    adapter,
  );
  const secondId = [...milestones.values()][0]?.id;

  assert.equal(milestones.size, 6);
  assert.equal(secondId, firstId);
  // Bails when the player already has milestones, so a genuine re-import
  // is exercised via applyTemplateToNewPlayer directly instead.
  assert.equal(attachments.size, 8);
});

// Same function, different template — this is the point of the
// consolidation: applyDefaultOnboardingJourney.ts and applyScratchJourney.ts
// used to be two copy-pasted files differing only in which constant they
// imported. One parameterized guard covering both proves that's all they
// ever were.
Deno.test("applyTemplateIfBlank seeds exactly one milestone with the profile mission (SCRATCH_JOURNEY_TEMPLATE)", async () => {
  const { adapter, milestones, missions, schemas } = createStubAdapter(
    testPlayer,
  );

  await applyTemplateIfBlank(
    testPlayer.sessionId,
    testPlayer.id,
    SCRATCH_JOURNEY_TEMPLATE,
    adapter,
  );

  assert.equal(milestones.size, 1);
  const [milestone] = [...milestones.values()];
  assert.equal(milestone?.name, "Get Started");
  assert.equal(milestone?.order, 0);

  assert.equal(missions.size, 1);
  const [mission] = [...missions.values()];
  assert.equal(mission?.title, "Complete Your Profile");
  assert.equal(mission?.milestoneId, milestone?.id);
  assert.ok(mission?.tags.includes(MISSION_TAG.ONBOARDING_PROFILE));
  assert.ok(schemas.has(mission!.id));
});

Deno.test("applyTemplateIfBlank is idempotent (SCRATCH_JOURNEY_TEMPLATE)", async () => {
  const { adapter, milestones, missions } = createStubAdapter(testPlayer);

  await applyTemplateIfBlank(
    testPlayer.sessionId,
    testPlayer.id,
    SCRATCH_JOURNEY_TEMPLATE,
    adapter,
  );
  const firstId = [...milestones.values()][0]?.id;

  await applyTemplateIfBlank(
    testPlayer.sessionId,
    testPlayer.id,
    SCRATCH_JOURNEY_TEMPLATE,
    adapter,
  );
  const secondId = [...milestones.values()][0]?.id;

  assert.equal(milestones.size, 1);
  assert.equal(missions.size, 1);
  assert.equal(secondId, firstId);
});
