import { useEffect } from "react";
import type { Mission } from "../../types/index.ts";
import { useWatchMission } from "../../hooks/useProgress/index.ts";
import QRDisplay from "./QRDisplay.tsx";
import PendingApprovalDisplay from "./PendingApprovalDisplay.tsx";

interface ValidationDisplayProps {
  readonly playerId: string;
  readonly missionId: string;
  readonly sessionId: string;
  readonly mission: Mission;
  readonly onValidated: () => void;
}

const ValidationDisplay = (props: ValidationDisplayProps) => {
  const { playerId, missionId, sessionId, mission, onValidated } = props;
  const method = mission.validationMethod;
  const { watchMission } = useWatchMission(playerId);

  useEffect(() => {
    if (method !== "gmApprove") return;

    const unsubscribe = watchMission(missionId, (event) => {
      if (event.status === "completed" || event.status === "autoApproved") {
        onValidated();
      }
    });

    return unsubscribe;
  }, [method, missionId, onValidated, watchMission]);

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
