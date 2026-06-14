// Phase 1 shell — logic wired in Phase 4.
interface SaveTemplateModalProps {
  readonly isOpen: boolean;
  readonly templateName: string;
  readonly isSaving: boolean;
  readonly onNameChange: (name: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

const SaveTemplateModal = (props: SaveTemplateModalProps) => {
  if (!props.isOpen) return null;
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
        <div className="form-field" style={{ marginTop: "var(--space-4)" }}>
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
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "flex-end",
            marginTop: "var(--space-6)",
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
            className="btn btn--primary"
            onClick={props.onConfirm}
            disabled={!props.templateName.trim() || props.isSaving}
          >
            {props.isSaving ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveTemplateModal;
