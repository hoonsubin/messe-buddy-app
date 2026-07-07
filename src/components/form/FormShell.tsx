// Renders a mission form with fields, description, draft save, and back navigation.
import type { FieldSchema } from "../../types/index.ts";
import FormField from "./FormField.tsx";

interface FormShellProps {
  readonly missionTitle: string;
  readonly description?: string;
  readonly fields: ReadonlyArray<FieldSchema>;
  readonly values: Record<string, string>;
  readonly errors: Record<string, string>;
  readonly isSubmitting: boolean;
  readonly isDraft?: boolean;
  readonly onFieldChange: (fieldId: string, value: string) => void;
  readonly onSubmit: () => void;
  readonly onSaveForLater?: () => void;
  readonly onBack?: () => void;
}

const FormShell = (props: FormShellProps) => (
  <form
    className="form-shell"
    data-testid="form-shell"
    noValidate
    onSubmit={(e) => {
      e.preventDefault();
      props.onSubmit();
    }}
  >
    {/* Back navigation */}
    {props.onBack && (
      <button
        type="button"
        className="btn btn--ghost"
        onClick={props.onBack}
        style={{
          marginBottom: "var(--space-2)",
          fontSize: "var(--text-sm)",
          padding: "var(--space-1) var(--space-2)",
          color: "hsl(var(--color-muted-fg))",
        }}
        data-testid="form-back-btn"
      >
        ← Dashboard
      </button>
    )}

    <h1
      style={{
        fontSize: "var(--text-xl)",
        fontWeight: "var(--weight-semibold)",
        margin: 0,
        marginBottom: props.description ? "var(--space-2)" : "var(--space-6)",
      }}
    >
      {props.missionTitle}
    </h1>

    {props.description && (
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "hsl(var(--color-muted-fg))",
          margin: "0 0 var(--space-6)",
          lineHeight: "var(--leading-relaxed)",
        }}
        data-testid="form-description"
      >
        {props.description}
      </p>
    )}

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {props.fields.map((field) => (
        <FormField
          key={field.id}
          field={field}
          value={props.values[field.id] ?? ""}
          error={props.errors[field.id]}
          onChange={(value) => props.onFieldChange(field.id, value)}
        />
      ))}
    </div>

    {/* Action buttons: Save for Later | Submit */}
    <div
      style={{
        marginTop: "var(--space-8)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <button
        type="submit"
        className="btn btn--primary"
        disabled={props.isSubmitting}
        style={{ width: "100%" }}
      >
        {props.isSubmitting ? "Submitting…" : "Submit"}
      </button>

      {props.onSaveForLater && (
        <button
          type="button"
          className="btn btn--secondary"
          disabled={props.isSubmitting}
          onClick={props.onSaveForLater}
          style={{ width: "100%" }}
          data-testid="form-save-later-btn"
        >
          {props.isDraft ? "Saved as draft" : "Save for later"}
        </button>
      )}
    </div>
  </form>
);

export default FormShell;
