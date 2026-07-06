import assert from "node:assert/strict";
import type { AppAdapter } from "../adapters/interface.ts";
import type {
  FieldSchema,
  FormSchema,
  Milestone,
  Mission,
  PBRecord,
  Player,
} from "../types/index.ts";
import { MISSION_TAG } from "../types/unions.ts";
import { applyDefaultOnboardingJourney } from "./applyDefaultOnboardingJourney.ts";

const NOW = new Date().toISOString();
const pb = (id: string) => ({ id, created: NOW, updated: NOW });

const createStubAdapter = (player: Player) => {
  const milestones = new Map<string, Milestone>();
  const missions = new Map<string, Mission>();
  const schemas = new Map<string, FormSchema>();

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
    listMilestoneResources: async () => [],
    deleteMission: async (id: string) => {
      missions.delete(id);
    },
    deleteMilestone: async (id: string) => {
      milestones.delete(id);
    },
    detachMilestoneResource: async () => {},
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
    listLibraryResources: async () => [],
    getPlayer: async () => player,
  } as unknown as AppAdapter;

  return { adapter, milestones, missions, schemas };
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

Deno.test("applyDefaultOnboardingJourney seeds milestone, profile mission, and schema", async () => {
  const { adapter, milestones, missions, schemas } = createStubAdapter(
    testPlayer,
  );

  await applyDefaultOnboardingJourney(testPlayer.id, adapter);

  assert.equal(milestones.size, 1);
  const milestone = [...milestones.values()][0];
  assert.equal(milestone?.name, "Arrive & Get Set Up");

  assert.equal(missions.size, 1);
  const mission = [...missions.values()][0];
  assert.equal(mission?.title, "Complete Your Profile");
  assert.equal(mission?.tags.includes(MISSION_TAG.ONBOARDING_PROFILE), true);
  assert.equal(mission?.isInCurrentMissions, true);
  assert.ok(schemas.has(mission!.id));
});

Deno.test("applyDefaultOnboardingJourney is idempotent", async () => {
  const { adapter, milestones } = createStubAdapter(testPlayer);

  await applyDefaultOnboardingJourney(testPlayer.id, adapter);
  const firstId = [...milestones.values()][0]?.id;

  await applyDefaultOnboardingJourney(testPlayer.id, adapter);
  const secondId = [...milestones.values()][0]?.id;

  assert.equal(milestones.size, 1);
  assert.equal(secondId, firstId);
});
