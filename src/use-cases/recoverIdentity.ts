import type { AppAdapter } from "../adapters/interface.ts";
import type { CachedIdentity } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";

export const recoverIdentity = async (
  recoveryKey: string,
  adapter: AppAdapter,
): Promise<CachedIdentity> => {
  const session = await adapter.getSessionByGmRecoveryKey(recoveryKey);
  if (session) {
    return {
      uid: session.gameMakerId,
      recoveryKey: session.gmRecoveryKey,
      sessionId: session.id,
      role: USER_ROLE.GAMEMAKER,
    };
  }

  const player = await adapter.getPlayerByRecoveryKey(recoveryKey);
  if (!player?.uid || !player.recoveryKey) {
    throw new Error("No identity found for that recovery key.");
  }

  return {
    uid: player.uid,
    recoveryKey: player.recoveryKey,
    sessionId: player.sessionId,
    role: USER_ROLE.PLAYER,
    name: player.name || undefined,
  };
};
