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
import { applyScratchJourney } from "./applyScratchJourney.ts";

const NOW = new Date().toISOString();
const pb = (id: string) => ({ id, created: NOW, updated: NOW });

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
    listLibraryResources: async (): Promise<ReadonlyArray<LibraryResource>> =>
      [],
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

Deno.test("applyScratchJourney seeds exactly one milestone with the profile mission", async () => {
  const { adapter, milestones, missions, schemas } = createStubAdapter(
    testPlayer,
  );

  await applyScratchJourney(testPlayer.id, adapter);

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

Deno.test("applyScratchJourney is idempotent", async () => {
  const { adapter, milestones, missions } = createStubAdapter(testPlayer);

  await applyScratchJourney(testPlayer.id, adapter);
  const firstId = [...milestones.values()][0]?.id;

  await applyScratchJourney(testPlayer.id, adapter);
  const secondId = [...milestones.values()][0]?.id;

  assert.equal(milestones.size, 1);
  assert.equal(missions.size, 1);
  assert.equal(secondId, firstId);
});
