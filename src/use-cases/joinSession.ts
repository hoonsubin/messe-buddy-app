import type { AppAdapter } from "../adapters/interface.ts";
import type { CachedIdentity, PBRecord, Player } from "../types/index.ts";
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
  readonly identity: CachedIdentity;
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
// Returns CachedIdentity; the caller is responsible for persisting it
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

  const identity: CachedIdentity = {
    uid,
    recoveryKey,
    sessionId,
    role: USER_ROLE.PLAYER,
    name,
  };

  return { identity, player };
};

// ── claimPlayerSlot ───────────────────────────────────────────────────────────

// Allows a player to claim an admin-seeded slot via a one-time invite token.
// On success: writes uid + recoveryKey to the Player record and clears inviteToken.
// Returns JoinSessionResult identical in shape to joinSession's result.
// Throws if the token is unknown, already used, or belongs to a different session.
export const claimPlayerSlot = async (
  token: string,
  sessionId: string,
  adapter: AppAdapter,
): Promise<JoinSessionResult> => {
  const slot = await adapter.getPlayerByInviteToken(token, sessionId);
  if (!slot) {
    throw new Error("This invite link has already been used or is invalid.");
  }

  const uid = crypto.randomUUID();
  const recoveryKey = generateRecoveryKey();

  const player = await adapter.updatePlayer(slot.id, {
    uid,
    recoveryKey,
    inviteToken: undefined, // cleared — token is single-use
  });

  const identity: CachedIdentity = {
    uid,
    recoveryKey,
    sessionId,
    role: USER_ROLE.PLAYER,
    name: slot.name,
  };

  return { identity, player };
};

// ── createGameMakerSession ────────────────────────────────────────────────────

// Returns CachedIdentity; the caller persists it via useIdentity.setIdentity.
export const createGameMakerSession = async (
  sessionName: string,
  name: string,
  adapter: AppAdapter,
): Promise<CachedIdentity> => {
  const uid = crypto.randomUUID();
  const recoveryKey = generateRecoveryKey();

  const session = await adapter.createSession(sessionName, uid);

  const identity: CachedIdentity = {
    uid,
    recoveryKey,
    sessionId: session.id,
    role: USER_ROLE.GAMEMAKER,
    name,
  };

  return identity;
};
