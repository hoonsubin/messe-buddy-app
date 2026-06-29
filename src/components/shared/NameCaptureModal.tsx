import { useState } from "react";

interface NameCaptureModalProps {
  readonly onSubmit: (name: string) => void;
  readonly loading?: boolean;
  readonly title?: string;
  readonly description?: string;
  readonly placeholder?: string;
  readonly submitLabel?: string;
  readonly inputLabel?: string;
  readonly onCancel?: () => void;
}

// Shown once, right after joinSession and before the recovery key.
// Captures the player's name so it can be persisted and shown to the Game Maker.
// Copy is overridable so the Game Maker can reuse it to add a new hire.
const NameCaptureModal = (props: NameCaptureModalProps) => {
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !props.loading;

  return (
    <div
      className="recovery-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-modal-title"
    >
      <div className="recovery-modal__container">
        <h2 id="name-modal-title" className="recovery-modal__title">
          {props.title ?? "What's your name?"}
        </h2>
        <p className="recovery-modal__description">
          {props.description ??
            "Your buddy and team will see this so they can welcome you. You can fill in the rest of your profile later."}
        </p>

        <input
          type="text"
          className="form-input core-w-full core-mb-4"
          placeholder={props.placeholder ?? "e.g. Sofia Chen"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={60}
          aria-label={props.inputLabel ?? "Your name"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) props.onSubmit(trimmed);
            if (e.key === "Escape" && props.onCancel) props.onCancel();
          }}
        />

        <button
          type="button"
          className="btn btn--primary recovery-modal__dismiss-btn"
          disabled={!canSubmit}
          onClick={() => props.onSubmit(trimmed)}
        >
          {props.loading ? "Saving…" : (props.submitLabel ?? "Continue")}
        </button>

        {props.onCancel && (
          <button
            type="button"
            className="btn btn--ghost core-w-full core-mt-2"
            onClick={props.onCancel}
            disabled={props.loading}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default NameCaptureModal;
