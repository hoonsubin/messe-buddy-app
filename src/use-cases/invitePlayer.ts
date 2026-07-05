import type { AppAdapter } from "../adapters/interface.ts";
import type { Player } from "../types/index.ts";
import { generateInviteToken } from "../utils/inviteToken.ts";

export const invitePlayer = async (
  sessionId: string,
  adapter: AppAdapter,
  data: { readonly name?: string; readonly jobTitle?: string } = {},
): Promise<Player> => {
  await adapter.getSession(sessionId);
  return adapter.invitePlayer(sessionId, {
    name: data.name?.trim() || "New player",
    jobTitle: data.jobTitle?.trim() || "",
  });
};

export const generateUniqueInviteToken = async (
  adapter: AppAdapter,
): Promise<string> => {
  for (let attempt = 0; attempt < 8; attempt++) {
    const token = generateInviteToken();
    const existing = await adapter.getPlayerByInviteToken(token);
    if (!existing) return token;
  }
  throw new Error("Could not generate invite token");
};
