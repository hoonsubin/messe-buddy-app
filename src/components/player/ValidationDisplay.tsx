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
  const method = props.mission.validationMethod;

  // ── gmApprove: subscribe and wait for completed status ──────────────────
  // Mock adapter auto-fires after 4 s via simulateGmApproval.
  useEffect(() => {
    if (method !== "gmApprove") return;

    const unsubscribe = adapter.subscribeProgressEvent(
      props.playerId,
      props.missionId,
      (event: ProgressEvent) => {
        if (event.status === "completed" || event.status === "autoApproved") {
          props.onValidated();
        }
      },
    );

    return unsubscribe;
  }, [adapter, method, props.playerId, props.missionId, props.onValidated]);

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
            sessionId={props.sessionId}
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
        : null}
    </div>
  );
};

export default ValidationDisplay;
