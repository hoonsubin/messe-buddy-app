import type { AppAdapter } from "../adapters/interface.ts";
import type { LocalIdentity, PBRecord, Player } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateRecoveryKey = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes)
    .map((b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length])
    .join("");
};

// ── joinSession ───────────────────────────────────────────────────────────────

export interface JoinSessionResult {
  readonly identity: LocalIdentity;
  readonly player: Player;
}

// Step 1: verify the session exists. Throws if not found.
// Call this before showing the name input — fail fast.
export const verifySession = async (
  sessionId: string,
  adapter: AppAdapter,
): Promise<void> => {
  await adapter.getSession(sessionId);
};

// Step 2: create the player with the name already known.
// Returns LocalIdentity; the caller is responsible for persisting it
// via useIdentity.setIdentity (no localStorage write here).
export const joinSession = async (
  sessionId: string,
  name: string,
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
    name,
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
    name,
  };

  return { identity, player };
};

// ── createGameMakerSession ────────────────────────────────────────────────────

// Returns LocalIdentity; the caller persists it via useIdentity.setIdentity.
export const createGameMakerSession = async (
  sessionName: string,
  name: string,
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
    name,
  };

  return identity;
};
