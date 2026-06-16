import type { AppAdapter } from "../adapters/interface.ts";
import type { LocalIdentity, TemplateExport } from "../types/index.ts";
import { USER_ROLE } from "../types/index.ts";
import { importTemplate } from "./importTemplate.ts";

export interface BootstrapFromTemplateOptions {
  readonly gmUid?: string;
  readonly recoveryKey?: string;
}

export interface BootstrapFromTemplateResult {
  readonly sessionId: string;
  readonly gmUid: string;
  readonly identity: LocalIdentity;
}

/** Import a template into a new GM session and return the new identity. */
export const bootstrapFromTemplate = async (
  template: TemplateExport,
  adapter: AppAdapter,
  options: BootstrapFromTemplateOptions = {},
): Promise<BootstrapFromTemplateResult> => {
  const gmUid = options.gmUid ?? crypto.randomUUID();
  const sessionId = await importTemplate(
    template,
    template.name,
    gmUid,
    adapter,
  );
  const identity: LocalIdentity = {
    uid: gmUid,
    recoveryKey: options.recoveryKey ?? "",
    sessionId,
    role: USER_ROLE.GAMEMAKER,
  };
  return { sessionId, gmUid, identity };
};
