import type { AppAdapter } from "../adapters/interface.ts";
import type { CachedIdentity } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";

// Looks up a player by recovery key alone (keys are globally unique).
// Returns a reconstructed CachedIdentity; the caller persists it via
// useIdentity.setIdentity (no localStorage write here).
// Throws if not found.
export const recoverIdentity = async (
  recoveryKey: string,
  adapter: AppAdapter,
): Promise<CachedIdentity> => {
  const player = await adapter.getPlayerByRecoveryKey(recoveryKey);
  if (!player) {
    throw new Error("No player found for that recovery key.");
  }

  const identity: CachedIdentity = {
    uid: player.uid,
    recoveryKey: player.recoveryKey,
    sessionId: player.sessionId,
    role: USER_ROLE.PLAYER,
    name: player.name || undefined,
  };

  return identity;
};
