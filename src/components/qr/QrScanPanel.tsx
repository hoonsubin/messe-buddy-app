import CameraFeed from "./CameraFeed.tsx";
import ValidationResult from "./ValidationResult.tsx";
import Button from "../shared/Button.tsx";
import { BUTTON_VARIANT } from "../shared/types.ts";

export type QrScanState = "idle" | "scanning" | "success" | "invalid" | "error";

export interface QrScanPanelProps {
  readonly cameraActive: boolean;
  readonly validationState: QrScanState;
  readonly errorMessage?: string;
  readonly onDecode: (scanned: string) => void;
  readonly onCameraError: (message: string) => void;
  readonly onStartCamera: () => void;
  readonly onSimulateScan?: () => void;
  readonly showSimulate?: boolean;
  readonly showCameraControls?: boolean;
  readonly cancelLabel?: string;
  readonly onCancel?: () => void;
  readonly className?: string;
}

const QrScanPanel = ({
  cameraActive,
  validationState,
  errorMessage,
  onDecode,
  onCameraError,
  onStartCamera,
  onSimulateScan,
  showSimulate = false,
  showCameraControls = true,
  cancelLabel = "Cancel",
  onCancel,
  className,
}: QrScanPanelProps) => {
  const scanState: QrScanState = cameraActive ? "scanning" : validationState;

  return (
    <div className={className}>
      <div className="qr-scanner-modal__viewport">
        <CameraFeed
          isActive={cameraActive}
          onDecode={onDecode}
          onError={onCameraError}
        />
      </div>

      <ValidationResult
        state={scanState}
        errorMessage={errorMessage}
      />

      <div className="qr-scanner-modal__actions">
        {showCameraControls && (
          <div className="qr-scanner-modal__row">
            {!cameraActive && validationState !== "success" && (
              <Button
                variant={BUTTON_VARIANT.PRIMARY}
                className="qr-scanner-modal__primary"
                onClick={onStartCamera}
              >
                {validationState === "error" ? "Retry camera" : "Start camera"}
              </Button>
            )}
            {onCancel && (
              <Button variant={BUTTON_VARIANT.GHOST} onClick={onCancel}>
                {cancelLabel}
              </Button>
            )}
          </div>
        )}
        {showSimulate && onSimulateScan && (
          <Button
            variant={BUTTON_VARIANT.SECONDARY}
            onClick={onSimulateScan}
            disabled={validationState === "success"}
          >
            Simulate Scan
          </Button>
        )}
      </div>
    </div>
  );
};

export default QrScanPanel;
