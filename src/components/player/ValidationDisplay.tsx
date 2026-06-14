import { useEffect } from "react";
import type { Mission, ProgressEvent } from "../../types/index.ts";
import { useAdapter } from "../../adapters/useAdapter.ts";
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
  const adapter = useAdapter();
  const { playerId, missionId, sessionId, mission, onValidated } = props;
  const method = mission.validationMethod;

  // ── gmApprove: subscribe and wait for completed status ──────────────────
  // Mock adapter auto-fires after 4 s via simulateGmApproval.
  useEffect(() => {
    if (method !== "gmApprove") return;

    const unsubscribe = adapter.subscribeProgressEvent(
      playerId,
      missionId,
      (event: ProgressEvent) => {
        if (event.status === "completed" || event.status === "autoApproved") {
          onValidated();
        }
      },
    );

    return unsubscribe;
  }, [adapter, method, playerId, missionId, onValidated]);

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
