import type { AppAdapter } from "../adapters/interface.ts";
import type { TemplateExport } from "../types/index.ts";

/** Seeds a player's journey from a template. Does not create sessions. */
export const importTemplate = async (
  template: TemplateExport,
  playerId: string,
  adapter: AppAdapter,
): Promise<void> => {
  const player = await adapter.getPlayerById(playerId);
  if (!player) throw new Error(`Player not found: ${playerId}`);
  const sessionId = player.sessionId;

  const [existingMissions, existingMilestones, existingAttachments] =
    await Promise.all([
      adapter.listMissions(sessionId, { playerId }),
      adapter.listMilestones(sessionId, { playerId }),
      adapter.listMilestoneResources(playerId),
    ]);

  for (const m of existingMissions) await adapter.deleteMission(m.id);
  for (const ms of existingMilestones) await adapter.deleteMilestone(ms.id);
  for (const mr of existingAttachments) {
    await adapter.detachMilestoneResource(mr.id);
  }

  const milestoneIdByOrder = new Map<number, string>();
  const sortedMilestones = [...template.milestones].sort(
    (a, b) => a.order - b.order,
  );
  for (const ms of sortedMilestones) {
    const created = await adapter.createMilestone({
      ...ms,
      sessionId,
      playerId,
    });
    milestoneIdByOrder.set(ms.order, created.id);
  }

  const missionIdByOrder = new Map<number, string>();
  for (const { _milestoneOrder, ...missionData } of template.missions) {
    const newMilestoneId = milestoneIdByOrder.get(_milestoneOrder) ?? "";
    const created = await adapter.createMission({
      ...missionData,
      sessionId,
      playerId,
      milestoneId: newMilestoneId,
    });
    missionIdByOrder.set(missionData.order, created.id);
  }

  for (const { _missionOrder, ...schemaData } of template.formSchemas) {
    const newMissionId = missionIdByOrder.get(_missionOrder) ?? "";
    await adapter.upsertFormSchema(newMissionId, schemaData.fields);
  }

  const library = await adapter.listLibraryResources();
  const libByKey = new Map(library.map((r) => [r.resourceKey, r.id]));
  for (const binding of template.resourceBindings) {
    const libId = libByKey.get(binding.resourceKey);
    const milestoneId = milestoneIdByOrder.get(binding.milestoneOrder);
    if (!libId || !milestoneId) continue;
    await adapter.attachMilestoneResource({
      sessionId,
      playerId,
      milestoneId,
      libraryResourceId: libId,
      isVisibleToPlayer: true,
    });
  }
};
