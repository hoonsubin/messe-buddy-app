import { useState } from "react";

interface SaveTemplateModalProps {
  readonly isOpen: boolean;
  readonly templateName: string;
  readonly isSaving: boolean;
  readonly existingTemplates?: ReadonlyArray<string>;
  readonly onNameChange: (name: string) => void;
  /** Called with undefined = save as new (uses templateName), or with a string = replace that template */
  readonly onConfirm: (replaceTarget?: string) => void;
  readonly onCancel: () => void;
}

type SaveMode = "new" | "replace";

const SaveTemplateModal = (props: SaveTemplateModalProps) => {
  const [saveMode, setSaveMode] = useState<SaveMode>("new");
  const [replaceTarget, setReplaceTarget] = useState<string>("");

  if (!props.isOpen) return null;

  const hasExisting = props.existingTemplates &&
    props.existingTemplates.length > 0;
  const effectiveName = saveMode === "replace"
    ? replaceTarget
    : props.templateName.trim();
  const canConfirm = !props.isSaving && !!effectiveName;

  const handleConfirm = () => {
    if (saveMode === "replace") {
      props.onConfirm(replaceTarget || undefined);
    } else {
      props.onConfirm(undefined);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={props.onCancel}
      data-testid="save-template-modal"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-template-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="save-template-title"
          style={{
            margin: 0,
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          Save as template
        </h2>

        {/* Mode toggle - only shown when existing templates exist */}
        {hasExisting && (
          <div
            role="group"
            aria-label="Save mode"
            style={{
              display: "flex",
              gap: "var(--space-2)",
              background: "hsl(var(--color-muted))",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-1)",
            }}
          >
            {(["new", "replace"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSaveMode(mode)}
                style={{
                  flex: 1,
                  minHeight: "var(--touch-target)",
                  borderRadius: "calc(var(--radius-md) - 2px)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-medium)",
                  transition:
                    "background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)",
                  background: saveMode === mode
                    ? "hsl(var(--color-card))"
                    : "transparent",
                  color: saveMode === mode
                    ? "hsl(var(--color-fg))"
                    : "hsl(var(--color-muted-fg))",
                  boxShadow: saveMode === mode ? "var(--shadow-sm)" : "none",
                }}
              >
                {mode === "new" ? "Save as new" : "Replace existing"}
              </button>
            ))}
          </div>
        )}

        {saveMode === "new"
          ? (
            <div className="form-field">
              <label className="form-label" htmlFor="template-name-input">
                Template name
              </label>
              <input
                id="template-name-input"
                className="form-input"
                type="text"
                value={props.templateName}
                onChange={(e) => props.onNameChange(e.target.value)}
                placeholder="e.g. Standard Onboarding"
                autoFocus
              />
            </div>
          )
          : (
            <div className="form-field">
              <label className="form-label" htmlFor="template-replace-select">
                Replace template
              </label>
              <select
                id="template-replace-select"
                className="form-input"
                value={replaceTarget}
                onChange={(e) => setReplaceTarget(e.target.value)}
                style={{ minHeight: "var(--touch-target)" }}
                autoFocus
              >
                <option value="">- Select a template -</option>
                {props.existingTemplates?.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {replaceTarget && (
                <p
                  role="alert"
                  style={{
                    marginTop: "var(--space-2)",
                    fontSize: "var(--text-xs)",
                    color: "hsl(var(--color-destructive))",
                  }}
                >
                  This will overwrite "{replaceTarget}". This cannot be undone.
                </p>
              )}
            </div>
          )}

        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="btn btn--ghost"
            onClick={props.onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${
              saveMode === "replace" ? "btn--destructive" : "btn--primary"
            }`}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {props.isSaving
              ? "Saving…"
              : saveMode === "replace"
              ? "Replace template"
              : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveTemplateModal;
