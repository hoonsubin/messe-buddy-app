// Phase 6 - wired pre-boarding checklist for the admin cockpit.
// Checkbox toggle, inline add item, and mark-all-done callbacks.
import { useState } from "react";
import { MdAdd, MdCheckBox, MdCheckBoxOutlineBlank } from "react-icons/md";
import type { PreBoardingCheckItem } from "../../types/index.ts";

interface PreBoardingChecklistProps {
  readonly playerName?: string;
  readonly items: ReadonlyArray<PreBoardingCheckItem>;
  readonly onToggle: (id: string) => void;
  readonly onAdd: (label: string) => void;
  readonly onMarkAllDone: () => void;
}

const PreBoardingChecklist = (props: PreBoardingChecklistProps) => {
  const { items, onToggle, onAdd, onMarkAllDone, playerName } = props;
  const completedCount = items.filter((i) => i.checked).length;
  const [adding, setAdding] = useState(false);
  const [addText, setAddText] = useState("");

  const handleAdd = () => {
    const trimmed = addText.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setAddText("");
    setAdding(false);
  };

  return (
    <section
      aria-label="Pre-boarding checklist"
      data-testid="pre-boarding-checklist"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <div
        className="card"
        style={{
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <header>
          <h2
            style={{
              margin: "0 0 var(--space-1)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              fontWeight: "var(--weight-semibold)",
              color: "hsl(var(--color-fg))",
              lineHeight: "var(--leading-tight)",
            }}
          >
            {playerName
              ? `Before ${playerName}'s first day`
              : "Pre-Boarding Checklist"}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            {completedCount} of {items.length} tasks complete
          </p>
        </header>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          {items.map((item) => (
            <li key={item.id}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  background: item.checked
                    ? "hsl(var(--color-status-complete) / 0.08)"
                    : "hsl(var(--color-bg))",
                  minHeight: "var(--min-touch)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => onToggle(item.id)}
                  style={{ display: "none" }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                    fontSize: "var(--text-xl)",
                    color: item.checked
                      ? "hsl(var(--color-status-complete))"
                      : "hsl(var(--color-muted-fg))",
                  }}
                >
                  {item.checked ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: item.checked
                      ? "hsl(var(--color-status-complete))"
                      : "hsl(var(--color-fg))",
                    fontWeight: "var(--weight-medium)",
                    textDecoration: item.checked ? "line-through" : "none",
                    flex: 1,
                  }}
                >
                  {item.label}
                </span>
                {item.dueDate && (
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "hsl(var(--color-muted-fg))",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Due {item.dueDate}
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>

        {/* Inline add-item input */}
        {adding && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
            style={{ display: "flex", gap: "var(--space-2)" }}
          >
            <input
              className="form-input"
              type="text"
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              placeholder="New task…"
              autoFocus
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setAdding(false);
                  setAddText("");
                }
              }}
            />
            <button
              type="submit"
              className="btn btn--primary"
              style={{ padding: "var(--space-1) var(--space-3)" }}
            >
              Add
            </button>
          </form>
        )}

        {/* Action row */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setAdding(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
            }}
          >
            <MdAdd aria-hidden="true" /> Add item
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onMarkAllDone}
            disabled={items.every((i) => i.checked)}
          >
            Mark all done
          </button>
        </div>
      </div>
    </section>
  );
};

export default PreBoardingChecklist;
