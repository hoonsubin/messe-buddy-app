import { useCallback, useRef, useState } from "react";
import type { Milestone } from "../../types/index.ts";
import MapViewport from "../shared/MapViewport.tsx";
import MilestoneNode from "../shared/MilestoneNode.tsx";
import GridOverlay, { GridToggleButton } from "./GridOverlay.tsx";

interface MilestoneMapEditorProps {
  readonly milestones: ReadonlyArray<Milestone>;
  readonly bgImageUrl: string;
  readonly onMilestoneClick: (id: string) => void;
  readonly onNodeDrop: (id: string, xPercent: number, yPercent: number) => void;
  readonly onAddMilestone: () => void;
  readonly onRename: (id: string, name: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onUploadBackground: (file: File) => void;
}

const MilestoneMapEditor = (props: MilestoneMapEditorProps) => {
  const {
    bgImageUrl,
    milestones,
    onNodeDrop,
    onAddMilestone,
    onRename,
    onDelete,
    onMilestoneClick,
  } = props;

  const [gridEnabled, setGridEnabled] = useState(false);

  // ── Context menu state ──────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{
    milestoneId: string;
    x: number;
    y: number;
  } | null>(null);

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // ── Drag positioning ────────────────────────────────────────────────────────

  // Track drag state with refs to avoid re-renders on every pixel
  const dragMilestoneId = useRef<string | null>(null);

  const handleNodeDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleNodeDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const milestoneId = dragMilestoneId.current;
      dragMilestoneId.current = null;
      if (!milestoneId) return;

      // Compute xPercent/yPercent relative to the map canvas container
      const container = e.currentTarget as HTMLElement;
      const rect = container.getBoundingClientRect();
      let xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      let yPercent = ((e.clientY - rect.top) / rect.height) * 100;

      // Clamp to 0–100
      xPercent = Math.max(0, Math.min(100, xPercent));
      yPercent = Math.max(0, Math.min(100, yPercent));

      // Snap to grid if enabled
      if (gridEnabled) {
        xPercent = Math.round(xPercent / 10) * 10;
        yPercent = Math.round(yPercent / 10) * 10;
      }

      onNodeDrop(milestoneId, Math.round(xPercent), Math.round(yPercent));
    },
    [gridEnabled, onNodeDrop],
  );

  // ── Context menu handlers ───────────────────────────────────────────────────

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, milestoneId: string) => {
      e.preventDefault();
      setContextMenu({ milestoneId, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

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

  const handleDeleteClick = useCallback(
    (milestoneId: string) => {
      setContextMenu(null);
      onDelete(milestoneId);
    },
    [onDelete],
  );

  return (
    <div
      data-testid="milestone-map-editor"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
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
        {/* Draggable milestone nodes rendered inside the canvas */}
        <div
          onDragOver={handleNodeDragOver}
          onDrop={handleNodeDrop}
          style={{
            position: "absolute",
            inset: 0,
          }}
        >
          {milestones.map((ms) => (
            <MilestoneNode
              key={ms.id}
              id={ms.id}
              label={renameId === ms.id ? "Renaming..." : ms.name}
              xPercent={ms.xPercent}
              yPercent={ms.yPercent}
              progressPercent={0}
              status="upcoming"
              draggable
              onClick={() => onMilestoneClick(ms.id)}
              onContextMenu={(e) => handleContextMenu(e, ms.id)}
              onDragEnd={() => {
                // Drag end is handled by onDrop on the container
              }}
            />
          ))}
        </div>

        {gridEnabled && <GridOverlay enabled={true} columns={10} rows={6} />}
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
            onClick={() => handleDeleteClick(contextMenu.milestoneId)}
          >
            Delete
          </button>
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
