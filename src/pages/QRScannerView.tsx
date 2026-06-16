// Phase 1 shell - GM QR scanning view. Camera + validation logic wired in Phase 5.
import TopBar from "../components/shared/TopBar.tsx";
import CameraFeed from "../components/qr/CameraFeed.tsx";
import ValidationResult from "../components/qr/ValidationResult.tsx";
import { useIdentity } from "../hooks/useIdentity.ts";

// Phase 1: static shell, no live camera.
const QRScannerView = () => {
  const { identity } = useIdentity();

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
            isActive={false}
            onDecode={() => undefined}
          />
        </div>

        <ValidationResult state="idle" />

        <button
          type="button"
          className="btn btn--primary"
          style={{ width: "100%", maxWidth: "24rem" }}
        >
          Start camera
        </button>
      </main>
    </div>
  );
};

export default QRScannerView;
