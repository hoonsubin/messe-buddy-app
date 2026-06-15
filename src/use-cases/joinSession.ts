import type { AppAdapter } from "../adapters/interface.ts";
import type { LocalIdentity, PBRecord, Player } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";

const IDENTITY_KEY = "mb_identity";
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateRecoveryKey = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes)
    .map((b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length])
    .join("");
};

export interface JoinSessionResult {
  readonly identity: LocalIdentity;
  readonly player: Player;
}

// Creates a Player record in the adapter, writes LocalIdentity to localStorage,
// and returns both. The profile fields default to empty strings — they are
// filled in during the Tutorial's Profile Setup Mission.
export const joinSession = async (
  sessionId: string,
  adapter: AppAdapter,
): Promise<JoinSessionResult> => {
  const uid = crypto.randomUUID();
  const recoveryKey = generateRecoveryKey();
  const now = new Date().toISOString().split("T")[0] ?? "";

  const playerData: Omit<Player, keyof PBRecord> = {
    uid,
    recoveryKey,
    sessionId,
    tutorialComplete: false,
    profileComplete: false,
    name: "",
    role: "",
    team: "",
    startDate: now,
    location: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    skillsConfident: [],
    skillsDevelop: [],
    languages: [],
  };

  const player = await adapter.createPlayer(playerData);

  const identity: LocalIdentity = {
    uid,
    recoveryKey,
    sessionId,
    role: USER_ROLE.PLAYER,
  };

  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return { identity, player };
};

// Creates a Game Maker identity (no Player record — GM uses the session itself).
export const createGameMakerSession = async (
  sessionName: string,
  adapter: AppAdapter,
): Promise<LocalIdentity> => {
  const uid = crypto.randomUUID();
  const recoveryKey = generateRecoveryKey();

  const session = await adapter.createSession(sessionName, uid);

  const identity: LocalIdentity = {
    uid,
    recoveryKey,
    sessionId: session.id,
    role: USER_ROLE.GAMEMAKER,
  };

  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
};
