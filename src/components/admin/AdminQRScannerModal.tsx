// AdminQRScannerModal — modal overlay for GM QR scanning with camera,
// jsqr decode, payload validation against context, and Simulate Scan.
import { useCallback, useRef, useState } from "react";
import { MdClose } from "react-icons/md";
import CameraFeed from "../qr/CameraFeed.tsx";
import ValidationResult from "../qr/ValidationResult.tsx";
import {
  decodeQRPayload,
  encodeQRPayload,
  QRPayloadError,
} from "../../utils/qrPayload.ts";

type ScanState = "idle" | "scanning" | "success" | "invalid" | "error";

interface QRScannerContext {
  readonly playerId: string;
  readonly missionId: string;
  readonly playerName: string;
  readonly missionTitle: string;
}

interface AdminQRScannerModalProps {
  readonly isOpen: boolean;
  readonly context: QRScannerContext | null;
  readonly sessionId: string;
  readonly onClose: () => void;
  readonly onValidate: (playerId: string, missionId: string) => Promise<void>;
}

// Key fragment so the modal remounts when opened with new context,
// avoiding cascading setState-in-effect warnings.
const contextKey = (ctx: QRScannerContext | null): string =>
  ctx ? `${ctx.playerId}::${ctx.missionId}` : "closed";

const AdminQRScannerModal = (props: AdminQRScannerModalProps) => {
  const [cameraActive, setCameraActive] = useState(true);
  const [validationState, setValidationState] = useState<ScanState>(
    "scanning",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── QR decode + validate ─────────────────────────────────────────────────────

  const handleDecode = useCallback(
    async (encoded: string) => {
      if (!props.context || !props.sessionId) return;

      let decoded;
      try {
        decoded = await decodeQRPayload(encoded, props.sessionId);
      } catch (err: unknown) {
        const message = err instanceof QRPayloadError
          ? `Invalid QR: ${err.message}`
          : "Failed to decode QR code — please try again.";
        setValidationState("invalid");
        setErrorMessage(message);
        return;
      }

      // Validate payload matches the approval context
      if (
        decoded.playerId !== props.context.playerId ||
        decoded.missionId !== props.context.missionId
      ) {
        setValidationState("invalid");
        setErrorMessage(
          "QR code doesn't match this request — please verify the correct mission QR is being scanned.",
        );
        return;
      }

      // Success — write progress event
      try {
        await props.onValidate(decoded.playerId, decoded.missionId);
        setValidationState("success");
        setErrorMessage("");
        setCameraActive(false);

        // Auto-close after 2 seconds
        closeTimerRef.current = setTimeout(() => {
          props.onClose();
        }, 2000);
      } catch {
        setValidationState("error");
        setErrorMessage("Failed to save validation result — please try again.");
      }
    },
    [props],
  );

  // ── Camera error handler ─────────────────────────────────────────────────────

  const handleCameraError = useCallback((message: string) => {
    setValidationState("error");
    setErrorMessage(message);
    setCameraActive(false);
  }, []);

  // ── Simulate Scan — build mock payload and feed through decode flow ──────────

  const handleSimulate = useCallback(async () => {
    if (!props.context || !props.sessionId) return;

    const mockPayload = await encodeQRPayload(
      {
        playerId: props.context.playerId,
        missionId: props.context.missionId,
        sessionId: props.sessionId,
        xpValue: 100,
        issuedAt: Date.now(),
      },
      props.sessionId,
    );

    // Feed through the same decode + validate pipeline
    await handleDecode(mockPayload);
  }, [props, handleDecode]);

  // ── Cancel ───────────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setCameraActive(false);
    props.onClose();
  }, [props]);

  // ── Render ───────────────────────────────────────────────────────────────────

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
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "hsl(0 0% 0% / 0.7)",
          backdropFilter: "blur(4px)",
        }}
        onClick={handleCancel}
      />

      {/* Modal content */}
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
        {/* Header */}
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

        {/* Context info */}
        {props.context && (
          <div
            style={{
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "hsl(var(--color-bg))",
              fontSize: "var(--text-sm)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: "var(--weight-medium)",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              Scanning for:
            </p>
            <p
              style={{
                margin: "var(--space-1) 0 0",
                fontWeight: "var(--weight-semibold)",
              }}
            >
              {props.context.playerName}
            </p>
            <p
              style={{
                margin: "var(--space-1) 0 0",
                color: "hsl(var(--color-muted-fg))",
              }}
            >
              {props.context.missionTitle}
            </p>
          </div>
        )}

        {/* Camera feed placeholder */}
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

        {/* Scan status */}
        <ValidationResult
          state={validationState}
          missionTitle={validationState === "success"
            ? props.context?.missionTitle
            : undefined}
          errorMessage={errorMessage || undefined}
        />

        {/* Actions */}
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
                  setCameraActive(true);
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
            onClick={handleSimulate}
            disabled={validationState === "success"}
          >
            Simulate Scan
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminQRScannerModalWithKey = (props: AdminQRScannerModalProps) => {
  // Re-mount the modal when context changes so state is always fresh
  return (
    <AdminQRScannerModal
      key={props.isOpen ? contextKey(props.context) : "closed"}
      {...props}
    />
  );
};

export default AdminQRScannerModalWithKey;
