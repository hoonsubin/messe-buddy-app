import type { AppAdapter } from "../adapters/interface.ts";
import type { LocalIdentity } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";

const IDENTITY_KEY = "mb_identity";

// Looks up a Player by recoveryKey + sessionId, reconstructs LocalIdentity,
// and writes it back to localStorage. Throws if not found.
export const recoverIdentity = async (
  recoveryKey: string,
  sessionId: string,
  adapter: AppAdapter,
): Promise<LocalIdentity> => {
  const player = await adapter.getPlayerByRecoveryKey(recoveryKey, sessionId);
  if (!player) {
    throw new Error("No player found for this recovery key and session.");
  }

  const identity: LocalIdentity = {
    uid: player.uid,
    recoveryKey: player.recoveryKey,
    sessionId: player.sessionId,
    role: USER_ROLE.PLAYER,
  };

  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
};
