// CameraFeed — activates device camera for QR scanning via jsqr.
import { useCallback, useEffect, useRef } from "react";
// jsqr is CJS default-export only. With verbatimModuleSyntax + bundler
// resolution the default import resolves to the module namespace at the
// type level. We extract .default explicitly to get the callable function.
import * as jsqrModule from "jsqr";

type JsQRCode = {
  readonly data: string;
};

type JsQRFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
) => JsQRCode | null;

const jsQR: JsQRFn = (jsqrModule as { default: unknown })
  .default as JsQRFn;

interface CameraFeedProps {
  readonly isActive: boolean;
  readonly onDecode: (data: string) => void;
  readonly onError?: (message: string) => void;
}

const SCAN_COOLDOWN_MS = 3000;

const CameraFeed = (props: CameraFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const cooldownRef = useRef(false);

  // Hold the scan loop function in a ref so we can reference it from within
  // itself without a hoisting issue.
  const scanLoopRef = useRef<() => void>(() => {});

  // ── Scan loop ────────────────────────────────────────────────────────────────

  const runScanLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoopRef.current);
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width === 0 || height === 0) {
      rafRef.current = requestAnimationFrame(scanLoopRef.current);
      return;
    }

    // Lazily create offscreen canvas at video dimensions
    if (
      !canvasRef.current ||
      canvasRef.current.width !== width ||
      canvasRef.current.height !== height
    ) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(scanLoopRef.current);
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);

    if (!cooldownRef.current) {
      const code = jsQR(imageData.data, width, height);
      if (code && code.data) {
        cooldownRef.current = true;
        props.onDecode(code.data);
        // Re-enable scanning after cooldown (for retry on mismatch)
        setTimeout(() => {
          cooldownRef.current = false;
        }, SCAN_COOLDOWN_MS);
      }
    }

    rafRef.current = requestAnimationFrame(scanLoopRef.current);
  }, [props]);

  // Keep the ref in sync via effect, not during render
  useEffect(() => {
    scanLoopRef.current = runScanLoop;
  }, [runScanLoop]);

  // ── Start / stop camera ──────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    // Cancel the scan loop
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Stop all media tracks
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        props.onError?.(
          "Camera access required — please allow camera permissions in your browser settings.",
        );
      } else if (
        name === "NotFoundError" || name === "DevicesNotFoundError"
      ) {
        props.onError?.("No camera found on this device.");
      } else {
        props.onError?.(
          `Unable to access camera: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      }
    }
  }, [props]);

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (props.isActive) {
      cooldownRef.current = false;
      startCamera();
      rafRef.current = requestAnimationFrame(scanLoopRef.current);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [props.isActive, startCamera, stopCamera]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="camera-feed"
      data-testid="camera-feed"
      data-active={props.isActive}
    >
      {props.isActive
        ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-label="QR scanner camera preview"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        )
        : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "hsl(var(--color-muted))",
              color: "hsl(var(--color-muted-fg))",
              fontSize: "var(--text-sm)",
            }}
          >
            Camera inactive
          </div>
        )}
    </div>
  );
};

export default CameraFeed;
