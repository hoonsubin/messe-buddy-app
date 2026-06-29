import { useRef, useState } from "react";
import { MdClose, MdDragIndicator } from "react-icons/md";
import type { PreBoardingCheckItem } from "../../types/index.ts";

// Default 8 items — hard-coded for prototype; customisable per-hire.
const DEFAULT_CHECKLIST: ReadonlyArray<PreBoardingCheckItem> = [
  { id: "chk_contract", label: "Contract signed", checked: false },
  { id: "chk_tax", label: "Tax forms submitted", checked: false },
  { id: "chk_id", label: "ID documents verified", checked: false },
  { id: "chk_it", label: "IT account created", checked: false },
  { id: "chk_badge", label: "Access badge issued", checked: false },
  { id: "chk_equipment", label: "Equipment assigned", checked: false },
  { id: "chk_email", label: "First day email sent", checked: false },
  { id: "chk_buddy", label: "Buddy introduced", checked: false },
];

interface HireChecklistProps {
  readonly items: ReadonlyArray<PreBoardingCheckItem>;
  readonly onToggle: (itemId: string) => void;
  readonly onRename: (itemId: string, newLabel: string) => void;
  readonly onDelete: (itemId: string) => void;
  readonly onAdd: (label: string) => void;
  readonly onReorder: (fromIndex: number, toIndex: number) => void;
}

const HireChecklist = ({
  items,
  onToggle,
  onRename,
  onDelete,
  onAdd,
  onReorder,
}: HireChecklistProps) => {
  const [editMode, setEditMode] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const newInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const checkedCount = items.filter((i) => i.checked).length;
  const total = items.length;
  const allDone = total > 0 && checkedCount === total;

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewLabel("");
    newInputRef.current?.focus();
  };

  return (
    <section
      data-testid="hire-checklist"
      aria-label="Onboarding checklist (admin only)"
      style={{
        borderTop: "1px solid hsl(var(--color-border))",
        padding: "var(--space-4)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-3)",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "var(--text-xs)",
            fontWeight: "var(--weight-semibold)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "hsl(var(--color-muted-fg))",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            flex: 1,
            flexWrap: "wrap",
          }}
        >
          {editMode ? "Editing checklist" : "Onboarding checklist"}
          {!editMode && (
            <>
              <span
                data-testid="checklist-progress-pill"
                style={{
                  fontSize: "var(--text-xs)",
                  padding: "1px 8px",
                  borderRadius: "var(--radius-full)",
                  background: allDone
                    ? "hsl(var(--color-status-complete) / 0.15)"
                    : "hsl(var(--color-accent) / 0.12)",
                  color: allDone
                    ? "hsl(var(--color-status-complete))"
                    : "hsl(var(--color-accent))",
                  fontWeight: "var(--weight-medium)",
                  textTransform: "none",
                  letterSpacing: "normal",
                }}
              >
                {checkedCount} / {total}
              </span>
              <span
                data-testid="admin-only-badge"
                style={{
                  fontSize: "var(--text-xs)",
                  padding: "1px 6px",
                  borderRadius: "var(--radius)",
                  background: "hsl(var(--color-secondary))",
                  color: "hsl(var(--color-muted-fg))",
                  border: "1px solid hsl(var(--color-border))",
                  textTransform: "none",
                  letterSpacing: "normal",
                }}
              >
                admin only
              </span>
            </>
          )}
        </h3>

        {editMode
          ? (
            <button
              type="button"
              data-testid="checklist-done-btn"
              onClick={() => setEditMode(false)}
              style={{
                fontSize: "var(--text-xs)",
                padding: "3px 10px",
                borderRadius: "var(--radius)",
                border: "1px solid hsl(var(--color-accent) / 0.4)",
                background: "hsl(var(--color-accent) / 0.08)",
                color: "hsl(var(--color-accent))",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Done
            </button>
          )
          : (
            <button
              type="button"
              data-testid="checklist-edit-btn"
              onClick={() => setEditMode(true)}
              style={{
                fontSize: "var(--text-xs)",
                color: "hsl(var(--color-muted-fg))",
                textDecoration: "underline",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
              }}
            >
              Edit
            </button>
          )}
      </div>

      {/* ── Read mode: checkbox grid ─────────────────────────────────────── */}
      {!editMode && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 14rem), 1fr))",
            gap: "var(--space-1) var(--space-5)",
          }}
        >
          {items.map((item) => (
            <label
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
                padding: "var(--space-1) 0",
                minHeight: "var(--min-touch)",
              }}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => onToggle(item.id)}
                style={{
                  width: "1rem",
                  height: "1rem",
                  cursor: "pointer",
                  flexShrink: 0,
                  accentColor: "hsl(var(--color-accent))",
                }}
              />
              <span
                style={{
                  color: item.checked
                    ? "hsl(var(--color-muted-fg))"
                    : "hsl(var(--color-fg))",
                  textDecoration: item.checked ? "line-through" : "none",
                }}
              >
                {item.label}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* ── Edit mode: CRUD rows ─────────────────────────────────────────── */}
      {editMode && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              data-testid={`checklist-edit-row-${item.id}`}
              draggable
              onDragStart={() => {
                dragIndexRef.current = idx;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(idx);
              }}
              onDrop={() => {
                const from = dragIndexRef.current;
                if (from !== null && from !== idx) onReorder(from, idx);
                dragIndexRef.current = null;
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                dragIndexRef.current = null;
                setDragOverIndex(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                borderBottom: dragOverIndex === idx
                  ? "2px solid hsl(var(--color-accent))"
                  : "1px solid hsl(var(--color-border))",
                padding: "var(--space-1) 0",
                minHeight: "var(--min-touch)",
                opacity: dragIndexRef.current === idx ? 0.4 : 1,
                transition: "border-color 0.1s",
              }}
            >
              {/* Drag handle */}
              <span
                aria-hidden="true"
                style={{
                  cursor: "grab",
                  color: "hsl(var(--color-muted-fg))",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                  touchAction: "none",
                }}
              >
                <MdDragIndicator size={18} />
              </span>

              {/* Label input */}
              <input
                type="text"
                data-testid={`checklist-item-input-${item.id}`}
                defaultValue={item.label}
                aria-label={`Edit label for "${item.label}"`}
                onBlur={(e) => {
                  const trimmed = e.currentTarget.value.trim();
                  if (trimmed && trimmed !== item.label) {
                    onRename(item.id, trimmed);
                  } else if (!trimmed) {
                    e.currentTarget.value = item.label;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                  if (e.key === "Escape") {
                    e.currentTarget.value = item.label;
                    e.currentTarget.blur();
                  }
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderBottomColor =
                    "hsl(var(--color-accent))";
                }}
                onBlurCapture={(e) => {
                  e.currentTarget.style.borderBottomColor = "transparent";
                }}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid transparent",
                  fontSize: "var(--text-sm)",
                  color: "hsl(var(--color-fg))",
                  padding: "2px 0",
                  outline: "none",
                  minWidth: 0,
                }}
              />

              {/* Delete button */}
              <button
                type="button"
                data-testid={`checklist-delete-btn-${item.id}`}
                aria-label={`Delete "${item.label}"`}
                onClick={() =>
                  onDelete(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "1.5rem",
                  height: "1.5rem",
                  background: "none",
                  border: "1px solid hsl(var(--color-border))",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                  color: "hsl(var(--color-muted-fg))",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <MdClose size={12} aria-hidden="true" />
              </button>
            </div>
          ))}

          {/* Add row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              paddingTop: "var(--space-2)",
            }}
          >
            <input
              ref={newInputRef}
              type="text"
              data-testid="checklist-new-input"
              placeholder="Add a checklist item…"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              style={{
                flex: 1,
                background: "hsl(var(--color-secondary))",
                border: "1px solid hsl(var(--color-border))",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
                fontSize: "var(--text-sm)",
                color: "hsl(var(--color-fg))",
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              type="button"
              data-testid="checklist-add-btn"
              disabled={!newLabel.trim()}
              onClick={handleAdd}
              style={{
                fontSize: "var(--text-xs)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid hsl(var(--color-border))",
                background: newLabel.trim()
                  ? "hsl(var(--color-accent) / 0.08)"
                  : "hsl(var(--color-secondary))",
                color: newLabel.trim()
                  ? "hsl(var(--color-accent))"
                  : "hsl(var(--color-muted-fg))",
                cursor: newLabel.trim() ? "pointer" : "default",
                flexShrink: 0,
                transition: "background 0.1s, color 0.1s",
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export { DEFAULT_CHECKLIST };
export default HireChecklist;
