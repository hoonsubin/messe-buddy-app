// Phase 1 shell — logic wired in Phase 4.
import type { ProgressEvent } from "../../types/index.ts";
import ApprovalRequestCard from "./ApprovalRequestCard.tsx";

interface PendingApprovalsPanelProps {
  readonly pendingEvents: ReadonlyArray<ProgressEvent>;
  readonly onApprove: (playerId: string, missionId: string) => void;
  readonly onReject: (playerId: string, missionId: string) => void;
}

const PendingApprovalsPanel = (props: PendingApprovalsPanelProps) => (
  <section data-testid="pending-approvals-panel" aria-label="Pending approvals">
    <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--weight-semibold)", marginBottom: "var(--space-3)" }}>
      Pending Approvals
    </h3>
    {props.pendingEvents.length === 0 ? (
      <p style={{ fontSize: "var(--text-sm)", color: "hsl(var(--color-muted-fg))" }}>
        No pending approvals
      </p>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {props.pendingEvents.map((evt) => (
          <ApprovalRequestCard
            key={`${evt.playerId}::${evt.missionId}`}
            playerName={evt.playerId}
            missionTitle={evt.missionId}
            xpValue={0}
            onApprove={() => props.onApprove(evt.playerId, evt.missionId)}
            onReject={() => props.onReject(evt.playerId, evt.missionId)}
          />
        ))}
      </div>
    )}
  </section>
);

export default PendingApprovalsPanel;
