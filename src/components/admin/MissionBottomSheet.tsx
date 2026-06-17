import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdArrowBack, MdClose, MdEditNote } from "react-icons/md";
import type { DraftMission, Milestone, Mission } from "../../types/index.ts";
import type { StoredDraft } from "../../utils/draftStorage.ts";
import {
  clearStoredDraft,
  loadStoredDraft,
  saveStoredDraft,
} from "../../utils/draftStorage.ts";
import ConfirmSheet from "./ConfirmSheet.tsx";
import MissionEditorView from "./MissionEditorView.tsx";
import MissionListView from "./MissionListView.tsx";
import SaveActions from "./SaveActions.tsx";

// ── Types ─────────────────────────────────────────────────────────────────────

type SheetView = "list" | "editor";
type ConfirmState = "idle" | "pending-close";

interface MissionBottomSheetProps {
  readonly isOpen: boolean;
  readonly milestone: Milestone | null;
  readonly missions: ReadonlyArray<Mission>;
  readonly activeMissionId: string | null;
  readonly draft: DraftMission | null;
  readonly xpPreview: number;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly sessionId: string;
  readonly onMissionSelect: (missionId: string) => void;
  readonly onDraftChange: (draft: DraftMission) => void;
  readonly onRename: (newName: string) => void;
  readonly onSave: () => void;
  readonly onSaveAsTemplate: () => void;
  readonly onDiscard: () => void;
  readonly onAddMission: () => void;
  readonly onDeleteMission: (missionId: string) => void;
  readonly onReorderMission: (missionId: string, newOrder: number) => void;
  readonly onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const DISMISS_THRESHOLD_PX = 120;

const MissionBottomSheet = (props: MissionBottomSheetProps) => {
  const {
    isOpen,
    milestone,
    missions,
    activeMissionId,
    draft,
    xpPreview,
    isDirty,
    isSaving,
    sessionId,
    onMissionSelect,
    onDraftChange,
    onRename,
    onSave,
    onSaveAsTemplate,
    onDiscard,
    onAddMission,
    onDeleteMission,
    onReorderMission,
    onClose,
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

  // ── Drag-to-dismiss ─────────────────────────────────────────────────────────
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const draggingRef = useRef(false);

  const [confirmState, setConfirmState] = useState<ConfirmState>("idle");

  const attemptClose = useCallback(() => {
    if (isDirty) {
      setConfirmState("pending-close");
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // When the sheet opens, the same pointer-event sequence that triggered the
  // open (pointerup → react re-render → backdrop becomes pointer-events:auto)
  // fires a synthetic `click` that lands on the backdrop instead of the node
  // underneath it. Suppress backdrop clicks for one rAF after open so the
  // event loop drains before we accept user intent to close.
  const suppressBackdropRef = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    suppressBackdropRef.current = true;
    const id = requestAnimationFrame(() => {
      suppressBackdropRef.current = false;
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    if (!suppressBackdropRef.current) attemptClose();
  }, [attemptClose]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    // Only respond to the primary touch/mouse button
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
    draggingRef.current = true;
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    setDragY(delta);
  }, []);

  const handleDragEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const delta = Math.max(0, e.clientY - dragStartY.current);
      draggingRef.current = false;
      setIsDragging(false);
      setDragY(0);
      if (delta > DISMISS_THRESHOLD_PX) {
        attemptClose();
      }
    },
    [attemptClose],
  );

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
    setDragY(0);
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

  // ── Computed values ─────────────────────────────────────────────────────────
  const sheetTransform = isDragging
    ? `translateY(${dragY}px)`
    : isOpen
    ? "translateY(0)"
    : "translateY(100%)";

  const backdropOpacity = isDragging
    ? Math.max(0, 0.4 * (1 - dragY / 300))
    : undefined;

  const activeMission = missions.find((m) => m.id === activeMissionId) ?? null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className={`bottom-sheet-backdrop${
          isOpen ? " bottom-sheet-backdrop--visible" : ""
        }`}
        style={backdropOpacity !== undefined
          ? { opacity: backdropOpacity }
          : undefined}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`bottom-sheet${isOpen ? " bottom-sheet--open" : ""}${
          isDragging ? " bottom-sheet--dragging" : ""
        }`}
        style={{ transform: sheetTransform }}
        role="dialog"
        aria-label={milestone?.name ?? "Mission editor"}
        data-testid="mission-bottom-sheet"
      >
        {/* ── Drag handle ── */}
        <div
          className="sheet-drag-zone"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          aria-hidden="true"
        >
          <div className="sheet-drag-bar" />
        </div>

        {/* ── Header ── */}
        <div className="sheet-header">
          {view === "editor" && (
            <button
              type="button"
              className="btn btn--ghost sheet-icon-btn"
              onClick={() => navigateTo("list", "back")}
              aria-label="Back to mission list"
            >
              <MdArrowBack size={20} aria-hidden="true" />
            </button>
          )}

          {/* Title — static in both views; pencil button triggers rename/focus */}
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

          {/* Pencil button — rename milestone (list) or focus title field (editor) */}
          <button
            type="button"
            className="btn btn--ghost sheet-icon-btn"
            onClick={() => {
              if (view === "list") setIsRenaming(true);
            }}
            aria-label={view === "list"
              ? "Rename milestone"
              : "Edit mission title"}
          >
            <MdEditNote size={22} aria-hidden="true" />
          </button>

          {/* Close button */}
          <button
            type="button"
            className="btn btn--ghost sheet-icon-btn"
            onClick={attemptClose}
            aria-label="Close panel"
          >
            <MdClose size={22} aria-hidden="true" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="sheet-body">
          <div
            className={`sheet-view${
              viewAnim ? ` sheet-view--${viewAnim}` : ""
            }`}
          >
            {view === "list"
              ? (
                <MissionListView
                  missions={missions}
                  activeMissionId={activeMissionId}
                  onMissionSelect={handleMissionSelectAndNavigate}
                  onAddMission={handleAddMissionAndNavigate}
                  onDeleteMission={onDeleteMission}
                  onReorderMission={onReorderMission}
                />
              )
              : (
                <MissionEditorView
                  draft={draft}
                  xpPreview={xpPreview}
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
        </div>

        {/* ── Footer (editor view only) ── */}
        {view === "editor" && (
          <div className="sheet-footer">
            <SaveActions
              isDirty={isDirty}
              isSaving={isSaving}
              onSave={onSave}
              onSaveAsTemplate={onSaveAsTemplate}
              onDiscard={onDiscard}
            />
          </div>
        )}

        {/* ── Dismiss confirmation overlay ── */}
        {confirmState === "pending-close" && (
          <ConfirmSheet
            onKeepEditing={handleKeepEditing}
            onSaveDraft={handleSaveDraft}
            onDiscardAndClose={handleDiscardAndClose}
          />
        )}
      </div>
    </>
  );
};

export default MissionBottomSheet;
