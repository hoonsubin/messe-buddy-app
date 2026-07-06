import type { AppAdapter } from "../adapters/interface.ts";
import { DEFAULT_ONBOARDING_TEMPLATE } from "../constants/defaultOnboardingTemplate.ts";
import { importTemplate } from "./importTemplate.ts";

/** Seeds a blank player journey from the bundled default template (idempotent). */
export const applyDefaultOnboardingJourney = async (
  playerId: string,
  adapter: AppAdapter,
): Promise<void> => {
  const player = await adapter.getPlayerById(playerId);
  if (!player) throw new Error(`Player not found: ${playerId}`);

  const existing = await adapter.listMilestones(player.sessionId, { playerId });
  if (existing.length > 0) return;

  await importTemplate(DEFAULT_ONBOARDING_TEMPLATE, playerId, adapter);
};
