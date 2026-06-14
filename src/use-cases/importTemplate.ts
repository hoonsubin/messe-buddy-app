import type { AppAdapter } from "../adapters/interface.ts";
import type { TemplateExport } from "../types/index.ts";

// Creates all records from a TemplateExport into the adapter.
// Returns the new sessionId so the caller can route to the admin cockpit.
//
// Import order per SPECS.md:
//  1. Session → new sessionId
//  2. Milestones in order → order → newId map
//  3. Missions, remapping milestoneId via _milestoneOrder
//  4. FormSchemas, remapping missionId via _missionOrder
//  5. Resources with new sessionId
export const importTemplate = async (
  template: TemplateExport,
  sessionName: string,
  gameMakerUid: string,
  adapter: AppAdapter
): Promise<string> => {
  const session = await adapter.createSession(sessionName, gameMakerUid);
  const sessionId = session.id;

  // 1. Milestones — sort by order, then register order → newId
  const milestoneIdByOrder = new Map<number, string>();
  const sortedMilestones = [...template.milestones].sort(
    (a, b) => a.order - b.order
  );
  for (const ms of sortedMilestones) {
    const created = await adapter.createMilestone({ ...ms, sessionId });
    milestoneIdByOrder.set(ms.order, created.id);
  }

  // 2. Missions — _milestoneOrder was embedded at export time (see exportTemplate.ts)
  const missionIdByOrder = new Map<number, string>();
  for (const { _milestoneOrder, ...missionData } of template.missions) {
    const newMilestoneId = milestoneIdByOrder.get(_milestoneOrder) ?? "";
    const created = await adapter.createMission({
      ...missionData,
      sessionId,
      milestoneId: newMilestoneId,
    });
    missionIdByOrder.set(missionData.order, created.id);
  }

  // 3. FormSchemas — _missionOrder was embedded at export time (see exportTemplate.ts)
  for (const { _missionOrder, ...schemaData } of template.formSchemas) {
    const newMissionId = missionIdByOrder.get(_missionOrder) ?? "";
    await adapter.upsertFormSchema(newMissionId, schemaData.fields);
  }

  // 4. Resources
  for (const resource of template.resources) {
    await adapter.createResource({ ...resource, sessionId });
  }

  return sessionId;
}
