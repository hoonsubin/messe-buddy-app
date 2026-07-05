import type { AppAdapter } from "../adapters/interface.ts";
import type { TemplateExport } from "../types/index.ts";
import { importTemplate } from "./importTemplate.ts";

/** Replace one player's milestones / missions / attachments from a template. */
export const applyTemplateToPlayer = async (
  playerId: string,
  template: TemplateExport,
  adapter: AppAdapter,
): Promise<void> => {
  await importTemplate(template, playerId, adapter);
};
