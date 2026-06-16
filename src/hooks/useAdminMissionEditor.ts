import { useCallback, useMemo, useState } from "react";
import type { DraftMission, Mission } from "../types/index.ts";
import { MISSION_TYPE } from "../types/index.ts";
import type { AppAdapter } from "../adapters/interface.ts";
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
});

// ── Hook ───────────────────────────────────────────────────────────────────────

interface UseAdminMissionEditorResult {
  readonly selectedMissionId: string | null;
  readonly activeDraftMission: DraftMission | null;
  readonly draftMissions: ReadonlyMap<string, DraftMission>;
  readonly xpPreview: number;
  readonly missionOrderChanges: ReadonlyMap<string, number>;
  readonly draftMissionsAreDirty: boolean;
  readonly handleMissionSelect: (missionId: string) => void;
  readonly handleAddMission: (milestoneId: string) => void;
  readonly handleDraftChange: (draft: DraftMission) => void;
  readonly handleMissionReorder: (missionId: string, newOrder: number) => void;
  readonly clearSelectedMission: () => void;
  readonly saveMissions: (
    sid: string,
    adapter: AppAdapter,
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
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(
    null,
  );
  const [draftMissions, setDraftMissions] = useState<
    ReadonlyMap<string, DraftMission>
  >(new Map());
  const [missionOrderChanges, setMissionOrderChanges] = useState<
    ReadonlyMap<string, number>
  >(new Map());

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
      adapter: AppAdapter,
      serverMissions: ReadonlyArray<Mission>,
      xp: number,
    ) => {
      // 1. Save mission content
      for (const [, draft] of draftMissions) {
        if (!draft.isDirty) continue;
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
          await adapter.createMission({
            sessionId: sid,
            milestoneId: draft.milestoneId,
            title: draft.title ?? "New mission",
            body: draft.body ?? "",
            type: draft.type ?? MISSION_TYPE.TEXT,
            difficulty: draft.difficulty ?? 1,
            xpValue: xp,
            tags: draft.tags ?? [],
            order: 0,
            isInCurrentMissions: draft.isInCurrentMissions ?? true,
            validationMethod: draft.validationMethod ?? "gmApprove",
          });
        }
      }

      // 2. Save form schemas
      for (const [, draft] of draftMissions) {
        if (!draft.isDirty || draft.type !== MISSION_TYPE.FORM) continue;
        if (draft.originalId && draft.formFields?.length) {
          await adapter.upsertFormSchema(draft.originalId, draft.formFields);
        }
      }

      // 3. Persist reorder changes
      for (const [missionId, newOrder] of missionOrderChanges) {
        await adapter.updateMission(missionId, { order: newOrder });
      }
    },
    [draftMissions, missionOrderChanges],
  );

  const discardMissions = useCallback(() => {
    setDraftMissions(new Map());
    setSelectedMissionId(null);
    setMissionOrderChanges(new Map());
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
    draftMissionsAreDirty,
    handleMissionSelect,
    handleAddMission,
    handleDraftChange,
    handleMissionReorder,
    clearSelectedMission,
    saveMissions,
    discardMissions,
    clearDirtyMissions,
    clearOrderChanges,
  };
};
