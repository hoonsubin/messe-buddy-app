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
      className="preboarding-checklist"
    >
      <div className="card preboarding-checklist__card">
        <header>
          <h2 className="preboarding-checklist__title">
            {playerName
              ? `Before ${playerName}'s first day`
              : "Pre-Boarding Checklist"}
          </h2>
          <p className="preboarding-checklist__summary">
            {completedCount} of {items.length} tasks complete
          </p>
        </header>

        <ul className="preboarding-checklist__list">
          {items.map((item) => (
            <li key={item.id}>
              <label
                className={`preboarding-checklist__item-label${
                  item.checked
                    ? " preboarding-checklist__item-label--checked"
                    : " preboarding-checklist__item-label--unchecked"
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => onToggle(item.id)}
                  style={{ display: "none" }}
                />
                <span
                  aria-hidden="true"
                  className={`preboarding-checklist__item-icon${
                    item.checked
                      ? " preboarding-checklist__item-icon--checked"
                      : " preboarding-checklist__item-icon--unchecked"
                  }`}
                >
                  {item.checked ? <MdCheckBox /> : <MdCheckBoxOutlineBlank />}
                </span>
                <span
                  className={`preboarding-checklist__item-text${
                    item.checked
                      ? " preboarding-checklist__item-text--checked"
                      : " preboarding-checklist__item-text--unchecked"
                  }`}
                >
                  {item.label}
                </span>
                {item.dueDate && (
                  <span className="preboarding-checklist__item-due">
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
            className="preboarding-checklist__add-form"
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
        <div className="preboarding-checklist__actions">
          <button
            type="button"
            className="btn btn--secondary preboarding-checklist__add-btn"
            onClick={() => setAdding(true)}
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
