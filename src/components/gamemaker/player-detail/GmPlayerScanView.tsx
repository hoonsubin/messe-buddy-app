import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";
import { useQRScanContext } from "../../../hooks/useQRScanContext.ts";
import type { GmPlayerDetailPageModel } from "../../../hooks/pages/useGmPlayerDetailPage.ts";
import {
  parseValidationToken,
  validationPathFromToken,
} from "../../../utils/qrUrl.ts";
import TopBar from "../../shared/TopBar.tsx";
import QrScanPanel, { type QrScanState } from "../../qr/QrScanPanel.tsx";

interface GmPlayerScanViewProps {
  readonly vm: GmPlayerDetailPageModel;
}

const GmPlayerScanView = ({ vm }: GmPlayerScanViewProps) => {
  const navigate = useNavigate();
  const scanContext = useQRScanContext({
    sessionId: vm.homeSid,
    playerId: vm.playerId,
  });
  const [cameraActive, setCameraActive] = useState(true);
  const [validationState, setValidationState] = useState<QrScanState>("scanning");
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

  return (
    <div
      className="player-detail player-detail--scan"
      data-testid="gm-player-detail-page"
      data-page="gm-player-detail"
    >
      <TopBar
        playerName={vm.identity?.name ?? "Game Master"}
        role="Game Master"
      />

      <main
        className="qr-scanner"
        style={{
          flex: 1,
          padding:
            "calc(var(--topbar-h) + var(--space-6)) var(--space-4) var(--space-8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-6)",
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
          <QrScanPanel
            cameraActive={cameraActive}
            validationState={validationState}
            errorMessage={errorMessage}
            onDecode={handleDecode}
            onCameraError={handleCameraError}
            onStartCamera={() => {
              setValidationState("scanning");
              setErrorMessage("");
              setCameraActive(true);
            }}
            onSimulateScan={handleSimulate}
            showSimulate
            showCameraControls
            cancelLabel="Back"
            onCancel={vm.closeScanner}
          />
        </div>

        <button
          type="button"
          className="btn btn--ghost"
          onClick={vm.closeScanner}
        >
          <MdArrowBack size={16} aria-hidden="true" />
          Back to player
        </button>
      </main>
    </div>
  );
};

export default GmPlayerScanView;
