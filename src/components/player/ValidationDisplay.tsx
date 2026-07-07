import type { Mission } from "../../types/index.ts";
import { useWatchProgressMission } from "../../hooks/useWatchProgressMission.ts";
import { isProgressValidated } from "../../store/progressEvents.ts";
import QRDisplay from "./QRDisplay.tsx";
import PendingApprovalDisplay from "./PendingApprovalDisplay.tsx";

interface ValidationDisplayProps {
  readonly playerId: string;
  readonly missionId: string;
  readonly sessionId: string;
  readonly qrSecret: string;
  readonly mission: Mission;
  readonly onValidated: () => void;
}

const ValidationDisplay = (props: ValidationDisplayProps) => {
  const { playerId, missionId, sessionId, qrSecret, mission, onValidated } =
    props;
  const method = mission.validationMethod;

  useWatchProgressMission(
    playerId,
    missionId,
    (event) => {
      if (isProgressValidated(event.status)) {
        onValidated();
      }
    },
    method === "gmApprove",
    sessionId,
  );

  return (
    <div
      className="validation-display"
      data-testid="validation-display"
      data-method={method}
    >
      {method === "qr"
        ? (
          <QRDisplay
            playerId={playerId}
            missionId={missionId}
            sessionId={sessionId}
            qrSecret={qrSecret}
            xpValue={mission.xpValue}
            onValidated={onValidated}
          />
        )
        : method === "gmApprove"
        ? (
          <PendingApprovalDisplay
            missionTitle={mission.title}
            onValidated={onValidated}
          />
        )
        : null}
    </div>
  );
};

export default ValidationDisplay;
