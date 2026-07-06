// Renders a single form field based on FieldSchema.
// Supports: text, textarea, select, multiSelect (chip toggle buttons).
import type { FieldSchema } from "../../types/index.ts";

interface FormFieldProps {
  readonly field: FieldSchema;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
}

/** Parse comma-joined multiSelect value into a sorted array. */
const parseMultiSelect = (val: string): ReadonlyArray<string> => {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
};

/** Toggle an option in a comma-joined multiSelect string. */
const toggleOption = (current: string, option: string): string => {
  const selected = parseMultiSelect(current);
  const idx = selected.indexOf(option);
  if (idx === -1) return [...selected, option].join(", ");
  return selected.filter((_, i) => i !== idx).join(", ");
};

const FormField = (props: FormFieldProps) => {
  const { field, value, onChange, error } = props;

  return (
    <div
      className="form-field"
      data-testid={`form-field-${field.id}`}
    >
      <label
        className="form-label"
        {...(field.type !== "multiSelect"
          ? { htmlFor: `input-${field.id}` }
          : {})}
      >
        {field.label}
        {field.required && (
          <span
            aria-hidden="true"
            style={{
              color: "hsl(var(--color-destructive))",
              marginLeft: "var(--space-1)",
            }}
          >
            *
          </span>
        )}
      </label>

      {field.type === "textarea" && (
        <textarea
          id={`input-${field.id}`}
          className="form-input"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      )}

      {field.type === "select" && (
        <select
          id={`input-${field.id}`}
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">- select -</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {field.type === "multiSelect" && (
        <div
          className="chip-select"
          data-testid={`chip-select-${field.id}`}
          role="group"
          aria-label={field.label}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-2)",
          }}
        >
          {field.options?.map((opt) => {
            const selected = parseMultiSelect(value).includes(opt);
            return (
              <button
                key={opt}
                type="button"
                className={`chip-select__chip${
                  selected ? " chip-select__chip--active" : ""
                }`}
                data-testid={`chip-${field.id}-${opt}`}
                role="checkbox"
                aria-checked={selected}
                onClick={() => onChange(toggleOption(value, opt))}
                style={{
                  padding: "var(--space-1) var(--space-3)",
                  borderRadius: "var(--radius-full)",
                  border: selected
                    ? "1.5px solid hsl(var(--color-primary))"
                    : "1.5px solid hsl(var(--color-border))",
                  background: selected
                    ? "hsl(var(--color-primary) / 0.1)"
                    : "transparent",
                  color: selected
                    ? "hsl(var(--color-primary))"
                    : "hsl(var(--color-fg))",
                  fontSize: "var(--text-sm)",
                  fontWeight: selected
                    ? "var(--weight-medium)"
                    : "var(--weight-normal)",
                  cursor: "pointer",
                  transition:
                    "background 0.15s, border-color 0.15s, color 0.15s",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {field.type === "date" && (
        <input
          id={`input-${field.id}`}
          className="form-input"
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type !== "textarea" &&
        field.type !== "select" &&
        field.type !== "multiSelect" &&
        field.type !== "date" && (
        <input
          id={`input-${field.id}`}
          className="form-input"
          type="text"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && (
        <p
          style={{
            color: "hsl(var(--color-destructive))",
            fontSize: "var(--text-xs)",
            marginTop: "var(--space-1)",
          }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
