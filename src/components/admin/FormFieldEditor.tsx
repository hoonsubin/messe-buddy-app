import { useState } from "react";
import { MdClose } from "react-icons/md";
import type { FieldSchema } from "../../types/index.ts";
import { FIELD_TYPE } from "../../types/index.ts";
import type { FieldType } from "../../types/index.ts";

interface FormFieldEditorProps {
  readonly field: FieldSchema;
  readonly onChange: (updated: FieldSchema) => void;
  readonly onDelete: () => void;
}

const FormFieldEditor = (props: FormFieldEditorProps) => {
  const [newOption, setNewOption] = useState("");

  const needsOptions = props.field.type === FIELD_TYPE.SELECT ||
    props.field.type === FIELD_TYPE.MULTI_SELECT;

  const addOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    props.onChange({
      ...props.field,
      options: [...(props.field.options ?? []), trimmed],
    });
    setNewOption("");
  };

  return (
    <div
      className="card"
      data-testid="form-field-editor"
      style={{
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div className="form-field">
        <label className="form-label" htmlFor={`field-label-${props.field.id}`}>
          Label
        </label>
        <input
          id={`field-label-${props.field.id}`}
          className="form-input"
          type="text"
          value={props.field.label}
          onChange={(e) =>
            props.onChange({ ...props.field, label: e.target.value })}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor={`field-type-${props.field.id}`}>
          Type
        </label>
        <select
          id={`field-type-${props.field.id}`}
          className="form-input"
          value={props.field.type}
          onChange={(e) => {
            const nextType = e.target.value as FieldType;
            const isChoiceType = nextType === FIELD_TYPE.SELECT ||
              nextType === FIELD_TYPE.MULTI_SELECT;
            props.onChange({
              ...props.field,
              type: nextType,
              // Preserve options when staying within choice types; clear otherwise
              options: isChoiceType ? (props.field.options ?? []) : undefined,
            });
          }}
        >
          {(Object.values(FIELD_TYPE) as FieldType[]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {needsOptions && (
        <div className="form-field">
          <label className="form-label">Options</label>
          {(props.field.options ?? []).length > 0 && (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 var(--space-2)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
              }}
            >
              {(props.field.options ?? []).map((opt, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-1) var(--space-2)",
                    background: "hsl(var(--color-muted))",
                    borderRadius: "var(--radius)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  <span style={{ flex: 1 }}>{opt}</span>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    aria-label={`Remove option "${opt}"`}
                    style={{ padding: "2px" }}
                    onClick={() =>
                      props.onChange({
                        ...props.field,
                        options: (props.field.options ?? []).filter(
                          (_, j) => j !== i,
                        ),
                      })}
                  >
                    <MdClose size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              className="form-input"
              type="text"
              value={newOption}
              placeholder="Add option…"
              style={{ flex: 1 }}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption();
                }
              }}
            />
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!newOption.trim()}
              onClick={addOption}
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div
        style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}
      >
        <input
          id={`field-required-${props.field.id}`}
          type="checkbox"
          checked={props.field.required}
          onChange={(e) =>
            props.onChange({ ...props.field, required: e.target.checked })}
        />
        <label htmlFor={`field-required-${props.field.id}`}>Required</label>
      </div>

      <button
        type="button"
        className="btn btn--destructive"
        onClick={props.onDelete}
      >
        Remove field
      </button>
    </div>
  );
};

export default FormFieldEditor;
