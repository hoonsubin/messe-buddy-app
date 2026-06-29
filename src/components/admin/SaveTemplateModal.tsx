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
          className="save-template-modal__header core-m-0"
        >
          Save as template
        </h2>

        {/* Mode toggle - only shown when existing templates exist */}
        {hasExisting && (
          <div
            role="group"
            aria-label="Save mode"
            className="save-template-modal__toggle-group"
          >
            {(["new", "replace"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSaveMode(mode)}
                className={`save-template-modal__toggle-btn${
                  saveMode === mode
                    ? " save-template-modal__toggle-btn--active"
                    : " save-template-modal__toggle-btn--inactive"
                }`}
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
                <p role="alert" className="save-template-modal__warn">
                  This will overwrite "{replaceTarget}". This cannot be undone.
                </p>
              )}
            </div>
          )}

        <div className="save-template-modal__actions">
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
