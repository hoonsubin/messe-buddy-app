import type { AppAdapter } from "../adapters/interface.ts";
import { SCRATCH_JOURNEY_TEMPLATE } from "../constants/scratchJourneyTemplate.ts";
import { importTemplate } from "./importTemplate.ts";

/**
 * Seeds a blank player journey with a single starter milestone (idempotent).
 * Used when a GM picks "Start from scratch" instead of a registered
 * template — see `applyDefaultOnboardingJourney.ts` for the full-template
 * counterpart.
 */
export const applyScratchJourney = async (
  playerId: string,
  adapter: AppAdapter,
): Promise<void> => {
  const player = await adapter.getPlayerById(playerId);
  if (!player) throw new Error(`Player not found: ${playerId}`);

  const existing = await adapter.listMilestones(player.sessionId, { playerId });
  if (existing.length > 0) return;

  await importTemplate(SCRATCH_JOURNEY_TEMPLATE, playerId, adapter);
};
