// Phase 1 shell — wraps FormFields for a mission. Submit logic wired in Phase 3.
import type { FieldSchema } from "../../types/index.ts";
import FormField from "./FormField.tsx";

interface FormShellProps {
  readonly missionTitle: string;
  readonly fields: ReadonlyArray<FieldSchema>;
  readonly values: Record<string, string>;
  readonly errors: Record<string, string>;
  readonly isSubmitting: boolean;
  readonly onFieldChange: (fieldId: string, value: string) => void;
  readonly onSubmit: () => void;
}

const FormShell = (props: FormShellProps) => (
  <form
    className="form-shell"
    data-testid="form-shell"
    onSubmit={(e) => {
      e.preventDefault();
      props.onSubmit();
    }}
  >
    <h1
      style={{
        fontSize: "var(--text-xl)",
        fontWeight: "var(--weight-semibold)",
        margin: 0,
        marginBottom: "var(--space-6)",
      }}
    >
      {props.missionTitle}
    </h1>

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

    <button
      type="submit"
      className="btn btn--primary"
      disabled={props.isSubmitting}
      style={{ marginTop: "var(--space-8)", width: "100%" }}
    >
      {props.isSubmitting ? "Submitting…" : "Submit"}
    </button>
  </form>
);

export default FormShell;
