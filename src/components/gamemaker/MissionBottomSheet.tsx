import { useCallback, useEffect, useMemo, useState } from "react";
import { MdArrowBack, MdClose, MdEditNote } from "react-icons/md";
import type {
  DraftMission,
  Milestone,
  Mission,
  Resource,
} from "../../types/index.ts";
import type { AddResourceInput } from "../../hooks/useResources.ts";
import type { StoredDraft } from "../../utils/draftStorage.ts";
import {
  clearStoredDraft,
  loadStoredDraft,
  saveStoredDraft,
} from "../../utils/draftStorage.ts";
import ConfirmSheet from "./ConfirmSheet.tsx";
import { BottomSheet } from "../patterns/BottomSheet.tsx";
import MissionEditorView from "./MissionEditorView.tsx";
import MissionListView from "./MissionListView.tsx";
import ResourcesEditor from "./ResourcesEditor.tsx";
import SaveActions from "./SaveActions.tsx";

// ── Types ─────────────────────────────────────────────────────────────────────

type SheetView = "list" | "editor";
type ConfirmState = "idle" | "pending-close" | "pending-back";

interface MissionBottomSheetProps {
  readonly isOpen: boolean;
  readonly milestone: Milestone | null;
  readonly missions: ReadonlyArray<Mission>;
  readonly activeMissionId: string | null;
  readonly draft: DraftMission | null;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly sessionId: string;
  readonly onMissionSelect: (missionId: string) => void;
  readonly onDraftChange: (draft: DraftMission) => void;
  readonly onRename: (newName: string) => void;
  readonly onSave: () => void;
  readonly onDiscard: () => void;
  readonly onAddMission: () => void;
  readonly onDeleteMission: (missionId: string) => void;
  readonly onReorderMission: (missionId: string, newOrder: number) => void;
  readonly onClose: () => void;
  readonly milestoneResources: ReadonlyArray<Resource>;
  readonly onAddResource: (data: AddResourceInput) => void;
  readonly onUpdateResource: (
    resourceId: string,
    patch: Partial<
      Pick<Resource, "title" | "type" | "url" | "isVisibleToPlayer">
    >,
  ) => void;
  readonly onDeleteResource: (resourceId: string) => void;
  readonly onToggleResourceVisibility: (
    resourceId: string,
    visible: boolean,
  ) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const MissionBottomSheet = (props: MissionBottomSheetProps) => {
  const {
    isOpen,
    milestone,
    missions,
    activeMissionId,
    draft,
    isDirty,
    isSaving,
    sessionId,
    onMissionSelect,
    onDraftChange,
    onRename,
    onSave,
    onDiscard,
    onAddMission,
    onDeleteMission,
    onReorderMission,
    onClose,
    milestoneResources,
    onAddResource,
    onUpdateResource,
    onDeleteResource,
    onToggleResourceVisibility,
  } = props;

  // ── View state ──────────────────────────────────────────────────────────────
  // When the user taps "back" in the editor we record which mission they
  // dismissed so derived view stays on the list until a different mission is
  // selected (avoids setState-in-effect for external activeMissionId sync).
  const [backDismissedForMissionId, setBackDismissedForMissionId] = useState<
    string | null
  >(null);
  const [viewAnim, setViewAnim] = useState<"entering" | "back" | "">("");

  const view: SheetView = isOpen &&
      activeMissionId &&
      backDismissedForMissionId !== activeMissionId
    ? "editor"
    : "list";

  const navigateTo = useCallback(
    (next: SheetView, direction: "forward" | "back" = "forward") => {
      setViewAnim(direction === "forward" ? "entering" : "back");
      if (next === "list" && activeMissionId) {
        setBackDismissedForMissionId(activeMissionId);
      } else if (next === "editor") {
        setBackDismissedForMissionId(null);
      }
      // Clear animation class after it completes
      setTimeout(() => setViewAnim(""), 180);
    },
    [activeMissionId],
  );

  // Reset dismiss flag when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setBackDismissedForMissionId(null), 400); // after close animation
    }
  }, [isOpen]);

  const [confirmState, setConfirmState] = useState<ConfirmState>("idle");

  const attemptClose = useCallback(() => {
    if (isDirty) {
      setConfirmState("pending-close");
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const attemptBack = useCallback(() => {
    if (isDirty) {
      setConfirmState("pending-back");
    } else {
      navigateTo("list", "back");
    }
  }, [isDirty, navigateTo]);

  // ── Draft persistence ───────────────────────────────────────────────────────
  const [
    dismissedStoredDraftForMissionId,
    setDismissedStoredDraftForMissionId,
  ] = useState<string | null>(null);

  const storedDraft = useMemo((): StoredDraft | null => {
    if (!activeMissionId) return null;
    if (dismissedStoredDraftForMissionId === activeMissionId) return null;
    const found = loadStoredDraft(sessionId, activeMissionId);
    if (found && found.draft.title !== draft?.title) return found;
    return null;
  }, [
    activeMissionId,
    sessionId,
    draft?.title,
    dismissedStoredDraftForMissionId,
  ]);

  // ── Rename state ────────────────────────────────────────────────────────────
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRenameSubmit = useCallback(
    (value: string) => {
      if (value.trim()) onRename(value.trim());
      setIsRenaming(false);
    },
    [onRename],
  );

  // ── Confirm action handlers ─────────────────────────────────────────────────
  const handleKeepEditing = useCallback(() => {
    setConfirmState("idle");
  }, []);

  const handleSaveDraft = useCallback(() => {
    if (draft && activeMissionId) {
      saveStoredDraft(sessionId, activeMissionId, draft);
    }
    setConfirmState("idle");
    onClose();
  }, [draft, activeMissionId, sessionId, onClose]);

  const handleDiscardAndClose = useCallback(() => {
    if (activeMissionId) {
      clearStoredDraft(sessionId, activeMissionId);
    }
    setConfirmState("idle");
    onDiscard();
    onClose();
  }, [activeMissionId, sessionId, onDiscard, onClose]);

  const handleSaveDraftAndBack = useCallback(() => {
    if (draft && activeMissionId) {
      saveStoredDraft(sessionId, activeMissionId, draft);
    }
    setConfirmState("idle");
    navigateTo("list", "back");
  }, [draft, activeMissionId, sessionId, navigateTo]);

  const handleDiscardAndBack = useCallback(() => {
    if (activeMissionId) {
      clearStoredDraft(sessionId, activeMissionId);
    }
    setConfirmState("idle");
    onDiscard();
    navigateTo("list", "back");
  }, [activeMissionId, sessionId, onDiscard, navigateTo]);

  // ── Callback wrappers for list-view navigation ──────────────────────────────
  // MissionListView doesn't know about the sheet's internal navigation, so we
  // wrap the external callbacks to also navigate to the editor view.
  const handleMissionSelectAndNavigate = useCallback(
    (missionId: string) => {
      onMissionSelect(missionId);
      navigateTo("editor", "forward");
    },
    [onMissionSelect, navigateTo],
  );

  const handleAddMissionAndNavigate = useCallback(() => {
    onAddMission();
    navigateTo("editor", "forward");
  }, [onAddMission, navigateTo]);

  const activeMission = missions.find((m) => m.id === activeMissionId) ?? null;

  const sheetHeader = (
    <div className="sheet-header">
      {view === "editor" && (
        <button
          type="button"
          className="btn btn--ghost sheet-icon-btn"
          onClick={attemptBack}
          aria-label="Back to mission list"
        >
          <MdArrowBack size={20} aria-hidden="true" />
        </button>
      )}

      {view === "list"
        ? isRenaming
          ? (
            <input
              key={milestone?.id ?? "rename"}
              className="form-input sheet-header__title"
              type="text"
              defaultValue={milestone?.name ?? ""}
              onBlur={(e) => handleRenameSubmit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameSubmit(e.currentTarget.value);
                }
                if (e.key === "Escape") setIsRenaming(false);
              }}
              autoFocus
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-semibold)",
              }}
            />
          )
          : (
            <span className="sheet-header__title">
              {milestone?.name ?? "Milestone"}
            </span>
          )
        : (
          <span className="sheet-header__title">
            {activeMission?.title || draft?.title || "New mission"}
          </span>
        )}

      <button
        type="button"
        className="btn btn--ghost sheet-icon-btn"
        onClick={() => {
          if (view === "list") setIsRenaming(true);
        }}
        aria-label={view === "list" ? "Rename milestone" : "Edit mission title"}
      >
        <MdEditNote size={22} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="btn btn--ghost sheet-icon-btn"
        onClick={attemptClose}
        aria-label="Close panel"
      >
        <MdClose size={22} aria-hidden="true" />
      </button>
    </div>
  );

  const sheetFooter = view === "editor"
    ? (
      <div className="sheet-footer">
        <SaveActions
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={onSave}
          onDiscard={onDiscard}
        />
      </div>
    )
    : undefined;

  return (
    <BottomSheet
      open={isOpen}
      onClose={attemptClose}
      ariaLabel={milestone?.name ?? "Mission editor"}
      testId="mission-bottom-sheet"
      header={sheetHeader}
      footer={sheetFooter}
      overlay={confirmState !== "idle"
        ? (
          <ConfirmSheet
            onKeepEditing={handleKeepEditing}
            onSaveDraft={confirmState === "pending-back"
              ? handleSaveDraftAndBack
              : handleSaveDraft}
            onDiscardAndClose={confirmState === "pending-back"
              ? handleDiscardAndBack
              : handleDiscardAndClose}
          />
        )
        : undefined}
    >
      <div
        className={`sheet-view${viewAnim ? ` sheet-view--${viewAnim}` : ""}`}
      >
        {view === "list"
          ? (
            <>
              <MissionListView
                missions={missions}
                activeMissionId={activeMissionId}
                onMissionSelect={handleMissionSelectAndNavigate}
                onAddMission={handleAddMissionAndNavigate}
                onDeleteMission={onDeleteMission}
                onReorderMission={onReorderMission}
              />
              {milestone && (
                <section
                  className="sheet-resources"
                  aria-label="Milestone resources"
                >
                  <h4 className="sheet-resources__title">Resources</h4>
                  <ResourcesEditor
                    resources={milestoneResources}
                    sessionId={sessionId}
                    onAdd={onAddResource}
                    onUpdate={onUpdateResource}
                    onDelete={onDeleteResource}
                    onToggleVisibility={onToggleResourceVisibility}
                  />
                </section>
              )}
            </>
          )
          : (
            <MissionEditorView
              draft={draft}
              storedDraft={storedDraft}
              onDraftChange={onDraftChange}
              onDismissStoredDraft={() => {
                if (activeMissionId) {
                  setDismissedStoredDraftForMissionId(activeMissionId);
                }
              }}
              onLoadStoredDraft={() => {
                if (storedDraft) {
                  onDraftChange(storedDraft.draft);
                  if (activeMissionId) {
                    setDismissedStoredDraftForMissionId(activeMissionId);
                  }
                }
              }}
            />
          )}
      </div>
    </BottomSheet>
  );
};

export default MissionBottomSheet;
