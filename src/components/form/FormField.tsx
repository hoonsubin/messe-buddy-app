// Phase 1 shell — renders a single form field based on FieldSchema. Logic wired in Phase 3.
import type { FieldSchema } from "../../types/index.ts";

interface FormFieldProps {
  readonly field: FieldSchema;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
}

const FormField = (props: FormFieldProps) => (
  <div className="form-field" data-testid={`form-field-${props.field.id}`}>
    <label className="form-label" htmlFor={`input-${props.field.id}`}>
      {props.field.label}
      {props.field.required && <span aria-hidden="true" style={{ color: "hsl(var(--color-destructive))", marginLeft: "var(--space-1)" }}>*</span>}
    </label>

    {props.field.type === "textarea" ? (
      <textarea
        id={`input-${props.field.id}`}
        className="form-input"
        value={props.value}
        placeholder={props.field.placeholder}
        required={props.field.required}
        onChange={(e) => props.onChange(e.target.value)}
        rows={4}
      />
    ) : props.field.type === "select" ? (
      <select
        id={`input-${props.field.id}`}
        className="form-input"
        value={props.value}
        required={props.field.required}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="">— select —</option>
        {props.field.options?.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    ) : (
      <input
        id={`input-${props.field.id}`}
        className="form-input"
        type="text"
        value={props.value}
        placeholder={props.field.placeholder}
        required={props.field.required}
        onChange={(e) => props.onChange(e.target.value)}
      />
    )}

    {props.error && (
      <p style={{ color: "hsl(var(--color-destructive))", fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }} role="alert">
        {props.error}
      </p>
    )}
  </div>
);

export default FormField;
