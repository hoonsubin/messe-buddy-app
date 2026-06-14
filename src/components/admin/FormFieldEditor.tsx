// Phase 1 shell — logic wired in Phase 4.
import type { FieldSchema } from "../../types/index.ts";
import { FIELD_TYPE } from "../../types/index.ts";
import type { FieldType } from "../../types/index.ts";

interface FormFieldEditorProps {
  readonly field: FieldSchema;
  readonly onChange: (updated: FieldSchema) => void;
  readonly onDelete: () => void;
}

const FormFieldEditor = (props: FormFieldEditorProps) => (
  <div className="card" data-testid="form-field-editor" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
    <div className="form-field">
      <label className="form-label" htmlFor={`field-label-${props.field.id}`}>Label</label>
      <input
        id={`field-label-${props.field.id}`}
        className="form-input"
        type="text"
        value={props.field.label}
        onChange={(e) => props.onChange({ ...props.field, label: e.target.value })}
      />
    </div>
    <div className="form-field">
      <label className="form-label" htmlFor={`field-type-${props.field.id}`}>Type</label>
      <select
        id={`field-type-${props.field.id}`}
        className="form-input"
        value={props.field.type}
        onChange={(e) => props.onChange({ ...props.field, type: e.target.value as FieldType })}
      >
        {(Object.values(FIELD_TYPE) as FieldType[]).map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
      <input
        id={`field-required-${props.field.id}`}
        type="checkbox"
        checked={props.field.required}
        onChange={(e) => props.onChange({ ...props.field, required: e.target.checked })}
      />
      <label htmlFor={`field-required-${props.field.id}`}>Required</label>
    </div>
    <button type="button" className="btn btn--destructive" onClick={props.onDelete}>
      Remove field
    </button>
  </div>
);

export default FormFieldEditor;
