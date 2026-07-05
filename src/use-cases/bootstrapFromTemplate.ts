import type { AppAdapter } from "../adapters/interface.ts";
import type { CachedIdentity, TemplateExport } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";
import { generateRecoveryKey } from "../utils/recoveryKey.ts";
import { importTemplate } from "./importTemplate.ts";

export interface BootstrapFromTemplateOptions {
  readonly gmUid?: string;
  readonly recoveryKey?: string;
  readonly sessionName?: string;
  readonly gmDisplayName?: string;
}

export interface BootstrapFromTemplateResult {
  readonly sessionId: string;
  readonly playerId: string;
  readonly gmUid: string;
  readonly identity: CachedIdentity;
}

/** Create a GM workspace, invite a player, and seed their journey from a template. */
export const bootstrapFromTemplate = async (
  template: TemplateExport,
  adapter: AppAdapter,
  options: BootstrapFromTemplateOptions = {},
): Promise<BootstrapFromTemplateResult> => {
  const gmUid = options.gmUid ?? crypto.randomUUID();
  const recoveryKey = options.recoveryKey ?? generateRecoveryKey();
  const session = await adapter.createSession(
    options.sessionName ?? template.name,
    gmUid,
    recoveryKey,
  );
  const player = await adapter.invitePlayer(session.id, {
    name: options.gmDisplayName ? "First player" : "First player",
  });
  await importTemplate(template, player.id, adapter);
  const identity: CachedIdentity = {
    uid: gmUid,
    recoveryKey,
    sessionId: session.id,
    role: USER_ROLE.GAMEMAKER,
    name: options.gmDisplayName,
  };
  return {
    sessionId: session.id,
    playerId: player.id,
    gmUid,
    identity,
  };
};
