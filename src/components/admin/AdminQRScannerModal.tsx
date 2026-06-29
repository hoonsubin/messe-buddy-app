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

type ScanState = "idle" | "scanning" | "success" | "invalid" | "error";

interface AdminQRScannerModalProps {
  readonly isOpen: boolean;
  readonly sessionId: string;
  readonly onClose: () => void;
}

const AdminQRScannerModal = (props: AdminQRScannerModalProps) => {
  const navigate = useNavigate();
  const scanContext = useQRScanContext(props.sessionId);
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

    setValidationState("scanning");
    setErrorMessage("");

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

  if (!props.isOpen) return null;

  return (
    <div
      data-testid="admin-qr-scanner-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Scan QR code"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200, /* modal tier (design-tokens.md §6) */
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "hsl(var(--color-fg) / 0.6)",
          backdropFilter: "blur(4px)",
        }}
        onClick={handleCancel}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "28rem",
          maxHeight: "90dvh",
          overflowY: "auto",
          background: "hsl(var(--color-card))",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          padding: "var(--space-5)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "var(--text-lg)",
              fontWeight: "var(--weight-semibold)",
              color: "hsl(var(--color-fg))",
            }}
          >
            Scan QR Code
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close scanner"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "hsl(var(--color-muted-fg))",
              fontSize: "var(--text-xl)",
              padding: "var(--space-1)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "var(--min-touch)",
              minHeight: "var(--min-touch)",
            }}
          >
            <MdClose size={24} aria-hidden="true" />
          </button>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: "var(--text-sm)",
            color: "hsl(var(--color-muted-fg))",
          }}
        >
          Point the camera at a player&apos;s mission QR code.
        </p>

        <div
          style={{
            width: "100%",
            aspectRatio: "4 / 3",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "hsl(0 0% 0%)",
          }}
        >
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            {!cameraActive && validationState !== "success" && (
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setValidationState("scanning");
                  setErrorMessage("");
                  setCameraReady(true);
                }}
              >
                {validationState === "error" ? "Retry camera" : "Start camera"}
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => void handleSimulate()}
            disabled={validationState === "success"}
          >
            Simulate Scan
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminQRScannerModal;
