import assert from "node:assert/strict";
import type { Milestone, Mission, MissionTag } from "../types/index.ts";
import { MISSION_TAG } from "../types/unions.ts";
import {
  findOnboardingProfileMission,
  isOnboardingProfileMission,
} from "./onboardingMission.ts";

const ms = (id: string, order: number): Milestone => ({
  id,
  created: "",
  updated: "",
  sessionId: "s1",
  playerId: "p1",
  name: id,
  xPercent: 0,
  yPercent: 0,
  xpThreshold: 100,
  order,
});

const mission = (
  id: string,
  milestoneId: string,
  order: number,
  tags: ReadonlyArray<MissionTag>,
): Mission => ({
  id,
  created: "",
  updated: "",
  sessionId: "s1",
  playerId: "p1",
  milestoneId,
  title: id,
  body: "",
  type: "form",
  xpValue: 10,
  tags,
  order,
  isInCurrentMissions: true,
  validationMethod: "selfApprove",
});

Deno.test("findOnboardingProfileMission returns null when no tagged mission", () => {
  const milestones = [ms("m1", 0)];
  const missions = [mission("mi1", "m1", 0, [MISSION_TAG.MANDATORY])];
  assert.equal(findOnboardingProfileMission(milestones, missions), null);
});

Deno.test("findOnboardingProfileMission finds tagged mission", () => {
  const milestones = [ms("m1", 0)];
  const missions = [
    mission("mi1", "m1", 0, [
      MISSION_TAG.MANDATORY,
      MISSION_TAG.ONBOARDING_PROFILE,
    ]),
  ];
  assert.equal(findOnboardingProfileMission(milestones, missions)?.id, "mi1");
});

Deno.test("findOnboardingProfileMission tie-breaks by milestone and mission order", () => {
  const milestones = [ms("m1", 1), ms("m2", 0)];
  const missions = [
    mission("late", "m1", 0, [MISSION_TAG.ONBOARDING_PROFILE]),
    mission("early", "m2", 1, [MISSION_TAG.ONBOARDING_PROFILE]),
  ];
  assert.equal(findOnboardingProfileMission(milestones, missions)?.id, "early");
});

Deno.test("isOnboardingProfileMission checks tag", () => {
  assert.equal(
    isOnboardingProfileMission({ tags: [MISSION_TAG.ONBOARDING_PROFILE] }),
    true,
  );
  assert.equal(
    isOnboardingProfileMission({ tags: [MISSION_TAG.MANDATORY] }),
    false,
  );
});
