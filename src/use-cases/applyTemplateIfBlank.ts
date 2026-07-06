import type { AppAdapter } from "../adapters/interface.ts";
import type { TemplateExport } from "../types/index.ts";
import {
  type ApplyTemplateOptions,
  applyTemplateToNewPlayer,
} from "./applyTemplateToNewPlayer.ts";

/**
 * Applies `template` to a player only if they don't already have a journey
 * (idempotent) — used by seed/fixture code that may run more than once
 * against the same player, unlike live onboarding where the player is
 * always freshly invited and blank by construction.
 *
 * Parameterized replacement for what used to be two near-identical files,
 * `applyDefaultOnboardingJourney.ts` and `applyScratchJourney.ts` — same
 * guard, copy-pasted, differing only in which template constant they
 * imported.
 */
export const applyTemplateIfBlank = async (
  sessionId: string,
  playerId: string,
  template: TemplateExport,
  adapter: AppAdapter,
  options?: ApplyTemplateOptions,
): Promise<void> => {
  const player = await adapter.getPlayerById(playerId);
  if (!player) throw new Error(`Player not found: ${playerId}`);

  const existing = await adapter.listMilestones(player.sessionId, { playerId });
  if (existing.length > 0) return;

  await applyTemplateToNewPlayer(sessionId, playerId, template, adapter, options);
};
