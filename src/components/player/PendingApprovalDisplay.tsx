// Subscription is handled by ValidationDisplay (parent).
// This component is purely presentational.
interface PendingApprovalDisplayProps {
  readonly missionTitle: string;
  readonly onValidated: () => void;
}

const PendingApprovalDisplay = (props: PendingApprovalDisplayProps) => (
  <div className="pending-approval" data-testid="pending-approval">
    <p style={{ fontSize: "var(--text-2xl)" }} aria-hidden="true">⏳</p>
    <p className="core-text-base core-weight-semibold">
      Waiting for approval
    </p>
    <p className="core-text-sm core-text-muted">
      {props.missionTitle}
    </p>
  </div>
);

export default PendingApprovalDisplay;
