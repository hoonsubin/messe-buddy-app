import type {
  FieldSchema,
  FormSchema,
  LibraryResource,
  Milestone,
  MilestoneResource,
  Mission,
  TemplateExport,
  TemplateMilestone,
  TemplateMission,
} from "../types/index.ts";

const omit = <T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> => {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
};

/**
 * Flattens live PocketBase-shaped records into a portable, nested
 * TemplateExport: milestones carry their own missions, form missions carry
 * their own fields. No order-number foreign keys — grouping is by real id,
 * so there's nothing to collide when re-importing.
 */
export const exportTemplate = (
  name: string,
  milestones: ReadonlyArray<Milestone>,
  missions: ReadonlyArray<Mission>,
  formSchemas: ReadonlyArray<FormSchema>,
  milestoneResources: ReadonlyArray<MilestoneResource>,
  libraryResources: ReadonlyArray<LibraryResource>,
): TemplateExport => {
  const formFieldsByMissionId = new Map<string, ReadonlyArray<FieldSchema>>(
    formSchemas.map((s) => [s.missionId, s.fields]),
  );

  const resourceKeyByLibId = new Map(
    libraryResources.map((r) => [r.id, r.resourceKey]),
  );
  const resourceKeysByMilestoneId = new Map<string, string[]>();
  for (const mr of milestoneResources) {
    const key = resourceKeyByLibId.get(mr.libraryResourceId);
    if (!key) continue;
    const list = resourceKeysByMilestoneId.get(mr.milestoneId) ?? [];
    list.push(key);
    resourceKeysByMilestoneId.set(mr.milestoneId, list);
  }

  const missionsByMilestoneId = new Map<string, Mission[]>();
  for (const m of missions) {
    const list = missionsByMilestoneId.get(m.milestoneId) ?? [];
    list.push(m);
    missionsByMilestoneId.set(m.milestoneId, list);
  }

  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);

  return {
    exportType: "template",
    exportedAt: new Date().toISOString(),
    name,
    milestones: sortedMilestones.map((ms): TemplateMilestone => {
      const msMissions = (missionsByMilestoneId.get(ms.id) ?? [])
        .slice()
        .sort((a, b) => a.order - b.order);
      const resources = resourceKeysByMilestoneId.get(ms.id);

      return {
        ...omit(
          omit(ms, "id", "created", "updated"),
          "sessionId",
          "playerId",
          "order",
        ),
        ...(resources ? { resources } : {}),
        missions: msMissions.map((m): TemplateMission => {
          const formFields = formFieldsByMissionId.get(m.id);
          return {
            ...omit(
              omit(m, "id", "created", "updated"),
              "sessionId",
              "playerId",
              "milestoneId",
              "order",
            ),
            ...(formFields ? { formFields } : {}),
          };
        }),
      };
    }),
  };
};
