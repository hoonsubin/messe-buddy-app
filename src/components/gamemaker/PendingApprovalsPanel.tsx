import { MdPendingActions } from "react-icons/md";
import type { Mission, Player, ProgressEvent } from "../../types/index.ts";
import ApprovalRequestCard from "./ApprovalRequestCard.tsx";

interface PendingApprovalsPanelProps {
  readonly pendingEvents: ReadonlyArray<ProgressEvent>;
  readonly players: ReadonlyArray<Player>;
  readonly missions: ReadonlyArray<Mission>;
  readonly onApprove: (playerId: string, missionId: string) => void;
  readonly onReject: (playerId: string, missionId: string) => void;
}

const PendingApprovalsPanel = (props: PendingApprovalsPanelProps) => (
  <section
    data-testid="pending-approvals-panel"
    aria-label="Pending approvals"
    className="card"
    style={{
      padding: "var(--space-4)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
    }}
  >
    <header
      style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
    >
      <MdPendingActions
        size={18}
        aria-hidden="true"
        className="core-icon-accent"
      />
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-semibold)",
          color: "hsl(var(--color-fg))",
        }}
      >
        Pending Approvals
      </h3>
    </header>
    {props.pendingEvents.length === 0
      ? (
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-muted-fg))",
          }}
        >
          No pending approvals
        </p>
      )
      : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {props.pendingEvents.map((evt) => {
            const player = props.players.find((p) => p.id === evt.playerId);
            const mission = props.missions.find((m) => m.id === evt.missionId);
            return (
              <ApprovalRequestCard
                key={`${evt.playerId}::${evt.missionId}`}
                playerName={player?.name || player?.uid || evt.playerId}
                missionTitle={mission?.title ?? evt.missionId}
                xpValue={mission?.xpValue ?? 0}
                onApprove={() => props.onApprove(evt.playerId, evt.missionId)}
                onReject={() => props.onReject(evt.playerId, evt.missionId)}
              />
            );
          })}
        </div>
      )}
  </section>
);

export default PendingApprovalsPanel;
