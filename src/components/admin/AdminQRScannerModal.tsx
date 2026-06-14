// Phase 1 shell — modal overlay for GM QR scanning.
// Visually matches QRScannerView but rendered as a modal, not a full-page route.
// Camera + validation logic wired in Phase 5.
import { MdClose } from "react-icons/md";
import CameraFeed from "../qr/CameraFeed.tsx";
import ValidationResult from "../qr/ValidationResult.tsx";

interface AdminQRScannerModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const AdminQRScannerModal = (props: AdminQRScannerModalProps) => {
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
        onClick={props.onClose}
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
            onClick={props.onClose}
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
          <CameraFeed isActive={false} />
        </div>

        {/* Scan status */}
        <ValidationResult state="idle" />

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
          }}
        >
          <button
            type="button"
            className="btn btn--primary"
            style={{ flex: 1 }}
          >
            Start camera
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={props.onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminQRScannerModal;
