// Phase 1 shell — logic wired in Phase 4.
import type { FieldSchema } from "../../types/index.ts";
import FormFieldEditor from "./FormFieldEditor.tsx";

interface FormEditorProps {
  readonly missionId: string;
  readonly fields: ReadonlyArray<FieldSchema>;
  readonly onChange: (fields: ReadonlyArray<FieldSchema>) => void;
}

const FormEditor = (props: FormEditorProps) => (
  <div data-testid="form-editor" data-mission-id={props.missionId}>
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {props.fields.map((field, i) => (
        <FormFieldEditor
          key={field.id}
          field={field}
          onChange={(updated) => {
            const next = [...props.fields];
            next[i] = updated;
            props.onChange(next);
          }}
          onDelete={() => props.onChange(props.fields.filter((_, j) => j !== i))}
        />
      ))}
    </div>
    <button
      type="button"
      className="btn btn--secondary"
      style={{ marginTop: "var(--space-4)" }}
      onClick={() =>
        props.onChange([
          ...props.fields,
          {
            id: `field_${Date.now()}`,
            label: "New field",
            type: "text",
            required: false,
          },
        ])
      }
    >
      + Add field
    </button>
  </div>
);

export default FormEditor;
