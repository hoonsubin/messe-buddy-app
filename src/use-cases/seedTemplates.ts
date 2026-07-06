import type { AppAdapter } from "../adapters/interface.ts";
import { DEFAULT_ONBOARDING_TEMPLATE } from "../constants/defaultOnboardingTemplate.ts";

/**
 * Registers the bundled "Messe München Onboarding" template so it shows up
 * in the GM's onboarding-wizard template list (`adapter.listTemplates()`).
 * Idempotent — `saveTemplate` upserts by name, so running this repeatedly
 * never creates a duplicate entry.
 */
export const seedTemplates = async (adapter: AppAdapter): Promise<void> => {
  await adapter.saveTemplate(DEFAULT_ONBOARDING_TEMPLATE);
};
