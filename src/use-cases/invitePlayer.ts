import type { AppAdapter } from "../adapters/interface.ts";
import type { Player } from "../types/index.ts";

/** Creates an invited `players` row only — no template or buddy side effects. */
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
