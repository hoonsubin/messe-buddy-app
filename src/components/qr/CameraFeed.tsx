// Phase 1 shell — camera preview for QR scanning. Camera access wired in Phase 5.
interface CameraFeedProps {
  readonly isActive: boolean;
  readonly onFrame?: (imageData: ImageData) => void;
}

const CameraFeed = (props: CameraFeedProps) => (
  <div className="camera-feed" data-testid="camera-feed" data-active={props.isActive} data-has-frame-handler={!!props.onFrame}>
    {props.isActive ? (
      <video
        autoPlay
        playsInline
        muted
        aria-label="QR scanner camera preview"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    ) : (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "hsl(var(--color-muted))",
        color: "hsl(var(--color-muted-fg))",
        fontSize: "var(--text-sm)",
      }}>
        Camera inactive
      </div>
    )}
  </div>
);

export default CameraFeed;
