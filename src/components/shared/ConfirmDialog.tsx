/**
 * ConfirmDialog - centered modal dialog for irreversible or interruptive actions.
 *
 * Uses the existing .modal-backdrop / .modal CSS classes so it inherits the
 * same centering, backdrop blur, and border-radius treatment as SaveTemplateModal.
 *
 * Usage:
 *   <ConfirmDialog
 *     isOpen={showSkipConfirm}
 *     title="Skip tutorial?"
 *     body="You can always complete the tutorial later from settings."
 *     confirmLabel="Skip tutorial"
 *     onConfirm={handleSkipConfirm}
 *     onCancel={handleSkipCancel}
 *   />
 */

interface ConfirmDialogProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly body?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** When true, the confirm button renders as btn--destructive. */
  readonly isDestructive?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

const ConfirmDialog = ({
  isOpen,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      data-testid="confirm-dialog"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="confirm-dialog-title"
          style={{
            margin: 0,
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          {title}
        </h3>
        {body && (
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
              lineHeight: "var(--leading-relaxed)",
            }}
          >
            {body}
          </p>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-3)",
          }}
        >
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${
              isDestructive ? "btn--destructive" : "btn--primary"
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
