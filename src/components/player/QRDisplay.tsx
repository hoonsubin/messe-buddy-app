// Phase 1 shell — QR canvas placeholder; qr-code library wired in Phase 5.
interface QRDisplayProps {
  readonly playerId: string;
  readonly missionId: string;
  readonly xpValue: number;
  readonly onValidated: () => void;
}

const QRDisplay = (props: QRDisplayProps) => (
  <div className="validation-display" data-testid="qr-display">
    <div
      className="qr-display__canvas"
      aria-label={`QR code for mission ${props.missionId}`}
      role="img"
      data-player={props.playerId}
      data-xp={props.xpValue}
    >
      <span style={{ color: "var(--color-muted-fg)", fontSize: "var(--text-xs)" }}>
        QR code renders here
      </span>
    </div>
    <p style={{ fontSize: "var(--text-sm)", color: "hsl(var(--color-muted-fg))" }}>
      Ask your buddy to scan this code
    </p>
    <button
      type="button"
      className="btn btn--ghost"
      onClick={props.onValidated}
      style={{ display: "none" }}
      aria-hidden="true"
    >
      Validated (internal)
    </button>
  </div>
);

export default QRDisplay;
