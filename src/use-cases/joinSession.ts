import type { AppAdapter } from "../adapters/interface.ts";
import type { CachedIdentity } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";
import { generateRecoveryKey } from "../utils/recoveryKey.ts";
import { claimPlayer } from "./claimPlayer.ts";

export const verifySession = async (
  sessionId: string,
  adapter: AppAdapter,
): Promise<void> => {
  await adapter.getSession(sessionId);
};

export interface JoinSessionResult {
  readonly identity: CachedIdentity;
}

/** Landing orchestrator — claims player row via invite token. */
export const joinSession = async (
  inviteToken: string,
  name: string,
  adapter: AppAdapter,
): Promise<JoinSessionResult> => {
  const { identity } = await claimPlayer(inviteToken, name, adapter);
  return { identity };
};

export const createGameMakerSession = async (
  sessionName: string,
  name: string,
  adapter: AppAdapter,
): Promise<CachedIdentity> => {
  const uid = crypto.randomUUID();
  const recoveryKey = generateRecoveryKey();

  const session = await adapter.createSession(
    sessionName,
    uid,
    recoveryKey,
  );

  return {
    uid,
    recoveryKey,
    sessionId: session.id,
    role: USER_ROLE.GAMEMAKER,
    name,
  };
};
