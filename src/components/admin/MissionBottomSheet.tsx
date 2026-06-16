import { useCallback, useEffect, useRef, useState } from "react";
import { MdArrowBack, MdClose } from "react-icons/md";
import type { DraftMission, Milestone, Mission } from "../../types/index.ts";
import MissionEditor from "./MissionEditor.tsx";
import SaveActions from "./SaveActions.tsx";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoredDraft {
  readonly draft: DraftMission;
  readonly missionId: string;
  readonly savedAt: string;
}

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

// ── Draft localStorage helpers ────────────────────────────────────────────────

const DRAFT_KEY = (sessionId: string, missionId: string) =>
  `mb_draft_${sessionId}_${missionId}`;

const loadStoredDraft = (
  sessionId: string,
  missionId: string,
): StoredDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(sessionId, missionId));
    return raw ? (JSON.parse(raw) as StoredDraft) : null;
  } catch {
    return null;
  }
};

const saveStoredDraft = (
  sessionId: string,
  missionId: string,
  draft: DraftMission,
) => {
  const payload: StoredDraft = {
    draft,
    missionId,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(
      DRAFT_KEY(sessionId, missionId),
      JSON.stringify(payload),
    );
  } catch { /* storage full or disabled */ }
};

const clearStoredDraft = (sessionId: string, missionId: string) => {
  try {
    localStorage.removeItem(DRAFT_KEY(sessionId, missionId));
  } catch { /* ignore */ }
};

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "earlier";
  }
};

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

  // Sync view with activeMissionId changes
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

  // When a specific mission is selected, check localStorage for a saved draft
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

          {/* Milestone title — editable on tap (list view only) */}
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
                /* ── List view ── */
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  <ul className="sheet-mission-list" role="list">
                    {missions.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          className={`sheet-mission-item${
                            activeMissionId === m.id
                              ? " sheet-mission-item--active"
                              : ""
                          }`}
                          onClick={() => {
                            onMissionSelect(m.id);
                            navigateTo("editor", "forward");
                          }}
                        >
                          {m.title || (
                            <em style={{ opacity: 0.5 }}>
                              Untitled
                            </em>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div
                    style={{ padding: "var(--space-4) var(--space-5)" }}
                  >
                    <button
                      type="button"
                      className="btn btn--secondary"
                      style={{
                        width: "100%",
                        minHeight: "var(--touch-target)",
                      }}
                      onClick={() => {
                        onAddMission();
                        // onAddMission will eventually set activeMissionId, which
                        // triggers the useEffect that navigates to editor view
                        navigateTo("editor", "forward");
                      }}
                    >
                      + Add mission
                    </button>
                  </div>
                </div>
              )
              : (
                /* ── Editor view ── */
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "100%",
                  }}
                >
                  {/* Draft restore banner */}
                  {storedDraft && (
                    <div className="draft-banner" role="status">
                      <span className="draft-banner__text">
                        Unsaved draft from {formatTime(storedDraft.savedAt)}
                      </span>
                      <div className="draft-banner__actions">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          style={{
                            fontSize: "var(--text-xs)",
                            padding: "var(--space-1) var(--space-2)",
                          }}
                          onClick={() => setStoredDraft(null)}
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          className="btn btn--secondary"
                          style={{
                            fontSize: "var(--text-xs)",
                            padding: "var(--space-1) var(--space-2)",
                          }}
                          onClick={() => {
                            onDraftChange(storedDraft.draft);
                            setStoredDraft(null);
                          }}
                        >
                          Load draft
                        </button>
                      </div>
                    </div>
                  )}

                  {draft
                    ? (
                      <div
                        style={{
                          padding:
                            "var(--space-4) var(--space-5) var(--space-6)",
                          flex: 1,
                        }}
                      >
                        <MissionEditor
                          draft={draft}
                          xpPreview={xpPreview}
                          onDraftChange={onDraftChange}
                        />
                      </div>
                    )
                    : (
                      <p
                        style={{
                          padding: "var(--space-6) var(--space-5)",
                          color: "hsl(var(--color-muted-fg))",
                          fontSize: "var(--text-sm)",
                        }}
                      >
                        Select a mission to edit
                      </p>
                    )}
                </div>
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
          <div className="sheet-confirm" role="alertdialog" aria-modal="true">
            <p className="sheet-confirm__title">Unsaved changes</p>
            <p className="sheet-confirm__desc">
              What would you like to do with your edits?
            </p>
            <button
              type="button"
              className="btn btn--primary sheet-confirm__btn"
              onClick={handleKeepEditing}
            >
              Keep editing
            </button>
            <button
              type="button"
              className="btn btn--secondary sheet-confirm__btn"
              onClick={handleSaveDraft}
            >
              Save as draft
            </button>
            <button
              type="button"
              className="btn btn--ghost sheet-confirm__btn"
              style={{ color: "hsl(var(--color-destructive))" }}
              onClick={handleDiscardAndClose}
            >
              Discard changes
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default MissionBottomSheet;
