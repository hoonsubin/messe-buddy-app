// Phase 1 shell — logic wired in Phase 4.
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
      <p style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>
        {props.playerName}
      </p>
      <p style={{ fontSize: "var(--text-sm)", color: "hsl(var(--color-muted-fg))" }}>
        {props.missionTitle}
      </p>
      <p style={{ fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>
        +{props.xpValue} XP
      </p>
    </div>
    <div className="approval-card__actions">
      <button type="button" className="btn btn--primary" onClick={props.onApprove}>
        Approve
      </button>
      <button type="button" className="btn btn--ghost" onClick={props.onReject}>
        Reject
      </button>
    </div>
  </div>
);

export default ApprovalRequestCard;
