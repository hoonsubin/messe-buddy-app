import { useState } from "react";

interface NameCaptureModalProps {
  readonly onSubmit: (name: string) => void;
  readonly loading?: boolean;
}

// Shown once, right after joinSession and before the recovery key.
// Captures the player's name so it can be persisted and shown to the Game Maker.
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
          What's your name?
        </h2>
        <p className="recovery-modal__description">
          Your buddy and team will see this so they can welcome you. You can
          fill in the rest of your profile later.
        </p>

        <input
          type="text"
          className="form-input"
          placeholder="e.g. Sofia Chen"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={60}
          aria-label="Your name"
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) props.onSubmit(trimmed);
          }}
          style={{ width: "100%", marginBottom: "var(--space-4)" }}
        />

        <button
          type="button"
          className="btn btn--primary recovery-modal__dismiss-btn"
          disabled={!canSubmit}
          onClick={() => props.onSubmit(trimmed)}
        >
          {props.loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
};

export default NameCaptureModal;
