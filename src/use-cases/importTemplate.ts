import type { AppAdapter } from "../adapters/interface.ts";
import type { TemplateExport } from "../types/index.ts";

// Creates all records from a TemplateExport into the adapter.
// Returns the new sessionId so the caller can route to the admin cockpit.
//
// Import order per SPECS.md:
//  1. Session → new sessionId
//  2. Milestones in order → oldId → newId map
//  3. Missions, remapping milestoneId
//  4. FormSchemas, remapping missionId
//  5. Resources with new sessionId
export async function importTemplate(
  template: TemplateExport,
  sessionName: string,
  gameMakerUid: string,
  adapter: AppAdapter
): Promise<string> {
  const session = await adapter.createSession(sessionName, gameMakerUid);
  const sessionId = session.id;

  // 1. Milestones — sort by order before inserting
  const milestoneIdMap = new Map<string, string>(); // oldKey → newId
  const sortedMilestones = [...template.milestones].sort(
    (a, b) => a.order - b.order
  );

  for (const ms of sortedMilestones) {
    // Templates have no PB IDs — use sessionId+order as the old key for mapping
    const oldKey = `ms_order_${ms.order}`;
    const created = await adapter.createMilestone({ ...ms, sessionId });
    milestoneIdMap.set(oldKey, created.id);
  }

  // 2. Missions — remap milestoneId via order-based key
  const missionIdMap = new Map<string, string>(); // order → newId
  for (const mission of template.missions) {
    // Find which milestone this mission belongs to by matching order
    const msIdx = sortedMilestones.findIndex(
      (_ms, i) => i === sortedMilestones.findIndex((m) => m === _ms)
    );
    // Re-derive the mapping key from milestone order
    const msMilestoneIdx = sortedMilestones.findIndex(
      (ms) => ms.sessionId === mission.sessionId
    );
    const msKey = `ms_order_${sortedMilestones[msMilestoneIdx]?.order ?? 0}`;
    const newMilestoneId = milestoneIdMap.get(msKey) ?? "";
    void msIdx; // suppress unused warning

    const created = await adapter.createMission({
      ...mission,
      sessionId,
      milestoneId: newMilestoneId,
    });
    missionIdMap.set(`mission_order_${mission.order}`, created.id);
  }

  // 3. FormSchemas — remap missionId via order
  for (const schema of template.formSchemas) {
    const missionOrder = template.missions.findIndex(
      (m) => m.milestoneId === schema.missionId
    );
    const newMissionId =
      missionIdMap.get(`mission_order_${missionOrder}`) ?? "";
    await adapter.upsertFormSchema(newMissionId, schema.fields);
  }

  // 4. Resources
  for (const resource of template.resources) {
    await adapter.createResource({ ...resource, sessionId });
  }

  return sessionId;
}
