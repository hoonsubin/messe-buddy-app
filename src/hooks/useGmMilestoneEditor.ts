import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

interface UseGmMilestoneEditorResult {
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
  /**
   * Deletes a milestone. If it's already persisted (present in the
   * server-fetched `milestones` list), this calls `adapter.deleteMilestone`
   * before removing it from local draft state — a not-yet-saved draft
   * milestone is just dropped locally, since there's nothing to delete
   * server-side yet. Throws if the server delete fails; callers should
   * catch and surface an error rather than assume the delete succeeded.
   */
  readonly handleDeleteMilestone: (id: string) => Promise<void>;
  /** Reposition all milestones to a sequential 4-column grid layout. */
  readonly handleResetToGrid: () => void;
  /**
   * Save dirty milestones to the adapter.
   * Passes `id: dm.id` to the adapter on create, so the server assigns our
   * client-generated ID — draft ID === server ID from creation onward.
   */
  readonly saveMilestones: (
    sid: string,
    milestones: ReadonlyArray<Milestone>,
    playerId: string,
  ) => Promise<void>;
  readonly discardMilestones: (milestones: ReadonlyArray<Milestone>) => void;
  /** Clears dirty flags after a successful save. */
  readonly clearDirtyMilestones: () => void;
  readonly draftMilestonesAreDirty: boolean;
}

/**
 * Manages draft milestone state for the GM map editor.
 * Milestones are seeded once from the server-fetched list and tracked locally
 * until an explicit save or discard.
 */
export const useGmMilestoneEditor = (
  milestones: ReadonlyArray<Milestone>,
): UseGmMilestoneEditorResult => {
  const adapter = useAdapter();
  const [draftMilestones, setDraftMilestones] = useState<
    ReadonlyArray<DraftMilestone>
  >([]);
  // Track the *id* of the currently-open milestone, not a Milestone snapshot.
  // The exposed `selectedMilestone` is derived below from the live draft, so
  // renames/moves in the sheet reflect immediately instead of showing the
  // milestone as it looked at open time (C-22, P-01).
  const [selectedMilestoneId, setSelectedMilestoneIdState] = useState<
    string | null
  >(null);
  const seededSig = useRef<string>("");

  // Seed from real milestones, and re-seed whenever the underlying milestone
  // id-set changes (e.g. applying a different template replaces them). Edits
  // are saved via handleSave (ids preserved), so a save+refresh keeps the same
  // signature and won't clobber in-progress work.
  useEffect(() => {
    if (milestones.length === 0) {
      seededSig.current = "";
      return;
    }
    const sig = milestones.map((m) => m.id).join("|");
    if (sig === seededSig.current) return;
    seededSig.current = sig;
    setDraftMilestones(
      milestones.map((ms) =>
        defaultDraftMilestone(ms.id, ms.name, ms.xPercent, ms.yPercent)
      ),
    );
  }, [milestones]);

  const setSelectedMilestone = useCallback((ms: Milestone | null) => {
    setSelectedMilestoneIdState(ms?.id ?? null);
  }, []);

  // Compose the exposed milestone from (a) the live draft (source of truth
  // for name + position) and (b) the server-fetched record for fields the
  // draft does not carry (order, xpThreshold, timestamps, sessionId). If the
  // milestone was just added client-side there is no server record yet; fall
  // back to safe defaults so the union is still a valid `Milestone`.
  const selectedMilestone = useMemo<Milestone | null>(() => {
    if (!selectedMilestoneId) return null;
    const draft = draftMilestones.find((dm) => dm.id === selectedMilestoneId);
    if (!draft) return null;
    const real = milestones.find((m) => m.id === selectedMilestoneId);
    const now = new Date().toISOString();
    return {
      id: draft.id,
      name: draft.name,
      xPercent: draft.xPercent,
      yPercent: draft.yPercent,
      order: real?.order ?? 0,
      sessionId: real?.sessionId ?? "",
      playerId: real?.playerId ?? "",
      xpThreshold: real?.xpThreshold ?? 100,
      created: real?.created ?? now,
      updated: real?.updated ?? now,
    };
  }, [selectedMilestoneId, draftMilestones, milestones]);

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
      { ...defaultDraftMilestone(id, "New Milestone", 50, 50), isDirty: true },
    ]);
  }, []);

  const handleAddMilestoneAt = useCallback(
    (xPercent: number, yPercent: number) => {
      const id = makeId();
      setDraftMilestones((prev) => [
        ...prev,
        {
          ...defaultDraftMilestone(id, "New Milestone", xPercent, yPercent),
          isDirty: true,
        },
      ]);
    },
    [],
  );

  const handleRenameMilestone = useCallback((id: string, name: string) => {
    setDraftMilestones((prev) =>
      prev.map((dm) => dm.id === id ? { ...dm, name, isDirty: true } : dm)
    );
  }, []);

  const handleDeleteMilestone = useCallback(async (id: string) => {
    // Only call the adapter for milestones that actually exist server-side —
    // a freshly-added draft milestone (not yet saved) has no PB record yet.
    const isPersisted = milestones.some((m) => m.id === id);
    if (isPersisted) {
      await adapter.deleteMilestone(id);
    }
    setDraftMilestones((prev) => prev.filter((dm) => dm.id !== id));
    setSelectedMilestoneIdState((prev) => (prev === id ? null : prev));
  }, [adapter, milestones]);

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
      playerId: string,
    ): Promise<void> => {
      for (const dm of draftMilestones) {
        const real = serverMilestones.find((m) => m.id === dm.id);
        if (real) {
          if (dm.isDirty) {
            await adapter.updateMilestone(dm.id, {
              name: dm.name,
              xPercent: dm.xPercent,
              yPercent: dm.yPercent,
            });
          }
        } else {
          const maxOrder = serverMilestones.reduce(
            (max, m) => Math.max(max, m.order),
            0,
          );
          // Pass id: dm.id so PocketBase assigns our client-generated ID.
          // Draft ID === server ID — no post-save remapping needed.
          await adapter.createMilestone({
            id: dm.id,
            sessionId: sid,
            playerId,
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
