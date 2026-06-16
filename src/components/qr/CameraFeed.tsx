// CameraFeed - activates device camera for QR scanning via jsqr.
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
const PREVIEW_TIMEOUT_MS = 8000;

const reportCameraError = (
  onError: ((message: string) => void) | undefined,
  err: unknown,
): void => {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    onError?.(
      "Camera access required - please allow camera permissions in your browser settings.",
    );
  } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    onError?.("No camera found on this device.");
  } else {
    onError?.(
      `Unable to access camera: ${
        err instanceof Error ? err.message : "Unknown error"
      }`,
    );
  }
};

const requestVideoStream = async (): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
    });
  } catch {
    return await navigator.mediaDevices.getUserMedia({ video: true });
  }
};

const waitForVideoMetadata = (video: HTMLVideoElement): Promise<void> => {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onMeta = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Camera preview failed to load"));
    };
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Camera preview timed out"));
    }, PREVIEW_TIMEOUT_MS);

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("error", onError);
      clearTimeout(timeoutId);
    };

    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("error", onError);
  });
};

const CameraFeed = (props: CameraFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const cooldownRef = useRef(false);

  const onDecodeRef = useRef(props.onDecode);
  const onErrorRef = useRef(props.onError);

  useEffect(() => {
    onDecodeRef.current = props.onDecode;
  }, [props.onDecode]);

  useEffect(() => {
    onErrorRef.current = props.onError;
  }, [props.onError]);

  const scanLoopRef = useRef<() => void>(() => {});

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
      if (code?.data) {
        cooldownRef.current = true;
        onDecodeRef.current(code.data);
        setTimeout(() => {
          cooldownRef.current = false;
        }, SCAN_COOLDOWN_MS);
      }
    }

    rafRef.current = requestAnimationFrame(scanLoopRef.current);
  }, []);

  useEffect(() => {
    scanLoopRef.current = runScanLoop;
  }, [runScanLoop]);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!props.isActive) {
      stopCamera();
      return;
    }

    let cancelled = false;
    cooldownRef.current = false;

    const startCamera = async () => {
      try {
        const stream = await requestVideoStream();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          onErrorRef.current?.(
            "Camera preview not ready. Please try again.",
          );
          return;
        }

        streamRef.current = stream;
        video.muted = true;
        video.srcObject = stream;

        await waitForVideoMetadata(video);
        if (cancelled) return;

        await video.play();
        if (cancelled) return;

        rafRef.current = requestAnimationFrame(scanLoopRef.current);
      } catch (err: unknown) {
        if (!cancelled) {
          reportCameraError(onErrorRef.current, err);
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [props.isActive, stopCamera]);

  return (
    <div
      className="camera-feed"
      data-testid="camera-feed"
      data-active={props.isActive}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        aria-hidden={!props.isActive}
        aria-label="QR scanner camera preview"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: props.isActive ? "block" : "none",
        }}
      />
      {!props.isActive && (
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
