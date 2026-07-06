import type { AppAdapter } from "../adapters/interface.ts";
import type { TemplateExport } from "../types/index.ts";
import { DEFAULT_SESSION_BACKGROUND_URL } from "../constants/defaultSessionBackground.ts";
import { applyTemplateToNewPlayer } from "./applyTemplateToNewPlayer.ts";

/**
 * Replace one player's milestones / missions / attachments from a
 * template — used by the player-detail page's "re-apply template" action.
 * Goes through the same `applyTemplateToNewPlayer` the onboarding wizard
 * uses, so re-applying "Messe München Onboarding" later also sets the
 * session background if it isn't already set, same as picking it at
 * invite time.
 */
export const applyTemplateToPlayer = async (
  sessionId: string,
  playerId: string,
  template: TemplateExport,
  adapter: AppAdapter,
): Promise<void> => {
  await applyTemplateToNewPlayer(sessionId, playerId, template, adapter, {
    defaultTemplateBgImageUrl: DEFAULT_SESSION_BACKGROUND_URL,
  });
};
