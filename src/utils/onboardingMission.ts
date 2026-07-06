import type { Milestone, Mission } from "../types/index.ts";
import { MISSION_TAG } from "../types/unions.ts";

/** Mission tagged for tutorial routing and profile form completion (D-ONBOARDING-DEFAULT). */
export const findOnboardingProfileMission = (
  milestones: ReadonlyArray<Milestone>,
  missions: ReadonlyArray<Mission>,
): Mission | null => {
  const tagged = missions.filter((m) =>
    m.tags.includes(MISSION_TAG.ONBOARDING_PROFILE)
  );
  if (tagged.length === 0) return null;
  if (tagged.length === 1) return tagged[0]!;

  const msOrder = new Map(milestones.map((ms) => [ms.id, ms.order]));
  return [...tagged].sort((a, b) => {
    const mo = (msOrder.get(a.milestoneId) ?? 0) -
      (msOrder.get(b.milestoneId) ?? 0);
    return mo !== 0 ? mo : a.order - b.order;
  })[0]!;
};

export const isOnboardingProfileMission = (
  mission: Pick<Mission, "tags">,
): boolean => mission.tags.includes(MISSION_TAG.ONBOARDING_PROFILE);
