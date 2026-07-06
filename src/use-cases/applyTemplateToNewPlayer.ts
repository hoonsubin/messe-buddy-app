import type { AppAdapter } from "../adapters/interface.ts";
import type { TemplateExport } from "../types/index.ts";
import { DEFAULT_ONBOARDING_TEMPLATE } from "../constants/defaultOnboardingTemplate.ts";
import { applyDefaultSessionBackground } from "./applyDefaultSessionBackground.ts";
import { importTemplate } from "./importTemplate.ts";

export interface ApplyTemplateOptions {
  /**
   * Passed through to `applyDefaultSessionBackground` when `template` is
   * `DEFAULT_ONBOARDING_TEMPLATE` — the one place that decides "this
   * template implies a session-level background." Omit it (or the whole
   * `template`/adapter combination won't match) and no background gets
   * applied, e.g. for `SCRATCH_JOURNEY_TEMPLATE` or a GM-authored template.
   */
  readonly defaultTemplateBgImageUrl?: string;
}

/**
 * Applies `template` to a player, plus whatever session-level side effects
 * that specific template implies. This is the single place that decision
 * lives — every caller (new-player onboarding, an existing player's
 * "re-apply template," and demo-instance seeding) goes through here instead
 * of each re-deciding it independently, which is how the background-image
 * rule ended up implemented twice in the same day.
 *
 * No idempotency guard — this always replaces the player's current
 * milestones/missions (via `importTemplate`). For "only if the player is
 * still blank," see `applyTemplateIfBlank.ts`.
 */
export const applyTemplateToNewPlayer = async (
  sessionId: string,
  playerId: string,
  template: TemplateExport,
  adapter: AppAdapter,
  options?: ApplyTemplateOptions,
): Promise<void> => {
  await importTemplate(template, playerId, adapter);

  if (
    template.name === DEFAULT_ONBOARDING_TEMPLATE.name &&
    options?.defaultTemplateBgImageUrl
  ) {
    await applyDefaultSessionBackground(
      sessionId,
      options.defaultTemplateBgImageUrl,
      adapter,
    );
  }
};
