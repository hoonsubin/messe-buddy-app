import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/shared/TopBar.tsx";
import CameraFeed from "../components/qr/CameraFeed.tsx";
import ValidationResult from "../components/qr/ValidationResult.tsx";
import { useIdentity } from "../hooks/useIdentity.ts";
import {
  parseValidationToken,
  validationPathFromToken,
} from "../utils/qrUrl.ts";

type ScanState = "idle" | "scanning" | "success" | "invalid" | "error";

const QRScannerView = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { identity } = useIdentity();
  const sid = sessionId ?? "";

  const [cameraActive, setCameraActive] = useState(false);
  const [validationState, setValidationState] = useState<ScanState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleDecode = useCallback(
    (scanned: string) => {
      const parsed = parseValidationToken(scanned);
      if (!parsed) {
        setValidationState("invalid");
        setErrorMessage(
          "Invalid QR code — expected a MesseBuddy validation URL.",
        );
        setCameraActive(false);
        return;
      }

      setValidationState("success");
      setErrorMessage("");
      setCameraActive(false);
      navigate(validationPathFromToken(parsed.sessionId, parsed.token));
    },
    [navigate],
  );

  const handleCameraError = useCallback((message: string) => {
    setValidationState("error");
    setErrorMessage(message);
    setCameraActive(false);
  }, []);

  const scanState: ScanState = cameraActive
    ? "scanning"
    : validationState;

  return (
    <div
      data-testid="qr-scanner-view"
      data-page="qr-scanner"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
      }}
    >
      <TopBar
        playerName={identity?.uid ?? "Game Master"}
        totalXP={0}
        role="Game Master"
      />

      <main
        className="qr-scanner"
        style={{
          flex: 1,
          paddingTop: "var(--topbar-h)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-6)",
          padding:
            "calc(var(--topbar-h) + var(--space-6)) var(--space-4) var(--space-8)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "var(--text-xl)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          Scan QR Code
        </h1>

        <div style={{ width: "100%", maxWidth: "24rem" }}>
          <CameraFeed
            isActive={cameraActive}
            onDecode={handleDecode}
            onError={handleCameraError}
          />
        </div>

        <ValidationResult
          state={scanState}
          errorMessage={errorMessage || undefined}
        />

        <button
          type="button"
          className="btn btn--primary"
          style={{ width: "100%", maxWidth: "24rem" }}
          onClick={() => {
            if (cameraActive) {
              setCameraActive(false);
              setValidationState("idle");
            } else {
              setValidationState("scanning");
              setErrorMessage("");
              setCameraActive(true);
            }
          }}
        >
          {cameraActive ? "Stop camera" : "Start camera"}
        </button>

        {sid && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate(`/admin/${sid}`)}
          >
            Back to cockpit
          </button>
        )}
      </main>
    </div>
  );
};

export default QRScannerView;
