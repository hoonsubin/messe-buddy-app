import type { AppAdapter } from "../adapters/interface.ts";
import {
  DEMO_GM_RECOVERY_KEY,
  DEMO_GM_UID,
  DEMO_PERSONAS,
  DEMO_PRE_BOARDING_CHECKS,
  DEMO_SESSION_ID,
  DEMO_SESSION_NAME,
  type DemoPersona,
} from "../constants/demoInstance.ts";
import { applyDefaultOnboardingJourney } from "./applyDefaultOnboardingJourney.ts";
import { seedLibraryResources } from "./seedLibraryResources.ts";

const PROFILE_MISSION_TITLE = "Complete Your Profile";

const applyPersona = async (
  adapter: AppAdapter,
  persona: DemoPersona,
): Promise<void> => {
  const player = await adapter.invitePlayer(
    DEMO_SESSION_ID,
    { name: persona.name, jobTitle: persona.jobTitle },
    persona.playerId,
  );

  await adapter.updatePlayer(player.id, {
    ...(persona.claimStatus === "claimed"
      ? { uid: persona.uid, recoveryKey: persona.recoveryKey }
      : {}),
    claimStatus: persona.claimStatus,
    preferredName: persona.preferredName,
    pronouns: persona.pronouns,
    team: persona.team,
    startDate: persona.startDate,
    location: persona.location,
    timezone: persona.timezone,
    skillsConfident: persona.skillsConfident,
    skillsDevelop: persona.skillsDevelop,
    languages: persona.languages,
    workStyle: persona.workStyle,
  });

  await applyDefaultOnboardingJourney(player.id, adapter);

  if (persona.completedMissionTitles.length > 0) {
    const missions = await adapter.listMissions(DEMO_SESSION_ID, {
      playerId: player.id,
    });
    const now = new Date().toISOString();
    for (const title of persona.completedMissionTitles) {
      const mission = missions.find((m) => m.title === title);
      if (!mission) continue;
      await adapter.upsertProgressEvent(player.id, mission.id, {
        status: "completed",
        validatedBy: DEMO_GM_UID,
        validatedAt: now,
      });
    }
    if (persona.completedMissionTitles.includes(PROFILE_MISSION_TITLE)) {
      await adapter.updatePlayer(player.id, {
        profileComplete: true,
        tutorialComplete: true,
      });
    }
  }

  if (persona.buddy) {
    await adapter.upsertBuddyProfile(player.id, {
      sessionId: DEMO_SESSION_ID,
      name: persona.buddy.name,
      role: persona.buddy.role,
      tenure: persona.buddy.tenure,
      contactUrl: persona.buddy.contactUrl,
      quote: persona.buddy.quote,
      email: persona.buddy.email,
      phone: persona.buddy.phone,
    });
  }
};

/**
 * Bootstraps the "Sofia Chen / Peter Tubak" demo instance purely through
 * `AppAdapter` calls, so both `mockAdapter` and `pbAdapter` produce the same
 * state from the same declared data in `demoInstance.ts`. Idempotent — skips
 * entirely if the demo session already exists.
 */
export const seedDemoInstance = async (adapter: AppAdapter): Promise<void> => {
  try {
    await adapter.getSession(DEMO_SESSION_ID);
    return; // Already seeded.
  } catch {
    // Not found — proceed to seed.
  }

  await adapter.createSession(
    DEMO_SESSION_NAME,
    DEMO_GM_UID,
    DEMO_GM_RECOVERY_KEY,
    DEMO_SESSION_ID,
  );
  await adapter.updateSession(DEMO_SESSION_ID, {
    preBoardingChecks: DEMO_PRE_BOARDING_CHECKS,
  });

  await seedLibraryResources(adapter);

  for (const persona of DEMO_PERSONAS) {
    await applyPersona(adapter, persona);
  }
};
