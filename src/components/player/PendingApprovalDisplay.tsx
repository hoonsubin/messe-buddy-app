// Subscription is handled by ValidationDisplay (parent).
// This component is purely presentational.
interface PendingApprovalDisplayProps {
  readonly missionTitle: string;
  readonly onValidated: () => void;
}

const PendingApprovalDisplay = (props: PendingApprovalDisplayProps) => (
  <div className="pending-approval" data-testid="pending-approval">
    <p style={{ fontSize: "var(--text-2xl)" }} aria-hidden="true">⏳</p>
    <p
      style={{
        fontSize: "var(--text-base)",
        fontWeight: "var(--weight-semibold)",
      }}
    >
      Waiting for approval
    </p>
    <p
      style={{
        fontSize: "var(--text-sm)",
        color: "hsl(var(--color-muted-fg))",
      }}
    >
      {props.missionTitle}
    </p>
  </div>
);

export default PendingApprovalDisplay;
