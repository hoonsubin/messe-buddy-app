// Phase 1 shell — logic wired in Phase 5.
import type { Mission } from "../../types/index.ts";
import QRDisplay from "./QRDisplay.tsx";
import PendingApprovalDisplay from "./PendingApprovalDisplay.tsx";

interface ValidationDisplayProps {
  readonly playerId: string;
  readonly missionId: string;
  readonly mission: Mission;
  readonly onValidated: () => void;
}

const ValidationDisplay = (props: ValidationDisplayProps) => {
  const method = props.mission.validationMethod;

  return (
    <div
      className="validation-display"
      data-testid="validation-display"
      data-method={method}
    >
      {method === "qr"
        ? (
          <QRDisplay
            playerId={props.playerId}
            missionId={props.missionId}
            xpValue={props.mission.xpValue}
            onValidated={props.onValidated}
          />
        )
        : method === "gmApprove"
        ? (
          <PendingApprovalDisplay
            missionTitle={props.mission.title}
            onValidated={props.onValidated}
          />
        )
        : (
          // selfApprove — handled by MissionDetailPopup's "Mark Complete" button
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "hsl(var(--color-muted-fg))",
            }}
          >
            Mark as complete when ready.
          </p>
        )}
    </div>
  );
};

export default ValidationDisplay;
