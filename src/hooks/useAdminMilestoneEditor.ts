import { useCallback, useEffect, useRef, useState } from "react";
import type { DraftMilestone, Milestone } from "../types/index.ts";
import { useAdapter } from "../adapters/useAdapter.ts";
import { makeId } from "../utils/id.ts";
import { gridPositions } from "../utils/mapGrid.ts";

const defaultDraftMilestone = (
  id: string,
  name: string,
  xPercent: number,
  yPercent: number,
): DraftMilestone => ({ id, name, xPercent, yPercent, isDirty: false });

interface UseAdminMilestoneEditorResult {
  readonly draftMilestones: ReadonlyArray<DraftMilestone>;
  readonly selectedMilestone: Milestone | null;
  readonly setSelectedMilestone: (ms: Milestone | null) => void;
  readonly handleNodeDrop: (
    id: string,
    xPercent: number,
    yPercent: number,
  ) => void;
  readonly handleAddMilestone: () => void;
  readonly handleAddMilestoneAt: (
    xPercent: number,
    yPercent: number,
  ) => void;
  readonly handleRenameMilestone: (id: string, name: string) => void;
  readonly handleDeleteMilestone: (id: string) => void;
  /** Reposition all milestones to a sequential 4-column grid layout. */
  readonly handleResetToGrid: () => void;
  /** Save dirty milestones to the adapter. Returns the IDs that were created. */
  readonly saveMilestones: (
    sid: string,
    milestones: ReadonlyArray<Milestone>,
  ) => Promise<void>;
  readonly discardMilestones: (milestones: ReadonlyArray<Milestone>) => void;
  /** Clears dirty flags after a successful save. */
  readonly clearDirtyMilestones: () => void;
  readonly draftMilestonesAreDirty: boolean;
}

/**
 * Manages draft milestone state for the admin map editor.
 * Milestones are seeded once from the server-fetched list and tracked locally
 * until an explicit save or discard.
 */
export const useAdminMilestoneEditor = (
  milestones: ReadonlyArray<Milestone>,
): UseAdminMilestoneEditorResult => {
  const adapter = useAdapter();
  const [draftMilestones, setDraftMilestones] = useState<
    ReadonlyArray<DraftMilestone>
  >([]);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null,
  );
  const seeded = useRef(false);

  // Seed once from real milestones
  useEffect(() => {
    if (seeded.current || milestones.length === 0) return;
    seeded.current = true;
    setDraftMilestones(
      milestones.map((ms) =>
        defaultDraftMilestone(ms.id, ms.name, ms.xPercent, ms.yPercent)
      ),
    );
  }, [milestones]);

  const handleNodeDrop = useCallback(
    (id: string, xPercent: number, yPercent: number) => {
      setDraftMilestones((prev) =>
        prev.map((dm) =>
          dm.id === id ? { ...dm, xPercent, yPercent, isDirty: true } : dm
        )
      );
    },
    [],
  );

  const handleAddMilestone = useCallback(() => {
    const id = makeId();
    setDraftMilestones((prev) => [
      ...prev,
      defaultDraftMilestone(id, "New milestone", 50, 50),
    ]);
  }, []);

  const handleAddMilestoneAt = useCallback(
    (xPercent: number, yPercent: number) => {
      const id = makeId();
      setDraftMilestones((prev) => [
        ...prev,
        defaultDraftMilestone(id, "New Milestone", xPercent, yPercent),
      ]);
    },
    [],
  );

  const handleRenameMilestone = useCallback((id: string, name: string) => {
    setDraftMilestones((prev) =>
      prev.map((dm) => dm.id === id ? { ...dm, name, isDirty: true } : dm)
    );
  }, []);

  const handleDeleteMilestone = useCallback((id: string) => {
    setDraftMilestones((prev) => prev.filter((dm) => dm.id !== id));
  }, []);

  const handleResetToGrid = useCallback(() => {
    setDraftMilestones((prev) => {
      const positions = gridPositions(prev.length);
      return prev.map((dm, i) => ({
        ...dm,
        xPercent: positions[i]!.xPercent,
        yPercent: positions[i]!.yPercent,
        isDirty: true,
      }));
    });
  }, []);

  const saveMilestones = useCallback(
    async (
      sid: string,
      serverMilestones: ReadonlyArray<Milestone>,
    ) => {
      for (const dm of draftMilestones) {
        const real = serverMilestones.find((m) => m.id === dm.id);
        if (real) {
          await adapter.updateMilestone(dm.id, {
            name: dm.name,
            xPercent: dm.xPercent,
            yPercent: dm.yPercent,
          });
        } else {
          const maxOrder = serverMilestones.reduce(
            (max, m) => Math.max(max, m.order),
            0,
          );
          await adapter.createMilestone({
            sessionId: sid,
            name: dm.name,
            xPercent: dm.xPercent,
            yPercent: dm.yPercent,
            xpThreshold: 100,
            order: maxOrder + 1,
          });
        }
      }
    },
    [adapter, draftMilestones],
  );

  const discardMilestones = useCallback(
    (serverMilestones: ReadonlyArray<Milestone>) => {
      setDraftMilestones(
        serverMilestones.map((ms) =>
          defaultDraftMilestone(ms.id, ms.name, ms.xPercent, ms.yPercent)
        ),
      );
    },
    [],
  );

  const clearDirtyMilestones = useCallback(() => {
    setDraftMilestones((prev) => prev.map((dm) => ({ ...dm, isDirty: false })));
  }, []);

  const draftMilestonesAreDirty = draftMilestones.some((dm) => dm.isDirty);

  return {
    draftMilestones,
    selectedMilestone,
    setSelectedMilestone,
    handleNodeDrop,
    handleAddMilestone,
    handleAddMilestoneAt,
    handleRenameMilestone,
    handleDeleteMilestone,
    handleResetToGrid,
    saveMilestones,
    discardMilestones,
    clearDirtyMilestones,
    draftMilestonesAreDirty,
  };
};
