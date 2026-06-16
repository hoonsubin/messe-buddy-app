import { useCallback, useEffect, useRef, useState } from "react";
import { MdAdd, MdImage, MdQrCode2, MdZoomIn, MdZoomOut } from "react-icons/md";
import type { Milestone } from "../../types/index.ts";
import MapViewport, { type MapViewportHandle } from "../shared/MapViewport.tsx";
import MilestoneNode from "../shared/MilestoneNode.tsx";

const LONG_PRESS_MS = 500;
const DRAG_THRESHOLD_PX = 5;

interface MilestoneMapEditorProps {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly missionCounts?: Readonly<Record<string, number>>;
  readonly bgImageUrl: string;
  readonly onMilestoneClick: (id: string) => void;
  readonly onNodeDrop: (id: string, xPercent: number, yPercent: number) => void;
  readonly onAddMilestoneAt: (xPercent: number, yPercent: number) => void;
  readonly onDelete: (id: string) => void;
  readonly onUploadBackground: (file: File) => void;
  readonly onOpenScanner?: () => void;
}

interface DragState {
  readonly milestoneId: string;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startLeftPct: number;
  readonly startTopPct: number;
  readonly pointerDownTime: number;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  hasDragged: boolean;
}

/**
 * Compute a spawn position for a new milestone node that avoids stacking
 * on top of existing nodes. Places relative to the last node, or at center
 * if the map is empty.
 */
function computeSpawnPos(
  milestones: ReadonlyArray<Milestone>,
): { x: number; y: number } {
  if (milestones.length === 0) return { x: 50, y: 50 };

  const last = milestones[milestones.length - 1]!;
  let x = last.xPercent + 14;
  let y = last.yPercent;

  // Wrap and offset if colliding with any existing node
  let attempts = 0;
  while (
    attempts < 20 &&
    milestones.some(
      (m) => Math.abs(m.xPercent - x) < 10 && Math.abs(m.yPercent - y) < 10,
    )
  ) {
    x += 14;
    if (x > 88) {
      x = 12;
      y += 14;
    }
    if (y > 88) y = 12;
    attempts++;
  }

  return { x: Math.min(88, Math.max(12, x)), y: Math.min(88, Math.max(12, y)) };
}

const MilestoneMapEditor = (props: MilestoneMapEditorProps) => {
  const {
    bgImageUrl,
    milestones,
    missionCounts = {},
    onNodeDrop,
    onAddMilestoneAt,
    onDelete,
    onMilestoneClick,
    onUploadBackground,
  } = props;

  // ── Viewport zoom ref ──────────────────────────────────────────────────────
  const viewportRef = useRef<MapViewportHandle>(null);

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const [isEditMode, setIsEditMode] = useState(false);

  // ── Drag state ─────────────────────────────────────────────────────────────
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragLeftPct, setDragLeftPct] = useState(0);
  const [dragTopPct, setDragTopPct] = useState(0);
  const dragRef = useRef<DragState | null>(null);
  const mapAreaRef = useRef<HTMLDivElement>(null);

  // ── Delete confirmation ────────────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Pointer event handlers (unified mouse + touch) ─────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Check if pointer landed on a milestone node
      const nodeEl = (e.target as HTMLElement).closest(
        "[data-milestone-id]",
      ) as HTMLElement | null;

      if (nodeEl) {
        const milestoneId = nodeEl.getAttribute("data-milestone-id")!;
        const leftPct = parseFloat(nodeEl.style.left) || 0;
        const topPct = parseFloat(nodeEl.style.top) || 0;

        // Start long-press timer only when NOT already in edit mode
        let longPressTimer: ReturnType<typeof setTimeout> | null = null;
        if (!isEditMode) {
          longPressTimer = setTimeout(() => {
            setIsEditMode(true);
            // Mark the current drag as having entered edit mode via long-press
            if (dragRef.current) {
              dragRef.current.longPressTimer = null;
            }
          }, LONG_PRESS_MS);
        }

        dragRef.current = {
          milestoneId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startLeftPct: leftPct,
          startTopPct: topPct,
          pointerDownTime: Date.now(),
          longPressTimer,
          hasDragged: false,
        };

        // Capture pointer so we get move/up even outside the node
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        // Pointer down on empty area → exit edit mode
        if (isEditMode) {
          setIsEditMode(false);
        }
      }
    },
    [isEditMode],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      const moved = Math.abs(dx) > DRAG_THRESHOLD_PX ||
        Math.abs(dy) > DRAG_THRESHOLD_PX;

      // Cancel long-press if the user moved
      if (moved && d.longPressTimer) {
        clearTimeout(d.longPressTimer);
        d.longPressTimer = null;
      }

      // Only drag in edit mode
      if (!isEditMode) return;

      if (!d.hasDragged && moved) {
        d.hasDragged = true;
        setDragNodeId(d.milestoneId);
      }

      if (d.hasDragged) {
        const container = mapAreaRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const newLeft = d.startLeftPct + (dx / rect.width) * 100;
          const newTop = d.startTopPct + (dy / rect.height) * 100;
          setDragLeftPct(newLeft);
          setDragTopPct(newTop);
        }
      }
    },
    [isEditMode],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;

      // Cancel long-press timer
      if (d.longPressTimer) {
        clearTimeout(d.longPressTimer);
        d.longPressTimer = null;
      }

      const elapsed = Date.now() - d.pointerDownTime;
      const dx = Math.abs(e.clientX - d.startClientX);
      const dy = Math.abs(e.clientY - d.startClientY);
      const moved = dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX;

      if (d.hasDragged && isEditMode) {
        // Drag ended in edit mode → finalise position
        const container = mapAreaRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          let xPercent = d.startLeftPct +
            ((e.clientX - d.startClientX) / rect.width) * 100;
          let yPercent = d.startTopPct +
            ((e.clientY - d.startClientY) / rect.height) * 100;
          xPercent = Math.round(Math.max(0, Math.min(100, xPercent)));
          yPercent = Math.round(Math.max(0, Math.min(100, yPercent)));
          onNodeDrop(d.milestoneId, xPercent, yPercent);
        }
      } else if (!moved && elapsed < LONG_PRESS_MS && !isEditMode) {
        // Quick tap outside edit mode → open milestone modal
        onMilestoneClick(d.milestoneId);
      }
      // If elapsed >= LONG_PRESS_MS and !moved: the timer already set isEditMode

      // Cleanup
      dragRef.current = null;
      setDragNodeId(null);
      setDragLeftPct(0);
      setDragTopPct(0);

      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if capture wasn't held
      }
    },
    [isEditMode, onNodeDrop, onMilestoneClick],
  );

  const handlePointerCancel = useCallback(() => {
    const d = dragRef.current;
    if (d?.longPressTimer) clearTimeout(d.longPressTimer);
    dragRef.current = null;
    setDragNodeId(null);
    setDragLeftPct(0);
    setDragTopPct(0);
  }, []);

  // ── Global pointerup — catch releases outside the map area ─────────────────

  useEffect(() => {
    const onGlobalPointerUp = () => {
      const d = dragRef.current;
      if (!d) return;
      if (d.longPressTimer) {
        clearTimeout(d.longPressTimer);
        d.longPressTimer = null;
      }
      if (d.hasDragged) {
        const container = mapAreaRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const xPercent = Math.round(
            Math.max(0, Math.min(100, d.startLeftPct + (0 / rect.width) * 100)),
          );
          const yPercent = Math.round(
            Math.max(
              0,
              Math.min(100, d.startTopPct + (0 / rect.height) * 100),
            ),
          );
          onNodeDrop(d.milestoneId, xPercent, yPercent);
        }
      }
      dragRef.current = null;
      setDragNodeId(null);
      setDragLeftPct(0);
      setDragTopPct(0);
    };

    globalThis.addEventListener("pointerup", onGlobalPointerUp);
    return () => globalThis.removeEventListener("pointerup", onGlobalPointerUp);
  }, [onNodeDrop]);

  // ── Delete handlers ────────────────────────────────────────────────────────

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [onDelete, deleteConfirmId]);

  // ── FAB: add milestone at computed offset position ─────────────────────────

  const handleFabClick = useCallback(() => {
    const pos = computeSpawnPos(milestones);
    onAddMilestoneAt(pos.x, pos.y);
  }, [milestones, onAddMilestoneAt]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="milestone-map-editor"
      data-testid="milestone-map-editor"
    >
      {/* ── Toolbar strip ── */}
      <div className="map-editor-toolbar">
        {isEditMode && (
          <span className="map-editor-toolbar__edit-label" aria-live="polite">
            Edit mode
          </span>
        )}
        <button
          type="button"
          className="map-toolbar-btn"
          aria-label="Zoom in"
          onClick={() => viewportRef.current?.zoomIn()}
        >
          <MdZoomIn size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="map-toolbar-btn"
          aria-label="Zoom out"
          onClick={() => viewportRef.current?.zoomOut()}
        >
          <MdZoomOut size={20} aria-hidden="true" />
        </button>
        <div className="map-toolbar-sep" aria-hidden="true" />
        {props.onOpenScanner && (
          <button
            type="button"
            className="map-toolbar-btn"
            aria-label="Open QR scanner"
            title="Scan player QR code"
            onClick={props.onOpenScanner}
          >
            <MdQrCode2 size={20} aria-hidden="true" />
          </button>
        )}
        <label
          className="map-toolbar-btn"
          htmlFor="map-bg-upload"
          title="Upload background image"
          style={{ cursor: "pointer" }}
        >
          <MdImage size={18} aria-hidden="true" />
          <input
            id="map-bg-upload"
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadBackground(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* ── Map canvas area ── */}
      <div className="milestone-map-editor__canvas-wrap">
        <MapViewport
          ref={viewportRef}
          bgImageUrl={bgImageUrl}
          testId="milestone-map-editor-viewport"
        >
          {/* Pointer-based drag area */}
          <div
            ref={mapAreaRef}
            className="map-editor-drag-area"
            data-testid="map-editor-drag-area"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {milestones.map((ms, index) => {
              const isDragging = dragNodeId === ms.id;
              const pos = isDragging
                ? { left: dragLeftPct, top: dragTopPct }
                : { left: ms.xPercent, top: ms.yPercent };

              return (
                <MilestoneNode
                  key={ms.id}
                  id={ms.id}
                  label={ms.name}
                  xPercent={pos.left}
                  yPercent={pos.top}
                  progressPercent={0}
                  status="upcoming"
                  missionCount={missionCounts[ms.id] ?? 0}
                  className={[
                    isDragging ? "milestone-node--dragging" : "",
                    isEditMode ? "milestone-node--edit-mode" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  animationDelay={isEditMode
                    ? `${(index % 6) * 0.06}s`
                    : undefined}
                  showDeleteButton={isEditMode}
                  onClick={() => {
                    if (!isEditMode) onMilestoneClick(ms.id);
                  }}
                  onDeleteClick={() => setDeleteConfirmId(ms.id)}
                />
              );
            })}

            {/* Ghost at original position while dragging */}
            {dragNodeId &&
              (() => {
                const orig = milestones.find((m) => m.id === dragNodeId);
                if (!orig) return null;
                return (
                  <div
                    className="milestone-node__ghost"
                    aria-hidden="true"
                    style={{
                      left: `${orig.xPercent}%`,
                      top: `${orig.yPercent}%`,
                    }}
                  />
                );
              })()}
          </div>
        </MapViewport>

        {/* FAB — add milestone, always visible */}
        <button
          type="button"
          className="map-fab"
          aria-label="Add milestone"
          onClick={handleFabClick}
        >
          <MdAdd size={22} aria-hidden="true" />
        </button>
      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteConfirmId && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-label="Confirm delete milestone"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: "24rem",
              padding: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "var(--text-lg)" }}>
              Delete Milestone
            </h3>
            <p style={{ margin: 0, color: "hsl(var(--color-muted-fg))" }}>
              Are you sure you want to delete "
              {milestones.find((m) => m.id === deleteConfirmId)?.name ?? ""}"?
              All associated missions will also be removed. This action cannot
              be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "var(--space-2)",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--destructive"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneMapEditor;
