import { useCallback, useEffect, useRef, useState } from "react";
import type { Milestone } from "../../types/index.ts";
import MapViewport from "../shared/MapViewport.tsx";
import MilestoneNode from "../shared/MilestoneNode.tsx";
import GridOverlay, { GridToggleButton } from "./GridOverlay.tsx";

const LONG_PRESS_MS = 500;
const DRAG_THRESHOLD_PX = 5;

interface MilestoneMapEditorProps {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly bgImageUrl: string;
  readonly onMilestoneClick: (id: string) => void;
  readonly onNodeDrop: (id: string, xPercent: number, yPercent: number) => void;
  readonly onAddMilestone: () => void;
  readonly onAddMilestoneAt: (xPercent: number, yPercent: number) => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onUploadBackground: (file: File) => void;
}

interface DragState {
  readonly milestoneId: string;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startLeftPct: number;
  readonly startTopPct: number;
  readonly pointerType: string;
  readonly pointerDownTime: number;
  hasDragged: boolean;
}

interface ContextMenuState {
  readonly milestoneId: string;
  readonly x: number;
  readonly y: number;
}

const MilestoneMapEditor = (props: MilestoneMapEditorProps) => {
  const {
    bgImageUrl,
    milestones,
    onNodeDrop,
    onAddMilestone,
    onAddMilestoneAt,
    onRename,
    onDelete,
    onMilestoneClick,
  } = props;

  const [gridEnabled, setGridEnabled] = useState(false);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragLeftPct, setDragLeftPct] = useState(0);
  const [dragTopPct, setDragTopPct] = useState(0);
  const dragRef = useRef<DragState | null>(null);
  const mapAreaRef = useRef<HTMLDivElement>(null);

  // ── Snap indicator ──────────────────────────────────────────────────────────
  const [snapPos, setSnapPos] = useState<{ x: number; y: number } | null>(null);

  // ── Context menu state ──────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ── Rename state ────────────────────────────────────────────────────────────
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // ── Delete confirmation ─────────────────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Touch device detection ──────────────────────────────────────────────────
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // ── Empty-area long-press timer ─────────────────────────────────────────────
  const emptyLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emptyPressPosRef = useRef<{ x: number; y: number } | null>(null);

  // ── Compute percentage from client coordinates ──────────────────────────────
  const clientToPercent = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const container = mapAreaRef.current;
      if (!container) return { x: 50, y: 50 };
      const rect = container.getBoundingClientRect();
      let xPercent = ((clientX - rect.left) / rect.width) * 100;
      let yPercent = ((clientY - rect.top) / rect.height) * 100;
      xPercent = Math.max(0, Math.min(100, xPercent));
      yPercent = Math.max(0, Math.min(100, yPercent));
      if (gridEnabled) {
        xPercent = Math.round(xPercent / 10) * 10;
        yPercent = Math.round(yPercent / 10) * 10;
      }
      return { x: Math.round(xPercent), y: Math.round(yPercent) };
    },
    [gridEnabled],
  );

  // ── Close context menu on outside interaction ───────────────────────────────
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
    setDeleteConfirmId(null);
  }, []);

  // ── Pointer event handlers (unified mouse + touch) ──────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Detect touch device on first pointer interaction
      if (e.pointerType === "touch" && !isTouchDevice) {
        setIsTouchDevice(true);
      }

      // Check if pointer landed on a milestone node
      const nodeEl = (e.target as HTMLElement).closest(
        "[data-milestone-id]",
      ) as HTMLElement | null;

      if (nodeEl) {
        // ── Pointer down on a milestone node ──────────────────────────────────
        const milestoneId = nodeEl.getAttribute("data-milestone-id")!;
        const leftPct = parseFloat(nodeEl.style.left) || 0;
        const topPct = parseFloat(nodeEl.style.top) || 0;

        dragRef.current = {
          milestoneId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          startLeftPct: leftPct,
          startTopPct: topPct,
          pointerType: e.pointerType,
          pointerDownTime: Date.now(),
          hasDragged: false,
        };

        // Capture pointer so we get move/up events even outside the node
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        // ── Pointer down on empty area — start long-press timer ───────────────
        emptyPressPosRef.current = { x: e.clientX, y: e.clientY };
        emptyLongPressRef.current = setTimeout(() => {
          if (emptyPressPosRef.current) {
            const pos = clientToPercent(
              emptyPressPosRef.current.x,
              emptyPressPosRef.current.y,
            );
            onAddMilestoneAt(pos.x, pos.y);
          }
          emptyPressPosRef.current = null;
        }, LONG_PRESS_MS);
      }
    },
    [isTouchDevice, clientToPercent, onAddMilestoneAt],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Cancel empty-area long-press if pointer moves
      if (emptyLongPressRef.current) {
        const pos = emptyPressPosRef.current;
        if (
          pos &&
          (Math.abs(e.clientX - pos.x) > DRAG_THRESHOLD_PX ||
            Math.abs(e.clientY - pos.y) > DRAG_THRESHOLD_PX)
        ) {
          clearTimeout(emptyLongPressRef.current);
          emptyLongPressRef.current = null;
          emptyPressPosRef.current = null;
        }
      }

      const d = dragRef.current;
      if (!d) return;

      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;

      if (
        !d.hasDragged &&
        (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)
      ) {
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

          // Compute snap indicator if grid is enabled
          if (gridEnabled) {
            const snappedX = Math.round(newLeft / 10) * 10;
            const snappedY = Math.round(newTop / 10) * 10;
            if (
              Math.abs(snappedX - newLeft) > 1 ||
              Math.abs(snappedY - newTop) > 1
            ) {
              setSnapPos({ x: snappedX, y: snappedY });
            } else {
              setSnapPos(null);
            }
          }
        }
      }
    },
    [gridEnabled],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Cancel empty-area timer
      if (emptyLongPressRef.current) {
        clearTimeout(emptyLongPressRef.current);
        emptyLongPressRef.current = null;
        emptyPressPosRef.current = null;
      }

      const d = dragRef.current;
      if (!d) return;

      const elapsed = Date.now() - d.pointerDownTime;
      const dx = Math.abs(e.clientX - d.startClientX);
      const dy = Math.abs(e.clientY - d.startClientY);
      const moved = dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX;

      if (d.hasDragged || moved) {
        // ── Drag ended → finalize position ────────────────────────────────────
        const container = mapAreaRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          let xPercent = d.startLeftPct +
            ((e.clientX - d.startClientX) / rect.width) * 100;
          let yPercent = d.startTopPct +
            ((e.clientY - d.startClientY) / rect.height) * 100;
          xPercent = Math.max(0, Math.min(100, xPercent));
          yPercent = Math.max(0, Math.min(100, yPercent));
          if (gridEnabled) {
            xPercent = Math.round(xPercent / 10) * 10;
            yPercent = Math.round(yPercent / 10) * 10;
          }
          onNodeDrop(
            d.milestoneId,
            Math.round(xPercent),
            Math.round(yPercent),
          );
        }
      } else if (elapsed >= LONG_PRESS_MS && !moved) {
        // ── Long-press on node → show context menu (mobile) ───────────────────
        if (d.pointerType === "touch") {
          setContextMenu({
            milestoneId: d.milestoneId,
            x: e.clientX,
            y: e.clientY,
          });
        }
      }

      // Cleanup drag state
      dragRef.current = null;
      setDragNodeId(null);
      setDragLeftPct(0);
      setDragTopPct(0);
      setSnapPos(null);

      // Release pointer capture
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if capture wasn't held
      }
    },
    [gridEnabled, onNodeDrop],
  );

  const handlePointerCancel = useCallback(() => {
    if (emptyLongPressRef.current) {
      clearTimeout(emptyLongPressRef.current);
      emptyLongPressRef.current = null;
      emptyPressPosRef.current = null;
    }
    dragRef.current = null;
    setDragNodeId(null);
    setDragLeftPct(0);
    setDragTopPct(0);
    setSnapPos(null);
  }, []);

  // ── Context menu handlers (desktop right-click) ─────────────────────────────

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, milestoneId: string) => {
      e.preventDefault();
      setContextMenu({ milestoneId, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleRenameStart = useCallback((milestoneId: string) => {
    setContextMenu(null);
    setRenameId(milestoneId);
    setRenameValue("");
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (renameId && renameValue.trim()) {
      onRename(renameId, renameValue.trim());
    }
    setRenameId(null);
  }, [onRename, renameId, renameValue]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleRenameSubmit();
      if (e.key === "Escape") setRenameId(null);
    },
    [handleRenameSubmit],
  );

  const handleDeleteConfirmOpen = useCallback((milestoneId: string) => {
    setContextMenu(null);
    setDeleteConfirmId(milestoneId);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [onDelete, deleteConfirmId]);

  // ── Global pointerup listener to catch releases outside the map area ────────

  useEffect(() => {
    const onGlobalPointerUp = () => {
      if (dragRef.current) {
        const d = dragRef.current;
        const container = mapAreaRef.current;
        if (container && d.hasDragged) {
          const rect = container.getBoundingClientRect();
          let xPercent = d.startLeftPct + (0 / rect.width) * 100;
          let yPercent = d.startTopPct + (0 / rect.height) * 100;
          xPercent = Math.max(0, Math.min(100, xPercent));
          yPercent = Math.max(0, Math.min(100, yPercent));
          if (gridEnabled) {
            xPercent = Math.round(xPercent / 10) * 10;
            yPercent = Math.round(yPercent / 10) * 10;
          }
          onNodeDrop(
            d.milestoneId,
            Math.round(xPercent),
            Math.round(yPercent),
          );
        }
        dragRef.current = null;
        setDragNodeId(null);
        setDragLeftPct(0);
        setDragTopPct(0);
        setSnapPos(null);
      }
      if (emptyLongPressRef.current) {
        clearTimeout(emptyLongPressRef.current);
        emptyLongPressRef.current = null;
        emptyPressPosRef.current = null;
      }
    };

    globalThis.addEventListener("pointerup", onGlobalPointerUp);
    return () => globalThis.removeEventListener("pointerup", onGlobalPointerUp);
  }, [gridEnabled, onNodeDrop]);

  // ── Determine behavior based on device type ─────────────────────────────────

  const handleNodeClick = useCallback(
    (ms: Milestone) => {
      if (isTouchDevice) {
        // Mobile: single tap enters rename mode directly
        setRenameId(ms.id);
        setRenameValue("");
      } else {
        // Desktop: single click navigates to detail
        onMilestoneClick(ms.id);
      }
    },
    [isTouchDevice, onMilestoneClick],
  );

  const handleNodeDoubleClick = useCallback(
    (ms: Milestone) => {
      // Desktop: double-click enters rename mode
      if (!isTouchDevice) {
        setRenameId(ms.id);
        setRenameValue("");
      }
    },
    [isTouchDevice],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="milestone-map-editor"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
      onClick={handleCloseContextMenu}
    >
      <MapViewport
        bgImageUrl={bgImageUrl}
        testId="milestone-map-editor-viewport"
        overlayControls={
          <GridToggleButton
            enabled={gridEnabled}
            onToggle={() => setGridEnabled((g) => !g)}
          />
        }
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
          {milestones.map((ms) => {
            const isDragging = dragNodeId === ms.id;
            const pos = isDragging
              ? { left: dragLeftPct, top: dragTopPct }
              : { left: ms.xPercent, top: ms.yPercent };

            return (
              <MilestoneNode
                key={ms.id}
                id={ms.id}
                label={renameId === ms.id ? "Renaming..." : ms.name}
                xPercent={pos.left}
                yPercent={pos.top}
                progressPercent={0}
                status="upcoming"
                className={isDragging ? "milestone-node--dragging" : undefined}
                draggable
                onClick={() => handleNodeClick(ms)}
                onDoubleClick={() => handleNodeDoubleClick(ms)}
                onContextMenu={(e) => handleContextMenu(e, ms.id)}
              />
            );
          })}

          {/* Ghost at original position during drag */}
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

          {/* Snap indicator */}
          {snapPos && (
            <div
              className="snap-indicator"
              aria-hidden="true"
              style={{
                left: `${snapPos.x}%`,
                top: `${snapPos.y}%`,
              }}
            />
          )}
        </div>

        {gridEnabled && <GridOverlay enabled columns={10} rows={6} />}
      </MapViewport>

      {/* Inline rename input */}
      {renameId && (
        <div
          style={{
            padding: "var(--space-2) var(--space-3)",
            display: "flex",
            gap: "var(--space-2)",
          }}
        >
          <input
            className="form-input"
            type="text"
            value={renameValue}
            placeholder="New milestone name"
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            autoFocus
            style={{ flex: 1, fontSize: "var(--text-sm)" }}
          />
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleRenameSubmit}
          >
            Rename
          </button>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          role="menu"
          aria-label="Milestone actions"
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1100,
            background: "hsl(var(--color-card))",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            padding: "var(--space-2)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
            minWidth: "10rem",
          }}
        >
          <button
            type="button"
            role="menuitem"
            className="btn btn--ghost"
            style={{ justifyContent: "flex-start" }}
            onClick={() => handleRenameStart(contextMenu.milestoneId)}
          >
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className="btn btn--destructive"
            style={{ justifyContent: "flex-start" }}
            onClick={() => handleDeleteConfirmOpen(contextMenu.milestoneId)}
          >
            Delete
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
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

      <div className="map-editor-toolbar">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onAddMilestone}
        >
          + Add Milestone
        </button>
      </div>
    </div>
  );
};

export default MilestoneMapEditor;
