import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdClose } from "react-icons/md";
import { useQRScanContext } from "../../hooks/useQRScanContext.ts";
import CameraFeed from "../qr/CameraFeed.tsx";
import ValidationResult from "../qr/ValidationResult.tsx";
import {
  parseValidationToken,
  validationPathFromToken,
} from "../../utils/qrUrl.ts";
import Button from "../ui/Button.tsx";
import { BUTTON_VARIANT } from "../ui/types.ts";
import IconButton from "../ui/IconButton.tsx";
import { Modal, ModalDescription, ModalTitle } from "../patterns/Modal.tsx";
import { MODAL_VARIANT } from "../patterns/types.ts";

type ScanState = "idle" | "scanning" | "success" | "invalid" | "error";

interface GmQRScannerModalProps {
  readonly isOpen: boolean;
  readonly sessionId: string;
  readonly playerId?: string;
  readonly onClose: () => void;
}

const GmQRScannerModal = (props: GmQRScannerModalProps) => {
  const navigate = useNavigate();
  const scanContext = useQRScanContext({
    sessionId: props.sessionId,
    playerId: props.playerId,
  });
  const [cameraReady, setCameraReady] = useState(false);
  const [validationState, setValidationState] = useState<ScanState>("scanning");
  const [errorMessage, setErrorMessage] = useState("");
  const cameraActive = props.isOpen && cameraReady;

  const handleDecode = useCallback(
    (scanned: string) => {
      const parsed = parseValidationToken(scanned);
      if (!parsed) {
        setValidationState("invalid");
        setErrorMessage(
          "Invalid QR code — expected a MesseBuddy validation URL.",
        );
        return;
      }

      setValidationState("success");
      setErrorMessage("");
      setCameraReady(false);
      props.onClose();
      navigate(
        validationPathFromToken(parsed.sessionId, parsed.token),
      );
    },
    [navigate, props],
  );

  const handleCameraError = useCallback((message: string) => {
    setValidationState("error");
    setErrorMessage(message);
    setCameraReady(false);
  }, []);

  const handleSimulate = useCallback(async () => {
    try {
      const url = await scanContext.buildSimulateScanUrl();
      if (!url) {
        setValidationState("error");
        setErrorMessage("No QR mission available to simulate.");
        return;
      }
      handleDecode(url);
    } catch {
      setValidationState("error");
      setErrorMessage("Simulate scan failed. Please try again.");
    }
  }, [handleDecode, scanContext]);

  const handleCancel = useCallback(() => {
    setCameraReady(false);
    props.onClose();
  }, [props]);

  useEffect(() => {
    if (!props.isOpen) return;

    let cancelled = false;
    const frameId = requestAnimationFrame(() => {
      if (!cancelled) setCameraReady(true);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      setCameraReady(false);
    };
  }, [props.isOpen]);

  return (
    <Modal
      open={props.isOpen}
      onBackdropClick={handleCancel}
      variant={MODAL_VARIANT.STRUCTURED}
      backdropClassName="modal-backdrop--blur"
      aria-label="Scan QR code"
      testId="gm-qr-scanner-modal"
      panelClassName="qr-scanner-modal"
    >
      <div className="qr-scanner-modal__header core-flex-row core-justify-between">
        <ModalTitle className="core-m-0">Scan QR Code</ModalTitle>
        <IconButton onClick={handleCancel} aria-label="Close scanner">
          <MdClose size={24} aria-hidden="true" />
        </IconButton>
      </div>

      <ModalDescription className="core-m-0">
        Point the camera at a player&apos;s mission QR code.
      </ModalDescription>

      <div className="qr-scanner-modal__viewport">
        <CameraFeed
          isActive={cameraActive}
          onDecode={handleDecode}
          onError={handleCameraError}
        />
      </div>

      <ValidationResult
        state={validationState}
        errorMessage={errorMessage || undefined}
      />

      <div className="qr-scanner-modal__actions">
        <div className="qr-scanner-modal__row">
          {!cameraActive && validationState !== "success" && (
            <Button
              variant={BUTTON_VARIANT.PRIMARY}
              className="qr-scanner-modal__primary"
              onClick={() => {
                setValidationState("scanning");
                setErrorMessage("");
                setCameraReady(true);
              }}
            >
              {validationState === "error" ? "Retry camera" : "Start camera"}
            </Button>
          )}
          <Button variant={BUTTON_VARIANT.GHOST} onClick={handleCancel}>
            Cancel
          </Button>
        </div>
        <Button
          variant={BUTTON_VARIANT.SECONDARY}
          onClick={() => void handleSimulate()}
          disabled={validationState === "success"}
        >
          Simulate Scan
        </Button>
      </div>
    </Modal>
  );
};

export default GmQRScannerModal;
