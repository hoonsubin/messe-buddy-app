import type { AppAdapter } from "../adapters/interface.ts";
import type { TemplateExport } from "../types/index.ts";

/**
 * Apply a template's content into an EXISTING session (one hire's onboarding).
 * Unlike importTemplate (which creates a new session), this replaces the
 * session's current milestones / missions / resources with the template's, so a
 * Game Maker can swap a hire's onboarding template in place.
 *
 * Order mirrors importTemplate: milestones → missions (remap _milestoneOrder) →
 * form schemas (remap _missionOrder) → resources.
 */
export const applyTemplateToSession = async (
  sid: string,
  template: TemplateExport,
  adapter: AppAdapter,
): Promise<void> => {
  // 1. Clear existing content for this session.
  const [existingMissions, existingMilestones, existingResources] =
    await Promise.all([
      adapter.listMissions(sid),
      adapter.listMilestones(sid),
      adapter.listResources(sid),
    ]);
  // Missions reference milestones, so delete missions first.
  for (const m of existingMissions) await adapter.deleteMission(m.id);
  for (const ms of existingMilestones) await adapter.deleteMilestone(ms.id);
  for (const r of existingResources) await adapter.deleteResource(r.id);

  // 2. Milestones - sort by order, register order → newId.
  const milestoneIdByOrder = new Map<number, string>();
  const sortedMilestones = [...template.milestones].sort(
    (a, b) => a.order - b.order,
  );
  for (const ms of sortedMilestones) {
    const created = await adapter.createMilestone({ ...ms, sessionId: sid });
    milestoneIdByOrder.set(ms.order, created.id);
  }

  // 3. Missions - _milestoneOrder embedded at export time.
  const missionIdByOrder = new Map<number, string>();
  for (const { _milestoneOrder, ...missionData } of template.missions) {
    const newMilestoneId = milestoneIdByOrder.get(_milestoneOrder) ?? "";
    const created = await adapter.createMission({
      ...missionData,
      sessionId: sid,
      milestoneId: newMilestoneId,
    });
    missionIdByOrder.set(missionData.order, created.id);
  }

  // 4. FormSchemas - _missionOrder embedded at export time.
  for (const { _missionOrder, ...schemaData } of template.formSchemas) {
    const newMissionId = missionIdByOrder.get(_missionOrder) ?? "";
    await adapter.upsertFormSchema(newMissionId, schemaData.fields);
  }

  // 5. Resources.
  for (const resource of template.resources) {
    await adapter.createResource({ ...resource, sessionId: sid });
  }
};
