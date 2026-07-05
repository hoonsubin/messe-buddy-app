import { useCallback, useEffect, useRef, useState } from "react";
import type { DraftMission, Milestone, Mission } from "../types/index.ts";
import { MISSION_TYPE } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { computeMilestoneThreshold } from "../use-cases/computeMilestoneThreshold.ts";
import { makeId } from "../utils/id.ts";

const DEFAULT_XP = 10;

const defaultDraftMission = (milestoneId: string): DraftMission => ({
  milestoneId,
  isDirty: false,
  xpValue: DEFAULT_XP,
});

// ── Hook ───────────────────────────────────────────────────────────────────────

interface UseAdminMissionEditorResult {
  readonly selectedMissionId: string | null;
  readonly activeDraftMission: DraftMission | null;
  readonly draftMissions: ReadonlyMap<string, DraftMission>;
  readonly missionOrderChanges: ReadonlyMap<string, number>;
  readonly deletedMissionIds: ReadonlySet<string>;
  readonly draftMissionsAreDirty: boolean;
  readonly handleMissionSelect: (missionId: string) => void;
  readonly handleAddMission: (milestoneId: string) => void;
  readonly handleDraftChange: (draft: DraftMission) => void;
  readonly handleMissionReorder: (missionId: string, newOrder: number) => void;
  /**
   * Deletes a mission. If it's already persisted (present in the
   * server-fetched `missions` list), this calls `adapter.deleteMission`
   * before hiding it from the UI — a not-yet-saved draft mission (keyed by
   * its local draft id) is just dropped locally. Throws if the server
   * delete fails; callers should catch and surface an error.
   */
  readonly handleDeleteMission: (missionId: string) => Promise<void>;
  readonly clearSelectedMission: () => void;
  readonly saveMissions: (
    sid: string,
    missions: ReadonlyArray<Mission>,
    milestones: ReadonlyArray<Milestone>,
  ) => Promise<void>;
  readonly discardMissions: () => void;
  readonly clearDirtyMissions: () => void;
  readonly clearOrderChanges: () => void;
}

/**
 * Manages draft mission state for the admin mission editor.
 * Missions are keyed by a local draft ID (not the PB mission ID) so new and
 * existing missions share the same map structure.
 */
export const useAdminMissionEditor = (
  missions: ReadonlyArray<Mission>,
): UseAdminMissionEditorResult => {
  const adapter = useAdapter();
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(
    null,
  );
  const [draftMissions, setDraftMissions] = useState<
    ReadonlyMap<string, DraftMission>
  >(new Map());
  const [missionOrderChanges, setMissionOrderChanges] = useState<
    ReadonlyMap<string, number>
  >(new Map());
  const [deletedMissionIds, setDeletedMissionIds] = useState<
    ReadonlySet<string>
  >(
    new Set(),
  );
  const draftMissionsRef = useRef(draftMissions);
  const deletedMissionIdsRef = useRef(deletedMissionIds);

  useEffect(() => {
    draftMissionsRef.current = draftMissions;
  });

  useEffect(() => {
    deletedMissionIdsRef.current = deletedMissionIds;
  });

  const handleMissionSelect = useCallback(
    (missionId: string) => {
      setSelectedMissionId(missionId);
      setDraftMissions((prev) => {
        if (prev.has(missionId)) return prev;
        const real = missions.find((m) => m.id === missionId);
        if (!real) return prev;
        const draft: DraftMission = {
          milestoneId: real.milestoneId,
          originalId: real.id,
          isDirty: false,
          title: real.title,
          body: real.body,
          type: real.type,
          externalUrl: real.externalUrl,
          xpValue: real.xpValue,
          tags: real.tags,
          suggestedDueDate: real.suggestedDueDate,
          validationMethod: real.validationMethod,
          isInCurrentMissions: real.isInCurrentMissions,
          formFields: [],
        };
        return new Map(prev).set(missionId, draft);
      });
    },
    [missions],
  );

  const handleAddMission = useCallback((milestoneId: string) => {
    const draftId = makeId();
    const draft = defaultDraftMission(milestoneId);
    setDraftMissions((prev) => new Map(prev).set(draftId, draft));
    setSelectedMissionId(draftId);
  }, []);

  const handleDraftChange = useCallback(
    (draft: DraftMission) => {
      if (!selectedMissionId) return;
      setDraftMissions((prev) =>
        new Map(prev).set(selectedMissionId, { ...draft, isDirty: true })
      );
    },
    [selectedMissionId],
  );

  // On drop, `newOrder` is the *positional index* within the milestone's
  // currently-visible mission list (see MissionListView). Storing that value
  // for the dragged mission alone would collide with siblings that still hold
  // their original server `order` and cause an unstable-tie sort in the sheet.
  // Instead, reconstruct the whole milestone's ordering after the reinsert
  // and write a change entry for every mission whose effective slot moved —
  // that way `sheetMissions`' sort always sees distinct values (C-22, P-01).
  const handleMissionReorder = useCallback(
    (missionId: string, newOrder: number) => {
      setMissionOrderChanges((prev) => {
        const moved = missions.find((m) => m.id === missionId);
        if (!moved) return prev;
        const deleted = deletedMissionIdsRef.current;
        const siblings = missions
          .filter((m) => m.milestoneId === moved.milestoneId)
          .filter((m) => !deleted.has(m.id))
          .slice()
          .sort((a, b) => {
            const ao = prev.get(a.id) ?? a.order;
            const bo = prev.get(b.id) ?? b.order;
            return ao - bo;
          });
        const fromIndex = siblings.findIndex((m) => m.id === missionId);
        if (fromIndex === -1) return prev;
        const clamped = Math.max(
          0,
          Math.min(newOrder, siblings.length - 1),
        );
        if (fromIndex === clamped) return prev;
        const [row] = siblings.splice(fromIndex, 1);
        siblings.splice(clamped, 0, row);
        const next = new Map(prev);
        siblings.forEach((m, i) => {
          // Skip entries where the effective order matches the server value,
          // so the change map only holds genuine deltas.
          if (i === m.order) next.delete(m.id);
          else next.set(m.id, i);
        });
        return next;
      });
    },
    [missions],
  );

  const handleDeleteMission = useCallback(async (missionId: string) => {
    const isPersisted = missions.some((m) => m.id === missionId);
    if (isPersisted) {
      await adapter.deleteMission(missionId);
    }
    setDeletedMissionIds((prev) => new Set([...prev, missionId]));
    setDraftMissions((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const [key, d] of next) {
        if (d.originalId === missionId || key === missionId) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setSelectedMissionId((prev) => (prev === missionId ? null : prev));
  }, [adapter, missions]);

  const clearSelectedMission = useCallback(() => {
    setSelectedMissionId(null);
  }, []);

  const activeDraftMission = selectedMissionId
    ? (draftMissions.get(selectedMissionId) ?? null)
    : null;

  const draftMissionsAreDirty = [...draftMissions.values()].some(
    (dm) => dm.isDirty,
  );

  const saveMissions = useCallback(
    async (
      sid: string,
      serverMissions: ReadonlyArray<Mission>,
      milestones: ReadonlyArray<Milestone>,
    ) => {
      const drafts = draftMissionsRef.current;
      const deleted = deletedMissionIdsRef.current;
      const effectiveById = new Map(
        serverMissions
          .filter((m) => !deleted.has(m.id))
          .map((m) => [m.id, { ...m }]),
      );
      const affectedMilestoneIds = new Set<string>();

      for (const [, draft] of drafts) {
        if (!draft.isDirty) continue;
        affectedMilestoneIds.add(draft.milestoneId);

        const xpValue = draft.xpValue ?? DEFAULT_XP;
        let effectiveId: string | undefined = draft.originalId;

        if (draft.originalId) {
          const real = effectiveById.get(draft.originalId);
          if (real) {
            await adapter.updateMission(draft.originalId, {
              title: draft.title ?? real.title,
              body: draft.body ?? real.body,
              type: draft.type ?? real.type,
              externalUrl: draft.externalUrl,
              xpValue,
              tags: draft.tags ?? real.tags,
              suggestedDueDate: draft.suggestedDueDate ?? real.suggestedDueDate,
              validationMethod: draft.validationMethod ?? real.validationMethod,
              isInCurrentMissions: draft.isInCurrentMissions ??
                real.isInCurrentMissions,
            });
            effectiveById.set(draft.originalId, { ...real, xpValue });
          }
        } else {
          const created = await adapter.createMission({
            sessionId: sid,
            milestoneId: draft.milestoneId,
            title: draft.title ?? "New mission",
            body: draft.body ?? "",
            type: draft.type ?? MISSION_TYPE.TEXT,
            xpValue,
            tags: draft.tags ?? [],
            order: drafts.size,
            isInCurrentMissions: draft.isInCurrentMissions ?? true,
            validationMethod: draft.validationMethod ?? "gmApprove",
          });
          effectiveId = created.id;
          effectiveById.set(created.id, created);
        }

        if (
          effectiveId && draft.type === MISSION_TYPE.FORM &&
          draft.formFields?.length
        ) {
          await adapter.upsertFormSchema(effectiveId, draft.formFields);
        }
      }

      for (const [missionId, newOrder] of missionOrderChanges) {
        await adapter.updateMission(missionId, { order: newOrder });
      }

      for (const id of deleted) {
        const removed = serverMissions.find((m) => m.id === id);
        if (removed) affectedMilestoneIds.add(removed.milestoneId);
      }

      const effectiveMissions = [...effectiveById.values()];
      const milestoneIdsToSync = affectedMilestoneIds.size > 0
        ? affectedMilestoneIds
        : new Set(milestones.map((m) => m.id));

      for (const milestoneId of milestoneIdsToSync) {
        const threshold = computeMilestoneThreshold(
          effectiveMissions,
          milestoneId,
        );
        await adapter.updateMilestone(milestoneId, { xpThreshold: threshold });
      }
    },
    [adapter, missionOrderChanges],
  );

  const discardMissions = useCallback(() => {
    setDraftMissions(new Map());
    setSelectedMissionId(null);
    setMissionOrderChanges(new Map());
    setDeletedMissionIds(new Set());
  }, []);

  const clearDirtyMissions = useCallback(() => {
    setDraftMissions((prev) => {
      const next = new Map(prev);
      for (const [key, dm] of next) {
        if (dm.isDirty) next.set(key, { ...dm, isDirty: false });
      }
      return next;
    });
  }, []);

  const clearOrderChanges = useCallback(() => {
    setMissionOrderChanges(new Map());
  }, []);

  return {
    selectedMissionId,
    activeDraftMission,
    draftMissions,
    missionOrderChanges,
    deletedMissionIds,
    draftMissionsAreDirty,
    handleMissionSelect,
    handleAddMission,
    handleDraftChange,
    handleMissionReorder,
    handleDeleteMission,
    clearSelectedMission,
    saveMissions,
    discardMissions,
    clearDirtyMissions,
    clearOrderChanges,
  };
};
