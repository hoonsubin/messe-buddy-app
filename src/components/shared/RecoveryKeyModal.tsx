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
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
        background: "hsl(var(--color-fg) / 0.5)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "22rem",
          padding: "var(--space-6)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h2
          id="recovery-modal-title"
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
            color: "hsl(var(--color-fg))",
            margin: "0 0 var(--space-2)",
          }}
        >
          Save your recovery key
        </h2>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-muted-fg))",
            margin: "0 0 var(--space-5)",
          }}
        >
          This key restores your progress if you lose access. It won't be shown
          again.
        </p>

        {/* Key display */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            background: "hsl(var(--color-secondary))",
            border: "1px solid hsl(var(--color-border))",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-5)",
          }}
        >
          <code
            style={{
              flex: 1,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-lg)",
              letterSpacing: "0.15em",
              color: "hsl(var(--color-fg))",
              userSelect: "all",
            }}
          >
            {props.recoveryKey}
          </code>
          <button
            type="button"
            className="btn btn--ghost"
            style={{
              flexShrink: 0,
              padding: "var(--space-1) var(--space-2)",
              fontSize: "var(--text-sm)",
            }}
            onClick={handleCopy}
            aria-label="Copy recovery key to clipboard"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={props.onDismiss}
        >
          I've saved my recovery key
        </button>
      </div>
    </div>
  );
};

export default RecoveryKeyModal;
