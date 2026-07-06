import type { AppAdapter } from "../adapters/interface.ts";
import type { TemplateExport } from "../types/index.ts";

/**
 * Seeds a player's journey from a template. Does not create sessions.
 *
 * Walks the template's milestone/mission tree directly: each milestone is
 * created, then each of its missions is created with the milestone id just
 * returned, then each form mission's fields are attached with the mission id
 * just returned. Order is assigned from array position at creation time.
 * There are no numeric cross-references to resolve — nesting already told us
 * exactly which mission a form's fields belong to.
 */
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

  const library = await adapter.listLibraryResources();
  const libIdByResourceKey = new Map(
    library.map((r) => [r.resourceKey, r.id]),
  );

  for (const [milestoneIndex, ms] of template.milestones.entries()) {
    const { missions, resources, ...milestoneData } = ms;

    const createdMilestone = await adapter.createMilestone({
      ...milestoneData,
      sessionId,
      playerId,
      order: milestoneIndex,
    });

    for (const [missionIndex, mission] of missions.entries()) {
      const { formFields, ...missionData } = mission;

      const createdMission = await adapter.createMission({
        ...missionData,
        sessionId,
        playerId,
        milestoneId: createdMilestone.id,
        order: missionIndex,
      });

      if (formFields) {
        await adapter.upsertFormSchema(createdMission.id, formFields);
      }
    }

    for (const resourceKey of resources ?? []) {
      const libraryResourceId = libIdByResourceKey.get(resourceKey);
      if (!libraryResourceId) continue;
      await adapter.attachMilestoneResource({
        sessionId,
        playerId,
        milestoneId: createdMilestone.id,
        libraryResourceId,
        isVisibleToPlayer: true,
      });
    }
  }
};
