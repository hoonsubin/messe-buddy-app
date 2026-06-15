import { useState } from "react";

interface RecoveryKeyModalProps {
  readonly recoveryKey: string;
  readonly onDismiss: () => void;
}

// Shown once after joinSession or createGameMakerSession.
// Forces an explicit acknowledgement before routing to the cockpit.
const RecoveryKeyModal = (props: RecoveryKeyModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(props.recoveryKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="recovery-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-modal-title"
    >
      <div className="recovery-modal__container">
        <h2 id="recovery-modal-title" className="recovery-modal__title">
          Save your recovery key
        </h2>
        <p className="recovery-modal__description">
          This key restores your progress if you lose access. It won't be shown
          again.
        </p>

        {/* Key display */}
        <div className="recovery-modal__key">
          <code className="recovery-modal__key-text">
            {props.recoveryKey}
          </code>
          <button
            type="button"
            className="btn btn--ghost recovery-modal__key-btn"
            onClick={handleCopy}
            aria-label="Copy recovery key to clipboard"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <button
          type="button"
          className="btn btn--primary recovery-modal__dismiss-btn"
          onClick={props.onDismiss}
        >
          I've saved my recovery key
        </button>
      </div>
    </div>
  );
};

export default RecoveryKeyModal;
