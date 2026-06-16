import type { TemplateExport } from "../types/index.ts";

export interface TemplateSummary {
  readonly id: string;
  readonly name: string;
  readonly milestoneCount: number;
  readonly missionCount: number;
}

export const toTemplateSummaries = (
  templates: ReadonlyArray<TemplateExport>,
): ReadonlyArray<TemplateSummary> =>
  templates.map((t) => ({
    id: t.name,
    name: t.name,
    milestoneCount: t.milestones.length,
    missionCount: t.missions.length,
  }));
