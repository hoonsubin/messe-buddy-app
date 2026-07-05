import type {
  FormSchema,
  LibraryResource,
  Milestone,
  MilestoneResource,
  Mission,
  TemplateFormSchema,
  TemplateMilestone,
  TemplateMission,
} from "../types/index.ts";
import type { TemplateExport } from "../types/index.ts";

const omit = <T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> => {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
};

export const exportTemplate = (
  name: string,
  milestones: ReadonlyArray<Milestone>,
  missions: ReadonlyArray<Mission>,
  formSchemas: ReadonlyArray<FormSchema>,
  milestoneResources: ReadonlyArray<MilestoneResource>,
  libraryResources: ReadonlyArray<LibraryResource>,
): TemplateExport => {
  const milestoneOrderById = new Map(milestones.map((ms) => [ms.id, ms.order]));
  const missionOrderById = new Map(missions.map((m) => [m.id, m.order]));
  const resourceKeyByLibId = new Map(
    libraryResources.map((r) => [r.id, r.resourceKey]),
  );

  const resourceBindings = milestoneResources
    .map((mr) => ({
      milestoneOrder: milestoneOrderById.get(mr.milestoneId) ?? 0,
      resourceKey: resourceKeyByLibId.get(mr.libraryResourceId) ?? "",
    }))
    .filter((b) => b.resourceKey !== "");

  return {
    exportType: "template",
    exportedAt: new Date().toISOString(),
    name,
    milestones: milestones.map((ms): TemplateMilestone =>
      omit(
        omit(ms, "id", "created", "updated"),
        "sessionId",
        "playerId",
      )
    ),
    missions: missions.map((m): TemplateMission => ({
      ...omit(
        omit(m, "id", "created", "updated"),
        "sessionId",
        "playerId",
        "milestoneId",
      ),
      _milestoneOrder: milestoneOrderById.get(m.milestoneId) ?? 0,
    })),
    formSchemas: formSchemas.map((s): TemplateFormSchema => ({
      ...omit(omit(s, "id", "created", "updated"), "missionId"),
      _missionOrder: missionOrderById.get(s.missionId) ?? 0,
    })),
    resourceBindings,
  };
};
