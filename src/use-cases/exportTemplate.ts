import type { Session, Milestone, Mission, FormSchema, Resource, PBRecord } from "../types/index.ts";
import type { TemplateExport } from "../types/index.ts";

// Pure function — strips PB IDs and returns a portable TemplateExport. (C-10)
// No adapter calls; no side effects.
export function exportTemplate(
  name: string,
  _session: Session,
  milestones: ReadonlyArray<Milestone>,
  missions: ReadonlyArray<Mission>,
  formSchemas: ReadonlyArray<FormSchema>,
  resources: ReadonlyArray<Resource>
): TemplateExport {
  function stripRecord<T extends PBRecord>(
    record: T
  ): Omit<T, keyof PBRecord> {
    const { id: _id, created: _created, updated: _updated, ...rest } = record;
    return rest as Omit<T, keyof PBRecord>;
  }

  return {
    exportType: "template",
    exportedAt: new Date().toISOString(),
    name,
    milestones: milestones.map(stripRecord),
    missions: missions.map(stripRecord),
    formSchemas: formSchemas.map(stripRecord),
    resources: resources.map(stripRecord),
  };
}
