import type { AppAdapter } from "../adapters/interface.ts";
import type { CachedIdentity, Player } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";
import { generateRecoveryKey } from "../utils/recoveryKey.ts";

export interface ClaimPlayerResult {
  readonly identity: CachedIdentity;
  readonly player: Player;
}

export const isClaimedPlayer = (player: Player): boolean =>
  player.claimStatus === "claimed" &&
  !!player.uid &&
  !!player.recoveryKey &&
  !player.uid.startsWith("pending_");

export const claimPlayer = async (
  inviteToken: string,
  name: string | undefined,
  adapter: AppAdapter,
): Promise<ClaimPlayerResult> => {
  const existing = await adapter.getPlayerByInviteToken(inviteToken);
  if (!existing) {
    throw new Error("Invite not found");
  }

  if (isClaimedPlayer(existing)) {
    const identity: CachedIdentity = {
      uid: existing.uid!,
      recoveryKey: existing.recoveryKey!,
      sessionId: existing.sessionId,
      role: USER_ROLE.PLAYER,
      name: existing.name || undefined,
    };
    return { identity, player: existing };
  }

  const uid = crypto.randomUUID();
  const recoveryKey = generateRecoveryKey();
  const displayName = name?.trim() || existing.name || "Player";
  const now = new Date().toISOString().split("T")[0] ?? "";

  const player = await adapter.updatePlayer(existing.id, {
    uid,
    recoveryKey,
    claimStatus: "claimed",
    name: displayName,
    team: existing.team || "",
    startDate: existing.startDate || now,
    location: existing.location || "",
    timezone: existing.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    skillsConfident: existing.skillsConfident,
    skillsDevelop: existing.skillsDevelop,
    languages: existing.languages,
    tutorialComplete: false,
    profileComplete: false,
    jobTitle: existing.jobTitle || "",
  });

  const identity: CachedIdentity = {
    uid,
    recoveryKey,
    sessionId: player.sessionId,
    role: USER_ROLE.PLAYER,
    name: displayName,
  };

  return { identity, player };
};
