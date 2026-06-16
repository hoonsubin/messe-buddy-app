// ApprovalRequestCard - shows a single pending approval with Approve, Reject, and Scan QR buttons.
interface ApprovalRequestCardProps {
  readonly playerName: string;
  readonly missionTitle: string;
  readonly xpValue: number;
  readonly onApprove: () => void;
  readonly onReject: () => void;
  readonly onScanQR: () => void;
}

const ApprovalRequestCard = (props: ApprovalRequestCardProps) => (
  <div className="approval-card" data-testid="approval-request-card">
    <div>
      <p
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-semibold)",
        }}
      >
        {props.playerName}
      </p>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "hsl(var(--color-muted-fg))",
        }}
      >
        {props.missionTitle}
      </p>
      <p style={{ fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>
        +{props.xpValue} XP
      </p>
    </div>
    <div
      className="approval-card__actions"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={props.onApprove}
        >
          Approve
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={props.onReject}
        >
          Reject
        </button>
      </div>
      <button
        type="button"
        className="btn btn--secondary"
        style={{ width: "100%" }}
        onClick={props.onScanQR}
      >
        Scan QR
      </button>
    </div>
  </div>
);

export default ApprovalRequestCard;
