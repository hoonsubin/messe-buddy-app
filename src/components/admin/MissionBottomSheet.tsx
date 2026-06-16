import { useCallback, useEffect, useRef, useState } from "react";
import { MdArrowBack, MdClose } from "react-icons/md";
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
    onClose,
  } = props;

  // ── View state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<SheetView>("list");
  const [viewAnim, setViewAnim] = useState<"entering" | "back" | "">("");

  const navigateTo = useCallback(
    (next: SheetView, direction: "forward" | "back" = "forward") => {
      setViewAnim(direction === "forward" ? "entering" : "back");
      setView(next);
      // Clear animation class after it completes
      setTimeout(() => setViewAnim(""), 180);
    },
    [],
  );

  // ── View routing ─────────────────────────────────────────────────────────────
  // auto-navigate when activeMissionId changes from outside (sidebar click)
  useEffect(() => {
    if (!isOpen) return;
    if (activeMissionId && view === "list") {
      navigateTo("editor", "forward");
    }
  }, [activeMissionId, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to list when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setView("list"), 400); // after close animation
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
  const [storedDraft, setStoredDraft] = useState<StoredDraft | null>(null);

  // When a specific mission is selected, check localStorage for a saved draft.
  // localStorage is a genuine external system — reading it requires an effect.
  useEffect(() => {
    if (!activeMissionId) {
      setStoredDraft(null);
      return;
    }
    const found = loadStoredDraft(sessionId, activeMissionId);
    // Only show the banner if the stored draft actually has content that differs
    if (found && found.draft.title !== draft?.title) {
      setStoredDraft(found);
    } else {
      setStoredDraft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMissionId, sessionId]);

  // ── Rename state ────────────────────────────────────────────────────────────
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(milestone?.name ?? "");
  // Reset the rename input when the milestone changes externally (e.g. GM
  // selects a different milestone in the sidebar). This is synchronizing
  // internal editable state with an external prop — derive-in-render alone
  // cannot handle user-driven edits to the same field.
  useEffect(() => {
    setRenameValue(milestone?.name ?? "");
  }, [milestone?.name]);

  const handleRenameSubmit = useCallback(() => {
    if (renameValue.trim()) onRename(renameValue.trim());
    setIsRenaming(false);
  }, [onRename, renameValue]);

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
        onClick={attemptClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={`bottom-sheet${isOpen ? " bottom-sheet--open" : ""}${
          isDragging ? " bottom-sheet--dragging" : ""
        }`}
        style={{ transform: sheetTransform }}
        role="dialog"
        aria-modal="true"
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
              className="btn btn--ghost sheet-close-btn"
              onClick={() => navigateTo("list", "back")}
              aria-label="Back to mission list"
            >
              <MdArrowBack size={20} aria-hidden="true" />
            </button>
          )}

          {/* Milestone title - editable on tap (list view only) */}
          {view === "list"
            ? isRenaming
              ? (
                <input
                  className="form-input sheet-header__title"
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit();
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
                <button
                  type="button"
                  className="btn btn--ghost sheet-header__title"
                  style={{
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--weight-semibold)",
                    textAlign: "left",
                    padding: 0,
                  }}
                  onClick={() => setIsRenaming(true)}
                  title="Tap to rename"
                >
                  {milestone?.name ?? "Milestone"}
                </button>
              )
            : (
              /* Editor view: show mission title */
              <span className="sheet-header__title">
                {activeMission?.title || draft?.title || "New mission"}
              </span>
            )}

          <button
            type="button"
            className="btn btn--ghost sheet-close-btn"
            onClick={attemptClose}
            aria-label="Close"
          >
            <MdClose size={20} aria-hidden="true" />
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
                />
              )
              : (
                <MissionEditorView
                  draft={draft}
                  xpPreview={xpPreview}
                  storedDraft={storedDraft}
                  onDraftChange={onDraftChange}
                  onDismissStoredDraft={() => setStoredDraft(null)}
                  onLoadStoredDraft={() => {
                    if (storedDraft) {
                      onDraftChange(storedDraft.draft);
                      setStoredDraft(null);
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
