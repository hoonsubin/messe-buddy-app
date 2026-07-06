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
import { DEFAULT_ONBOARDING_TEMPLATE } from "../constants/defaultOnboardingTemplate.ts";
import { applyTemplateIfBlank } from "./applyTemplateIfBlank.ts";
import { seedLibraryResources } from "./seedLibraryResources.ts";
import { seedTemplates } from "./seedTemplates.ts";

const PROFILE_MISSION_TITLE = "Complete Your Profile";

const applyPersona = async (
  adapter: AppAdapter,
  persona: DemoPersona,
  bgImageUrl: string | undefined,
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

  await applyTemplateIfBlank(
    DEMO_SESSION_ID,
    player.id,
    DEFAULT_ONBOARDING_TEMPLATE,
    adapter,
    { defaultTemplateBgImageUrl: bgImageUrl },
  );

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
 * state from the same declared data in `demoInstance.ts`.
 *
 * Library resources and the registered template list are global (not
 * session-scoped), so they're re-synced on every call regardless of whether
 * the demo session already exists — that way a template rename or a new
 * library resource still lands on an already-seeded instance. Session and
 * persona creation stay idempotent by bailing out once the demo session id
 * is found.
 *
 * `bgImageUrl`, if given, is threaded down to `applyTemplateIfBlank` for
 * each persona — it's the same "applying the default template implies this
 * background" rule `applyTemplateToNewPlayer` centralizes for the live GM
 * flow, not a separate seed-only mechanism. Passed in as a plain string
 * (rather than imported here) so this file stays free of binary asset
 * imports and safe for Deno.test to import.
 */
export const seedDemoInstance = async (
  adapter: AppAdapter,
  options?: { readonly bgImageUrl?: string },
): Promise<void> => {
  await seedLibraryResources(adapter);
  await seedTemplates(adapter);

  try {
    await adapter.getSession(DEMO_SESSION_ID);
    return; // Session/personas already seeded.
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

  for (const persona of DEMO_PERSONAS) {
    await applyPersona(adapter, persona, options?.bgImageUrl);
  }
};
