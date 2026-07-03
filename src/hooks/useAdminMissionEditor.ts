import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DraftMission, Mission } from "../types/index.ts";
import { MISSION_TYPE } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { deriveXP } from "../use-cases/deriveXP.ts";
import { makeId } from "../utils/id.ts";

// ── XP preview helper ──────────────────────────────────────────────────────────

const computeXPPreview = (
  draft: DraftMission,
  msMissions: ReadonlyArray<Mission>,
): number => {
  const synthetic: Mission = {
    id: "__draft__",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    sessionId: "",
    milestoneId: draft.milestoneId,
    title: draft.title ?? "",
    body: draft.body ?? "",
    type: draft.type ?? MISSION_TYPE.TEXT,
    difficulty: draft.difficulty ?? 1,
    xpValue: 0,
    tags: draft.tags ?? [],
    order: msMissions.length,
    isInCurrentMissions: draft.isInCurrentMissions ?? true,
    validationMethod: draft.validationMethod ?? "gmApprove",
  };
  const allMissions: ReadonlyArray<Mission> = [...msMissions, synthetic];
  const xpValues = deriveXP(allMissions);
  return xpValues[xpValues.length - 1] ?? 0;
};

const defaultDraftMission = (milestoneId: string): DraftMission => ({
  milestoneId,
  isDirty: false,
  difficulty: 1, // Matches UI default so xpPreview doesn't short-circuit on undefined
});

// ── Hook ───────────────────────────────────────────────────────────────────────

interface UseAdminMissionEditorResult {
  readonly selectedMissionId: string | null;
  readonly activeDraftMission: DraftMission | null;
  readonly draftMissions: ReadonlyMap<string, DraftMission>;
  readonly xpPreview: number;
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
    xpPreview: number,
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

  useEffect(() => {
    draftMissionsRef.current = draftMissions;
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
          difficulty: real.difficulty,
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

  const handleMissionReorder = useCallback(
    (missionId: string, newOrder: number) => {
      setMissionOrderChanges((prev) => new Map(prev).set(missionId, newOrder));
    },
    [],
  );

  const handleDeleteMission = useCallback(async (missionId: string) => {
    // Only call the adapter for missions that actually exist server-side —
    // a freshly-added draft mission (keyed by its local draft id) has no PB
    // record yet.
    const isPersisted = missions.some((m) => m.id === missionId);
    if (isPersisted) {
      await adapter.deleteMission(missionId);
    }
    setDeletedMissionIds((prev) => new Set([...prev, missionId]));
    // If the deleted mission was being edited, remove its draft and deselect
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

  const xpPreview = useMemo(() => {
    if (!selectedMissionId) return 0;
    const draft = draftMissions.get(selectedMissionId);
    if (!draft || draft.difficulty === undefined) return 0;
    const msMissions = missions.filter(
      (m) => m.milestoneId === draft.milestoneId && m.id !== selectedMissionId,
    );
    return computeXPPreview(draft, msMissions);
  }, [selectedMissionId, draftMissions, missions]);

  const draftMissionsAreDirty = [...draftMissions.values()].some(
    (dm) => dm.isDirty,
  );

  const saveMissions = useCallback(
    async (
      sid: string,
      serverMissions: ReadonlyArray<Mission>,
      xp: number,
    ) => {
      const drafts = draftMissionsRef.current;

      // 1. Save mission content, capturing the effective server-side id for
      // each draft (either the pre-existing originalId, or the id newly
      // assigned by createMission) so step 2 can save form schemas for
      // brand-new form missions too, not just ones that already existed.
      for (const [, draft] of drafts) {
        if (!draft.isDirty) continue;

        let effectiveId: string | undefined = draft.originalId;

        if (draft.originalId) {
          const real = serverMissions.find((m) => m.id === draft.originalId);
          if (real) {
            await adapter.updateMission(draft.originalId, {
              title: draft.title ?? real.title,
              body: draft.body ?? real.body,
              type: draft.type ?? real.type,
              externalUrl: draft.externalUrl,
              difficulty: draft.difficulty ?? real.difficulty,
              tags: draft.tags ?? real.tags,
              suggestedDueDate: draft.suggestedDueDate ?? real.suggestedDueDate,
              validationMethod: draft.validationMethod ?? real.validationMethod,
              isInCurrentMissions: draft.isInCurrentMissions ??
                real.isInCurrentMissions,
            });
          }
        } else {
          // draft.milestoneId is the client-generated ID. Since we pass id: dm.id
          // to createMilestone, the server assigns that same ID, so no remapping
          // needed — draft milestoneId is already the server ID.
          const created = await adapter.createMission({
            sessionId: sid,
            milestoneId: draft.milestoneId,
            title: draft.title ?? "New mission",
            body: draft.body ?? "",
            type: draft.type ?? MISSION_TYPE.TEXT,
            difficulty: draft.difficulty ?? 1,
            xpValue: Math.max(1, xp), // PB Required rejects 0; clamp to 1 as floor
            tags: draft.tags ?? [],
            order: drafts.size,
            isInCurrentMissions: draft.isInCurrentMissions ?? true,
            validationMethod: draft.validationMethod ?? "gmApprove",
          });
          effectiveId = created.id;
        }

        // 2. Save this draft's form schema now, while we know its real id —
        // covers both "just updated" and "just created" missions.
        if (
          effectiveId && draft.type === MISSION_TYPE.FORM &&
          draft.formFields?.length
        ) {
          await adapter.upsertFormSchema(effectiveId, draft.formFields);
        }
      }

      // 3. Persist reorder changes
      for (const [missionId, newOrder] of missionOrderChanges) {
        await adapter.updateMission(missionId, { order: newOrder });
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
    xpPreview,
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
