import type {
  FormSchema,
  Milestone,
  Mission,
  PBRecord,
  Resource,
  Session,
} from "../types/index.ts";
import type { TemplateExport } from "../types/index.ts";

// Pure function - strips PB IDs and returns a portable TemplateExport. (C-10)
// No adapter calls; no side effects.
//
// _milestoneOrder and _missionOrder are added as import-remapping keys so that
// importTemplate can reconstruct FK references after PB IDs are stripped.
export const exportTemplate = (
  name: string,
  _session: Session,
  milestones: ReadonlyArray<Milestone>,
  missions: ReadonlyArray<Mission>,
  formSchemas: ReadonlyArray<FormSchema>,
  resources: ReadonlyArray<Resource>,
): TemplateExport => {
  const stripRecord = <T extends PBRecord>(
    record: T,
  ): Omit<T, keyof PBRecord> => {
    // todo: remove this after further implementation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, created: _created, updated: _updated, ...rest } = record;
    return rest as Omit<T, keyof PBRecord>;
  };

  // Build lookup maps before stripping IDs so FK remapping survives export.
  const milestoneOrderById = new Map(milestones.map((ms) => [ms.id, ms.order]));
  const missionOrderById = new Map(missions.map((m) => [m.id, m.order]));

  return {
    exportType: "template",
    exportedAt: new Date().toISOString(),
    name,
    milestones: milestones.map(stripRecord),
    missions: missions.map((m) => ({
      ...stripRecord(m),
      _milestoneOrder: milestoneOrderById.get(m.milestoneId) ?? 0,
    })),
    formSchemas: formSchemas.map((s) => ({
      ...stripRecord(s),
      _missionOrder: missionOrderById.get(s.missionId) ?? 0,
    })),
    resources: resources.map(stripRecord),
  };
};
