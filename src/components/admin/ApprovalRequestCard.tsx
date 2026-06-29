// ApprovalRequestCard - shows a single pending approval with Approve and Reject.
interface ApprovalRequestCardProps {
  readonly playerName: string;
  readonly missionTitle: string;
  readonly xpValue: number;
  readonly onApprove: () => void;
  readonly onReject: () => void;
}

const ApprovalRequestCard = (props: ApprovalRequestCardProps) => (
  <div className="approval-card" data-testid="approval-request-card">
    <div>
      <p className="core-text-sm core-weight-semibold">
        {props.playerName}
      </p>
      <p className="core-text-sm core-text-muted">
        {props.missionTitle}
      </p>
      <p className="core-text-xs" style={{ marginTop: "var(--space-1)" }}>
        +{props.xpValue} XP
      </p>
    </div>
    {/* approval-card__actions already provides display:flex + gap */}
    <div className="approval-card__actions">
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
  </div>
);

export default ApprovalRequestCard;
