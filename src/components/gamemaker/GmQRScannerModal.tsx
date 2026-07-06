import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdClose } from "react-icons/md";
import { useQRScanContext } from "../../hooks/useQRScanContext.ts";
import {
  parseValidationToken,
  validationPathFromToken,
} from "../../utils/qrUrl.ts";
import IconButton from "../shared/IconButton.tsx";
import { Modal, ModalDescription, ModalTitle } from "../shared/Modal.tsx";
import { MODAL_VARIANT } from "../shared/types.ts";
import QrScanPanel, { type QrScanState } from "../qr/QrScanPanel.tsx";

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
  const [validationState, setValidationState] = useState<QrScanState>("scanning");
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

  const handleSimulate = useCallback(() => {
    void scanContext.buildSimulateScanUrl()
      .then((url) => {
        if (!url) {
          setValidationState("error");
          setErrorMessage("No QR mission available to simulate.");
          return;
        }
        handleDecode(url);
      })
      .catch(() => {
        setValidationState("error");
        setErrorMessage("Simulate scan failed. Please try again.");
      });
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

      <QrScanPanel
        cameraActive={cameraActive}
        validationState={validationState}
        errorMessage={errorMessage}
        onDecode={handleDecode}
        onCameraError={handleCameraError}
        onStartCamera={() => {
          setValidationState("scanning");
          setErrorMessage("");
          setCameraReady(true);
        }}
        onSimulateScan={handleSimulate}
        showSimulate
        showCameraControls
        onCancel={handleCancel}
      />
    </Modal>
  );
};

export default GmQRScannerModal;
