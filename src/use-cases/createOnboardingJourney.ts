import type { AppAdapter } from "../adapters/interface.ts";
import type { BuddyProfile, BuddySelection } from "../types/index.ts";
import { buddyDraftToProfileFields } from "../types/buddyPicker.ts";
import { DEFAULT_ONBOARDING_TEMPLATE } from "../constants/defaultOnboardingTemplate.ts";
import { DEFAULT_SESSION_BACKGROUND_URL } from "../constants/defaultSessionBackground.ts";
import { applyDefaultSessionBackground } from "./applyDefaultSessionBackground.ts";
import { applyScratchJourney } from "./applyScratchJourney.ts";
import { importTemplate } from "./importTemplate.ts";
import { invitePlayer } from "./invitePlayer.ts";

export interface CreateOnboardingJourneyInput {
  readonly playerName: string;
  readonly buddy: BuddySelection;
  readonly templateName: string | null;
}

export interface CreateOnboardingJourneyResult {
  readonly playerId: string;
  readonly inviteToken: string;
  readonly appliedTemplateName: string | null;
}

/** Session-scoped buddy rows deduped by display name for the wizard picker. */
export const listDistinctBuddyProfilesForPicker = async (
  sessionId: string,
  adapter: AppAdapter,
): Promise<ReadonlyArray<BuddyProfile>> => {
  const all = await adapter.listBuddyProfiles(sessionId);
  const seen = new Set<string>();
  const distinct: BuddyProfile[] = [];
  for (const profile of all) {
    const key = profile.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    distinct.push(profile);
  }
  return distinct;
};

const resolveBuddyFields = async (
  sessionId: string,
  buddy: BuddySelection,
  adapter: AppAdapter,
): Promise<
  Omit<BuddyProfile, "id" | "created" | "updated" | "assignedToPlayerId">
> => {
  if (buddy.kind === "new") {
    return buddyDraftToProfileFields(buddy.draft);
  }

  const profiles = await adapter.listBuddyProfiles(sessionId);
  const source = profiles.find((p) => p.id === buddy.buddyProfileId);
  if (!source) {
    throw new Error(`Buddy profile not found: ${buddy.buddyProfileId}`);
  }

  return {
    sessionId,
    name: source.name,
    role: source.role,
    email: source.email ?? "",
    phone: source.phone ?? "",
    tenure: source.tenure,
    contactUrl: source.contactUrl,
    quote: source.quote,
    avatarUrl: source.avatarUrl,
  };
};

export const createOnboardingJourney = async (
  sessionId: string,
  adapter: AppAdapter,
  input: CreateOnboardingJourneyInput,
): Promise<CreateOnboardingJourneyResult> => {
  const player = await invitePlayer(sessionId, adapter, {
    name: input.playerName,
  });

  const buddyFields = await resolveBuddyFields(sessionId, input.buddy, adapter);
  await adapter.upsertBuddyProfile(player.id, buddyFields);

  let appliedTemplateName: string | null = null;
  if (input.templateName) {
    const templates = await adapter.listTemplates();
    const template = templates.find((t) => t.name === input.templateName);
    if (!template) {
      throw new Error(`Template not found: ${input.templateName}`);
    }
    await importTemplate(template, player.id, adapter);
    appliedTemplateName = template.name;
    if (template.name === DEFAULT_ONBOARDING_TEMPLATE.name) {
      await applyDefaultSessionBackground(
        sessionId,
        DEFAULT_SESSION_BACKGROUND_URL,
        adapter,
      );
    }
  } else {
    await applyScratchJourney(player.id, adapter);
  }

  return {
    playerId: player.id,
    inviteToken: player.inviteToken,
    appliedTemplateName,
  };
};
