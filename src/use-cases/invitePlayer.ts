import type { AppAdapter } from "../adapters/interface.ts";
import type { Player, TemplateExport } from "../types/index.ts";
import { generateInviteToken } from "../utils/inviteToken.ts";
import { importTemplate } from "./importTemplate.ts";

export interface InvitePlayerResult {
  readonly player: Player;
  /** Name of the auto-applied starter template, if any templates exist. */
  readonly appliedTemplateName: string | null;
}

/** First template from `listTemplates()` (PB: sorted by name). */
export const pickStarterTemplate = (
  templates: ReadonlyArray<TemplateExport>,
): TemplateExport | null => templates[0] ?? null;

export const invitePlayer = async (
  sessionId: string,
  adapter: AppAdapter,
  data: { readonly name?: string; readonly jobTitle?: string } = {},
): Promise<InvitePlayerResult> => {
  await adapter.getSession(sessionId);
  const player = await adapter.invitePlayer(sessionId, {
    name: data.name?.trim() || "New player",
    jobTitle: data.jobTitle?.trim() || "",
  });

  const templates = await adapter.listTemplates();
  const starter = pickStarterTemplate(templates);
  if (!starter) {
    return { player, appliedTemplateName: null };
  }

  await importTemplate(starter, player.id, adapter);
  return { player, appliedTemplateName: starter.name };
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
