// Dead file — collapsed into applyTemplateIfBlank.ts + applyTemplateToNewPlayer.ts
// (architecture-drift fix, 2026-07-06): this and applyDefaultOnboardingJourney.ts
// were copy-pasted, differing only in which template constant they imported.
// createOnboardingJourney.ts now calls
// applyTemplateToNewPlayer(sessionId, playerId, SCRATCH_JOURNEY_TEMPLATE, adapter)
// directly (no guard needed there — the player is always freshly invited).
// Please `git rm` this file locally.
export {};
